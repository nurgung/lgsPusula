-- growth-v1 notices. No new table and no second point ledger.
-- The visible stage, streak, and health are derived in the app from study_logs
-- and reward_events. This function only stores that an in-app notice was opened,
-- so a refresh does not insert another row. The sentence stays in code.
-- Authenticated still cannot insert into in_app_notices. The student id is auth.uid().

alter table public.in_app_notices
  drop constraint in_app_notices_kind;

alter table public.in_app_notices
  add constraint in_app_notices_kind check (
    kind in (
      'study_reminder',
      'streak_broken',
      'mascot_sick',
      'mascot_recovering',
      'stage_earned'
    )
  );

comment on table public.in_app_notices is
  'An in-app notice. The sentence is chosen in code. study_reminder is the daily nudge. The growth kinds record a streak break, rest, recovery, or a real stage step. They are not phone notifications.';

create function public.open_growth_notice(p_kind text, p_notice_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := auth.uid();
  istanbul_today date := (pg_catalog.timezone('Europe/Istanbul', pg_catalog.now()))::date;
  v_id uuid;
begin
  if v_student is null
    or not exists (
      select 1
      from public.profiles
      where profiles.id = v_student
        and profiles.roles = array['student']::public.app_role[]
    ) then
    raise exception 'not a student'
      using errcode = '42501';
  end if;

  if p_kind not in ('streak_broken', 'mascot_sick', 'mascot_recovering', 'stage_earned') then
    raise exception 'invalid notice'
      using errcode = '22023';
  end if;

  if p_notice_date is null
    or p_notice_date > istanbul_today
    or p_notice_date < date '2024-09-01' then
    raise exception 'invalid notice date'
      using errcode = '22023';
  end if;

  insert into public.in_app_notices (student_id, kind, notice_date, sequence)
  values (v_student, p_kind, p_notice_date, 1)
  on conflict (student_id, kind, notice_date, sequence) do nothing;

  select id into v_id
  from public.in_app_notices
  where student_id = v_student
    and kind = p_kind
    and notice_date = p_notice_date
    and sequence = 1
    and dismissed_at is null;

  return v_id;
end;
$$;

revoke all on function public.open_growth_notice(text, date) from public, anon;
grant execute on function public.open_growth_notice(text, date) to authenticated;
