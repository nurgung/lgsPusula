-- Phase 13: the student can turn model sentences off.
-- The daily counter is not writable by the student. A missing row means off.

create table public.ai_preferences (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default false,
  used_on date,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint ai_preferences_count_nonnegative check (request_count >= 0),
  constraint ai_preferences_count_cap check (request_count <= 100)
);

comment on table public.ai_preferences is
  'Per student: whether a model sentence may be shown, and how many requests were used on used_on (Europe/Istanbul date, stored as a date).';

revoke all on table public.ai_preferences from public, anon, authenticated;
grant select on table public.ai_preferences to authenticated;
grant select, insert, update on table public.ai_preferences to service_role;

alter table public.ai_preferences enable row level security;

create policy ai_preferences_select_own
  on public.ai_preferences
  for select
  to authenticated
  using (student_id = (select auth.uid()));

create function public.set_ai_enabled(next_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and roles = array['student']::public.app_role[]
  ) then
    raise exception 'not_student' using errcode = '42501';
  end if;

  insert into public.ai_preferences (student_id, enabled)
  values (auth.uid(), next_enabled)
  on conflict (student_id) do update
    set enabled = excluded.enabled,
        updated_at = pg_catalog.now();
end;
$$;

revoke all on function public.set_ai_enabled(boolean) from public, anon;
grant execute on function public.set_ai_enabled(boolean) to authenticated;

create function public.consume_ai_request(p_student uuid, p_day date, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  current_day date;
begin
  if p_limit < 1 or p_limit > 100 then
    return false;
  end if;

  insert into public.ai_preferences (student_id, enabled, used_on, request_count)
  values (p_student, false, p_day, 0)
  on conflict (student_id) do nothing;

  select request_count, used_on
    into current_count, current_day
  from public.ai_preferences
  where student_id = p_student
  for update;

  if current_day is distinct from p_day then
    update public.ai_preferences
      set used_on = p_day,
          request_count = 1,
          updated_at = pg_catalog.now()
      where student_id = p_student;
    return true;
  end if;

  if current_count >= p_limit then
    return false;
  end if;

  update public.ai_preferences
    set request_count = request_count + 1,
        updated_at = pg_catalog.now()
    where student_id = p_student;
  return true;
end;
$$;

revoke all on function public.consume_ai_request(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid, date, integer) to service_role;
