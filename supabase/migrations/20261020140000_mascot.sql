-- Phase 10: mascot, rewards and in-app reminders.
-- Points are inserted only by sync_mascot_rewards_for. The same idempotency key
-- cannot insert a second row. Rows are never updated, and deleting a study log
-- or skipping a day does not delete them, so a character cannot move backwards.
-- Reminders are in-app only (decision 0.8): no body column, no e-mail, no exam data.
-- Quiet hours are Europe/Istanbul wall-clock times. Equal start and end means off.

-- ---------------------------------------------------------------------------
-- mascot_profiles. One species per student. The stage is not stored; it is the
-- sum of reward_events, so a student cannot write their own stage.
-- ---------------------------------------------------------------------------

create table public.mascot_profiles (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  species text not null
    constraint mascot_profiles_species check (
      species in ('cat', 'turtle', 'sparrow', 'daisy', 'sapling')
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.mascot_profiles is
  'The animal or plant a student chose. Points and stage live in reward_events, not here.';

-- ---------------------------------------------------------------------------
-- reward_events. Immutable. Points are fixed by mascot-v1 inside the sync function
-- (study_log 5, daily_goal 10, exam_saved 5, outcome_review 8).
-- ---------------------------------------------------------------------------

create table public.reward_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null
    constraint reward_events_type check (
      event_type in ('study_log', 'daily_goal', 'exam_saved', 'outcome_review')
    ),
  points integer not null
    constraint reward_events_points check (points between 1 and 20),
  idempotency_key text not null
    constraint reward_events_key_length check (char_length(idempotency_key) between 8 and 80),
  source_date date,
  rule_version text not null
    constraint reward_events_rule check (rule_version = 'mascot-v1'),
  created_at timestamptz not null default now(),
  constraint reward_events_once unique (student_id, idempotency_key),
  constraint reward_events_key_matches check (
    (event_type = 'study_log' and idempotency_key like 'study_log:%')
    or (event_type = 'daily_goal' and idempotency_key like 'daily_goal:%')
    or (event_type = 'exam_saved' and idempotency_key like 'exam:%')
    or (event_type = 'outcome_review' and idempotency_key like 'outcome_review:%')
  )
);

comment on table public.reward_events is
  'One mascot-v1 award per idempotency key. Points are never updated or reduced.';

create index reward_events_student_id_idx on public.reward_events (student_id);

create function public.reward_events_no_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'reward events cannot be changed'
    using errcode = '42501';
end;
$$;

revoke all on function public.reward_events_no_update() from public, anon, authenticated;

create trigger reward_events_no_update
  before update on public.reward_events
  for each row execute function public.reward_events_no_update();

-- ---------------------------------------------------------------------------
-- notification preferences and in-app notices. Notices have no text column.
-- ---------------------------------------------------------------------------

create table public.notification_preferences (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  enabled boolean not null default true,
  quiet_start time not null default time '21:00',
  quiet_end time not null default time '08:00',
  max_per_day smallint not null default 1
    constraint notification_preferences_cap check (max_per_day between 1 and 3),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is
  'In-app reminder settings. quiet_start and quiet_end are Europe/Istanbul wall times. Equal times mean quiet hours are off.';

create table public.in_app_notices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    constraint in_app_notices_kind check (kind = 'study_reminder'),
  notice_date date not null,
  sequence smallint not null
    constraint in_app_notices_sequence check (sequence between 1 and 3),
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint in_app_notices_once unique (student_id, kind, notice_date, sequence)
);

comment on table public.in_app_notices is
  'A study reminder shown inside the app. The sentence is chosen in code, never stored, and never includes an exam result.';

create index in_app_notices_student_day_idx
  on public.in_app_notices (student_id, notice_date);

create trigger mascot_profiles_touch_updated_at
  before update on public.mascot_profiles
  for each row execute function public.touch_updated_at();

create trigger notification_preferences_touch_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Award missing points for one student. Granted to no logged-in role; the
-- trigger and sync_mascot_rewards() call it. Daily-goal points are only for
-- today's all-subjects goal, and only once.
-- ---------------------------------------------------------------------------

create function public.sync_mascot_rewards_for(p_student uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  istanbul_today date := (pg_catalog.timezone('Europe/Istanbul', pg_catalog.now()))::date;
  goal_target integer;
  questions_today integer;
  inserted integer := 0;
  n integer;
begin
  insert into public.reward_events (
    student_id, event_type, points, idempotency_key, source_date, rule_version
  )
  select
    p_student,
    'study_log',
    5,
    'study_log:' || study_logs.id::text,
    study_logs.studied_on,
    'mascot-v1'
  from public.study_logs
  where study_logs.student_id = p_student
  on conflict (student_id, idempotency_key) do nothing;
  get diagnostics n = row_count;
  inserted := inserted + n;

  insert into public.reward_events (
    student_id, event_type, points, idempotency_key, source_date, rule_version
  )
  select
    p_student,
    'exam_saved',
    5,
    'exam:' || exams.id::text,
    exams.taken_on,
    'mascot-v1'
  from public.exams
  where exams.student_id = p_student
  on conflict (student_id, idempotency_key) do nothing;
  get diagnostics n = row_count;
  inserted := inserted + n;

  insert into public.reward_events (
    student_id, event_type, points, idempotency_key, source_date, rule_version
  )
  select
    p_student,
    'outcome_review',
    8,
    'outcome_review:' || exams.id::text,
    exams.taken_on,
    'mascot-v1'
  from public.exams
  where exams.student_id = p_student
    and exists (
      select 1
      from public.exam_subject_results esr
      join public.exam_mistakes em on em.exam_subject_result_id = esr.id
      where esr.exam_id = exams.id
    )
  on conflict (student_id, idempotency_key) do nothing;
  get diagnostics n = row_count;
  inserted := inserted + n;

  select target_questions into goal_target
  from public.study_goals
  where student_id = p_student
    and period = 'day'
    and subject_id is null;

  if goal_target is not null then
    select coalesce(sum(question_count), 0) into questions_today
    from public.study_logs
    where student_id = p_student
      and studied_on = istanbul_today;

    if questions_today >= goal_target then
      insert into public.reward_events (
        student_id, event_type, points, idempotency_key, source_date, rule_version
      )
      values (
        p_student,
        'daily_goal',
        10,
        'daily_goal:' || istanbul_today::text,
        istanbul_today,
        'mascot-v1'
      )
      on conflict (student_id, idempotency_key) do nothing;
      get diagnostics n = row_count;
      inserted := inserted + n;
    end if;
  end if;

  return inserted;
end;
$$;

revoke all on function public.sync_mascot_rewards_for(uuid) from public, anon, authenticated;

create function public.sync_mascot_rewards()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := auth.uid();
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
  return public.sync_mascot_rewards_for(v_student);
end;
$$;

revoke all on function public.sync_mascot_rewards() from public, anon;
grant execute on function public.sync_mascot_rewards() to authenticated;

create function public.mascot_sync_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
begin
  if tg_table_name = 'exam_mistakes' then
    select exams.student_id into v_student
    from public.exam_subject_results esr
    join public.exams on exams.id = esr.exam_id
    where esr.id = new.exam_subject_result_id;
  else
    v_student := new.student_id;
  end if;

  if v_student is not null then
    perform public.sync_mascot_rewards_for(v_student);
  end if;
  return null;
end;
$$;

revoke all on function public.mascot_sync_after_write() from public, anon, authenticated;

create trigger study_logs_mascot_reward
  after insert or update on public.study_logs
  for each row execute function public.mascot_sync_after_write();

create trigger exams_mascot_reward
  after insert on public.exams
  for each row execute function public.mascot_sync_after_write();

create trigger exam_mistakes_mascot_reward
  after insert on public.exam_mistakes
  for each row execute function public.mascot_sync_after_write();

-- ---------------------------------------------------------------------------
-- Quiet hours and the one gentle reminder. The function inserts the row;
-- authenticated has no insert grant, so a client cannot store its own sentence.
-- ---------------------------------------------------------------------------

create function public.mascot_is_quiet(p_now time, p_start time, p_end time)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_start = p_end then false
    when p_start < p_end then p_now >= p_start and p_now < p_end
    else p_now >= p_start or p_now < p_end
  end;
$$;

revoke all on function public.mascot_is_quiet(time, time, time) from public, anon, authenticated;

create function public.open_study_reminder()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := auth.uid();
  istanbul_today date := (pg_catalog.timezone('Europe/Istanbul', pg_catalog.now()))::date;
  now_time time := (pg_catalog.timezone('Europe/Istanbul', pg_catalog.now()))::time;
  v_enabled boolean := true;
  v_quiet_start time := time '21:00';
  v_quiet_end time := time '08:00';
  v_max smallint := 1;
  v_count integer;
  v_open uuid;
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

  select enabled, quiet_start, quiet_end, max_per_day
    into v_enabled, v_quiet_start, v_quiet_end, v_max
  from public.notification_preferences
  where student_id = v_student;

  if not found then
    v_enabled := true;
    v_quiet_start := time '21:00';
    v_quiet_end := time '08:00';
    v_max := 1;
  end if;

  if not v_enabled then
    return null;
  end if;

  if public.mascot_is_quiet(now_time, v_quiet_start, v_quiet_end) then
    return null;
  end if;

  if exists (
    select 1
    from public.study_logs
    where student_id = v_student
      and studied_on = istanbul_today
  ) then
    return null;
  end if;

  select id into v_open
  from public.in_app_notices
  where student_id = v_student
    and kind = 'study_reminder'
    and notice_date = istanbul_today
    and dismissed_at is null
  order by sequence
  limit 1;

  if v_open is not null then
    return v_open;
  end if;

  select count(*) into v_count
  from public.in_app_notices
  where student_id = v_student
    and kind = 'study_reminder'
    and notice_date = istanbul_today;

  if v_count >= v_max then
    return null;
  end if;

  begin
    insert into public.in_app_notices (student_id, kind, notice_date, sequence)
    values (v_student, 'study_reminder', istanbul_today, v_count + 1)
    returning id into v_open;
    return v_open;
  exception
    when unique_violation then
      select id into v_open
      from public.in_app_notices
      where student_id = v_student
        and kind = 'study_reminder'
        and notice_date = istanbul_today
        and dismissed_at is null
      order by sequence
      limit 1;
      return v_open;
  end;
end;
$$;

revoke all on function public.open_study_reminder() from public, anon;
grant execute on function public.open_study_reminder() to authenticated;

create function public.mascot_open_review_exam()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select exams.id
  from public.exams
  where exams.student_id = (select auth.uid())
    and (
      select coalesce(sum(esr.wrong_count + esr.blank_count), 0)
      from public.exam_subject_results esr
      where esr.exam_id = exams.id
    ) > (
      select count(*)::integer
      from public.exam_subject_results esr
      join public.exam_mistakes em on em.exam_subject_result_id = esr.id
      where esr.exam_id = exams.id
    )
  order by exams.taken_on desc, exams.created_at desc
  limit 1;
$$;

revoke all on function public.mascot_open_review_exam() from public, anon;
grant execute on function public.mascot_open_review_exam() to authenticated;

-- ---------------------------------------------------------------------------
-- Grants and RLS. Read and write policies are separate. Reward rows have no
-- insert grant: only the sync function writes them.
-- ---------------------------------------------------------------------------

alter table public.mascot_profiles enable row level security;
alter table public.reward_events enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.in_app_notices enable row level security;

revoke all on table public.mascot_profiles from public, anon, authenticated;
revoke all on table public.reward_events from public, anon, authenticated;
revoke all on table public.notification_preferences from public, anon, authenticated;
revoke all on table public.in_app_notices from public, anon, authenticated;

grant select on table public.mascot_profiles to authenticated;
grant insert (student_id, species) on table public.mascot_profiles to authenticated;
grant update (species) on table public.mascot_profiles to authenticated;

grant select on table public.reward_events to authenticated;

grant select on table public.notification_preferences to authenticated;
grant insert (student_id, enabled, quiet_start, quiet_end, max_per_day)
  on table public.notification_preferences to authenticated;
grant update (enabled, quiet_start, quiet_end, max_per_day)
  on table public.notification_preferences to authenticated;

grant select on table public.in_app_notices to authenticated;
grant update (dismissed_at) on table public.in_app_notices to authenticated;

grant select, insert, update, delete on table public.mascot_profiles to service_role;
grant select, insert, delete on table public.reward_events to service_role;
grant select, insert, update, delete on table public.notification_preferences to service_role;
grant select, insert, update, delete on table public.in_app_notices to service_role;

create policy "mascot_profiles: owner or active parent reads"
  on public.mascot_profiles for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.family_links
      where family_links.student_id = mascot_profiles.student_id
        and family_links.parent_id = (select auth.uid())
        and family_links.status = 'active'
    )
  );

create policy "mascot_profiles: student inserts own row"
  on public.mascot_profiles for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "mascot_profiles: student updates own row"
  on public.mascot_profiles for update to authenticated
  using (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  )
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "reward_events: owner or active parent reads"
  on public.reward_events for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.family_links
      where family_links.student_id = reward_events.student_id
        and family_links.parent_id = (select auth.uid())
        and family_links.status = 'active'
    )
  );

create policy "notification_preferences: student reads own row"
  on public.notification_preferences for select to authenticated
  using (student_id = (select auth.uid()));

create policy "notification_preferences: student inserts own row"
  on public.notification_preferences for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "notification_preferences: student updates own row"
  on public.notification_preferences for update to authenticated
  using (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  )
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "in_app_notices: student reads own row"
  on public.in_app_notices for select to authenticated
  using (student_id = (select auth.uid()));

create policy "in_app_notices: student dismisses own row"
  on public.in_app_notices for update to authenticated
  using (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  )
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );
