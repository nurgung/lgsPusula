-- Phase 3: profiles, security audit log and auth rate limiting.
-- Access model: AUTHORIZATION.md. RLS is a second line of defence; the app re-checks on the server.
-- `auto_expose_new_tables = false`: nothing here is reachable through the Data API without the
-- explicit grants below.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create type public.app_role as enum ('student', 'parent', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,32}$'),
  display_name text not null
    constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 50),
  roles public.app_role[] not null
    constraint profiles_roles_not_empty check (cardinality(roles) between 1 and 3)
    -- A student account never carries parent/admin rights (decision 0.13).
    constraint profiles_student_role_exclusive check (
      not ('student' = any (roles)) or cardinality(roles) = 1
    )
    -- Admin is only granted on top of the parent account (decision 0.13).
    constraint profiles_admin_requires_parent check (
      not ('admin' = any (roles)) or 'parent' = any (roles)
    ),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per account. Roles and must_change_password are written only by the server (service_role) or the setup script.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

create policy "profiles: users read their own row"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- No insert/update/delete policies for `authenticated`: users cannot create profiles or change
-- their own roles. Profile editing (display name) gets a column-level grant when it is built.

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------

create table public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  event_type text not null
    constraint audit_events_event_type_format check (event_type ~ '^[a-z_]+(\.[a-z_]+)*$' and char_length(event_type) <= 64),
  actor_id uuid references auth.users (id) on delete set null,
  outcome text not null
    constraint audit_events_outcome_values check (outcome in ('success', 'failure', 'blocked')),
  -- Never passwords, tokens, invite codes or raw usernames/IPs (SECURITY.md).
  metadata jsonb not null default '{}'::jsonb
    constraint audit_events_metadata_object check (jsonb_typeof(metadata) = 'object')
    constraint audit_events_metadata_size check (pg_column_size(metadata) <= 2048)
);

comment on table public.audit_events is
  'Security events without secrets or unnecessary personal data. Retention: 1 year (decision 0.5).';

create index audit_events_occurred_at_idx on public.audit_events (occurred_at);
create index audit_events_actor_id_idx on public.audit_events (actor_id);

alter table public.audit_events enable row level security;

-- Only the server writes and reads audit events; no policies for end users.
revoke all on table public.audit_events from anon, authenticated;
grant select, insert on table public.audit_events to service_role;

-- ---------------------------------------------------------------------------
-- auth_rate_limits (fixed-window counters)
-- ---------------------------------------------------------------------------

create table public.auth_rate_limits (
  -- HMAC of the subject (username or IP) computed by the server; never the raw value.
  bucket_key text primary key
    constraint auth_rate_limits_key_length check (char_length(bucket_key) between 8 and 200),
  window_started_at timestamptz not null,
  attempt_count integer not null constraint auth_rate_limits_count_positive check (attempt_count > 0)
);

create index auth_rate_limits_window_idx on public.auth_rate_limits (window_started_at);

alter table public.auth_rate_limits enable row level security;

revoke all on table public.auth_rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.auth_rate_limits to service_role;

-- Counts one attempt atomically and reports whether it is within the limit.
create function public.consume_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window interval;
  v_count integer;
  v_started timestamptz;
begin
  if p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit parameters';
  end if;

  v_window := make_interval(secs => p_window_seconds);

  insert into public.auth_rate_limits as r (bucket_key, window_started_at, attempt_count)
  values (p_bucket_key, now(), 1)
  on conflict (bucket_key) do update
    set window_started_at = case
          when r.window_started_at <= now() - v_window then now()
          else r.window_started_at
        end,
        attempt_count = case
          when r.window_started_at <= now() - v_window then 1
          else r.attempt_count + 1
        end
  returning r.attempt_count, r.window_started_at into v_count, v_started;

  allowed := v_count <= p_max_attempts;
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (v_started + v_window - now())))::integer)
  end;
  return next;
end;
$$;

create function public.reset_rate_limit(p_bucket_key text)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.auth_rate_limits where bucket_key = p_bucket_key;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.reset_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.reset_rate_limit(text) to service_role;
