-- Phase 4: parent-student links and invite codes.
-- Access model: AUTHORIZATION.md and decision 0.4. RLS is a second line of defence.
-- Writes go through service_role functions; authenticated users can only read their own links.

create type public.family_link_status as enum (
  'pending', 'active', 'declined', 'expired', 'revoked'
);

-- ---------------------------------------------------------------------------
-- family_invites: the code itself. Only a hash is stored (decision 0.4).
-- ---------------------------------------------------------------------------

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- HMAC-SHA256 hex of the code, keyed with the server secret. Never the code.
  code_hash text not null unique
    constraint family_invites_code_hash_format check (code_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  superseded_at timestamptz,
  constraint family_invites_expiry_after_create check (expires_at > created_at),
  constraint family_invites_consume_xor_supersede check (
    consumed_at is null or superseded_at is null
  )
);

comment on table public.family_invites is
  'Single-use invite codes. Unused rows are deleted after 7 days (decision 0.5). The plaintext code is never stored.';

-- At most one code a parent could still redeem, per student.
create unique index family_invites_one_open_per_student
  on public.family_invites (student_id)
  where consumed_at is null and superseded_at is null;

alter table public.family_invites enable row level security;

revoke all on table public.family_invites from public, anon, authenticated;
grant select, insert, update, delete on table public.family_invites to service_role;

-- ---------------------------------------------------------------------------
-- family_links
-- ---------------------------------------------------------------------------

create table public.family_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid not null references public.profiles (id) on delete cascade,
  status public.family_link_status not null,
  invite_id uuid references public.family_invites (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Pending requests expire 24 hours after the parent submits the code.
  expires_at timestamptz,
  responded_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  constraint family_links_not_self check (student_id <> parent_id),
  constraint family_links_pending_has_expiry check (
    status <> 'pending' or expires_at is not null
  )
);

comment on table public.family_links is
  'Parent-student relationship. At most one active link per student (decision 0.4). Finished rows are kept for 1 year (decision 0.5); deletion is a later cleanup.';

create index family_links_parent_id_idx on public.family_links (parent_id);
create index family_links_student_id_idx on public.family_links (student_id);

create unique index family_links_one_active_per_student
  on public.family_links (student_id)
  where status = 'active';

create unique index family_links_one_pending_per_student
  on public.family_links (student_id)
  where status = 'pending';

alter table public.family_links enable row level security;

revoke all on table public.family_links from public, anon, authenticated;
grant select on table public.family_links to authenticated;
grant select, insert, update, delete on table public.family_links to service_role;

-- Read is split from write: there is no insert/update/delete policy, so a user cannot
-- approve their own request or attach themselves to someone else.
create policy "family_links: student reads own rows"
  on public.family_links
  for select
  to authenticated
  using ((select auth.uid()) = student_id);

create policy "family_links: parent reads own rows"
  on public.family_links
  for select
  to authenticated
  using ((select auth.uid()) = parent_id);

-- ---------------------------------------------------------------------------
-- Names of the other party, without opening the profiles table.
-- profiles RLS only returns the caller's own row; this function adds the
-- counterparty's display name and nothing else (not username, roles, or flags).
-- ---------------------------------------------------------------------------

create function public.visible_family_links()
returns table (
  id uuid,
  student_id uuid,
  parent_id uuid,
  status public.family_link_status,
  created_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz,
  revoked_at timestamptz,
  student_display_name text,
  parent_display_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    fl.id,
    fl.student_id,
    fl.parent_id,
    fl.status,
    fl.created_at,
    fl.expires_at,
    fl.responded_at,
    fl.revoked_at,
    student.display_name,
    parent_profile.display_name
  from public.family_links fl
  join public.profiles student on student.id = fl.student_id
  join public.profiles parent_profile on parent_profile.id = fl.parent_id
  where fl.student_id = (select auth.uid())
     or fl.parent_id = (select auth.uid());
$$;

revoke all on function public.visible_family_links() from public, anon;
grant execute on function public.visible_family_links() to authenticated;

-- ---------------------------------------------------------------------------
-- Mutations. service_role only. The application passes the session user id
-- and these functions check that id against the row.
-- ---------------------------------------------------------------------------

create function public.expire_stale_family_links()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.family_links
    set status = 'expired',
        responded_at = coalesce(responded_at, now())
    where status = 'pending'
      and expires_at <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function public.create_family_invite(
  p_student_id uuid,
  p_code_hash text,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_expires_at <= now() or p_code_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid invite';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_student_id
      and 'student' = any (roles)
      and cardinality(roles) = 1
  ) then
    raise exception 'not a student';
  end if;

  -- Decision 0.5: delete unused codes after 7 days.
  delete from public.family_invites
    where consumed_at is null
      and created_at < now() - interval '7 days';

  -- A new code invalidates the previous unused one (decision 0.4).
  update public.family_invites
    set superseded_at = now()
    where student_id = p_student_id
      and consumed_at is null
      and superseded_at is null;

  insert into public.family_invites (student_id, code_hash, expires_at)
  values (p_student_id, p_code_hash, p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

create function public.redeem_family_invite(
  p_parent_id uuid,
  p_code_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.family_invites%rowtype;
begin
  if p_code_hash !~ '^[a-f0-9]{64}$' then
    return 'invalid';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_parent_id
      and 'parent' = any (roles)
      and not ('student' = any (roles))
  ) then
    return 'not_parent';
  end if;

  select *
    into v_invite
    from public.family_invites
    where code_hash = p_code_hash
    for update;

  if not found
    or v_invite.consumed_at is not null
    or v_invite.superseded_at is not null
  then
    return 'invalid';
  end if;

  if v_invite.expires_at <= now() then
    return 'expired';
  end if;

  if v_invite.student_id = p_parent_id then
    return 'self';
  end if;

  update public.family_links
    set status = 'expired',
        responded_at = coalesce(responded_at, now())
    where student_id = v_invite.student_id
      and status = 'pending'
      and expires_at <= now();

  if exists (
    select 1
    from public.family_links
    where student_id = v_invite.student_id
      and status = 'active'
  ) then
    return 'already_active';
  end if;

  if exists (
    select 1
    from public.family_links
    where student_id = v_invite.student_id
      and status = 'pending'
  ) then
    return 'pending_exists';
  end if;

  update public.family_invites
    set consumed_at = now()
    where id = v_invite.id
      and consumed_at is null
      and superseded_at is null;
  if not found then
    return 'invalid';
  end if;

  insert into public.family_links (
    student_id, parent_id, status, invite_id, expires_at
  )
  values (
    v_invite.student_id,
    p_parent_id,
    'pending',
    v_invite.id,
    now() + interval '24 hours'
  );

  return 'ok';
end;
$$;

create function public.respond_family_link(
  p_actor_id uuid,
  p_link_id uuid,
  p_decision text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.family_links%rowtype;
begin
  if p_decision not in ('approve', 'decline') then
    return 'not_pending';
  end if;

  select *
    into v_link
    from public.family_links
    where id = p_link_id
    for update;

  -- Same answer when the row is missing or belongs to someone else.
  if not found or v_link.student_id <> p_actor_id then
    return 'not_found';
  end if;

  if p_decision = 'approve' and v_link.status = 'active' then
    return 'ok';
  end if;
  if p_decision = 'decline' and v_link.status = 'declined' then
    return 'ok';
  end if;

  if v_link.status <> 'pending' then
    return 'not_pending';
  end if;

  if v_link.expires_at is null or v_link.expires_at <= now() then
    update public.family_links
      set status = 'expired',
          responded_at = now()
      where id = v_link.id;
    return 'expired';
  end if;

  if p_decision = 'decline' then
    update public.family_links
      set status = 'declined',
          responded_at = now()
      where id = v_link.id;
    return 'ok';
  end if;

  if exists (
    select 1
    from public.family_links
    where student_id = v_link.student_id
      and status = 'active'
      and id <> v_link.id
  ) then
    return 'already_active';
  end if;

  update public.family_links
    set status = 'active',
        responded_at = now(),
        expires_at = null
    where id = v_link.id;
  return 'ok';
end;
$$;

create function public.revoke_family_link(
  p_actor_id uuid,
  p_link_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.family_links%rowtype;
begin
  select *
    into v_link
    from public.family_links
    where id = p_link_id
    for update;

  if not found
    or (v_link.student_id <> p_actor_id and v_link.parent_id <> p_actor_id)
  then
    return 'not_found';
  end if;

  if v_link.status = 'revoked' then
    return 'ok';
  end if;

  if v_link.status <> 'active' then
    return 'not_active';
  end if;

  update public.family_links
    set status = 'revoked',
        revoked_at = now(),
        revoked_by = p_actor_id
    where id = v_link.id;
  return 'ok';
end;
$$;

revoke all on function public.expire_stale_family_links() from public, anon, authenticated;
revoke all on function public.create_family_invite(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.redeem_family_invite(uuid, text) from public, anon, authenticated;
revoke all on function public.respond_family_link(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_family_link(uuid, uuid) from public, anon, authenticated;

grant execute on function public.expire_stale_family_links() to service_role;
grant execute on function public.create_family_invite(uuid, text, timestamptz) to service_role;
grant execute on function public.redeem_family_invite(uuid, text) to service_role;
grant execute on function public.respond_family_link(uuid, uuid, text) to service_role;
grant execute on function public.revoke_family_link(uuid, uuid) to service_role;
