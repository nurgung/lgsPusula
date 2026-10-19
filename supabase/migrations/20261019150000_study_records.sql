-- Phase 6: daily study logs and goals.
-- Dates are Europe/Istanbul civil dates (studied_on), not timestamps. Instants elsewhere
-- stay timestamptz (UTC). A week is Monday–Sunday. The goal counts questions ("soru").
-- Access: the student creates, reads, updates and deletes their own rows. A parent with
-- an active family link may read and may not write. The admin role adds no access
-- (decision 0.13). RLS is a second line of defence behind the server checks.

-- ---------------------------------------------------------------------------
-- study_logs
-- ---------------------------------------------------------------------------

create table public.study_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  -- Civil date in Europe/Istanbul. The trigger rejects dates after "today" there.
  studied_on date not null,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  topic_id uuid references public.topics (id) on delete restrict,
  learning_outcome_id uuid references public.learning_outcomes (id) on delete restrict,
  question_count integer not null
    constraint study_logs_question_count_range check (question_count between 1 and 500),
  correct_count integer not null
    constraint study_logs_correct_count_range check (correct_count between 0 and 500),
  wrong_count integer not null
    constraint study_logs_wrong_count_range check (wrong_count between 0 and 500),
  blank_count integer not null
    constraint study_logs_blank_count_range check (blank_count between 0 and 500),
  duration_minutes integer not null
    constraint study_logs_duration_range check (duration_minutes between 0 and 1440),
  -- One submission. A repeated post with this id does not insert a second row.
  request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_logs_counts_sum check (
    correct_count + wrong_count + blank_count = question_count
  ),
  constraint study_logs_request_once unique (student_id, request_id)
);

comment on table public.study_logs is
  'One practice session for a student. studied_on is the Europe/Istanbul civil date. Question counts are non-negative and doğru + yanlış + boş = soru sayısı.';

create index study_logs_student_day_idx on public.study_logs (student_id, studied_on);

-- ---------------------------------------------------------------------------
-- study_goals
-- One current goal per student, period and subject. subject_id null means every subject.
-- The target is a question count, not minutes.
-- ---------------------------------------------------------------------------

create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  period text not null
    constraint study_goals_period_values check (period in ('day', 'week')),
  subject_id uuid references public.subjects (id) on delete restrict,
  target_questions integer not null
    constraint study_goals_target_range check (target_questions between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_goals_one_current unique nulls not distinct (student_id, period, subject_id)
);

comment on table public.study_goals is
  'Current daily or weekly question-count goal. Null subject_id covers every subject. Weeks are Monday–Sunday in Europe/Istanbul.';

create index study_goals_student_id_idx on public.study_goals (student_id);

-- ---------------------------------------------------------------------------
-- Integrity: owner and request id stay put; the date is an Istanbul day in range;
-- a topic belongs to the subject and an outcome belongs to that topic.
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon;
grant execute on function public.touch_updated_at() to authenticated, service_role;

create function public.study_logs_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  topic_subject uuid;
  outcome_topic uuid;
  istanbul_today date := (pg_catalog.timezone('Europe/Istanbul', pg_catalog.now()))::date;
begin
  if tg_op = 'UPDATE' then
    if new.student_id is distinct from old.student_id
      or new.request_id is distinct from old.request_id then
      raise exception 'study log owner and request id cannot change'
        using errcode = '42501';
    end if;
  end if;

  if new.studied_on > istanbul_today or new.studied_on < date '2024-09-01' then
    raise exception 'study date is outside the allowed window'
      using errcode = '23514';
  end if;

  if new.topic_id is not null then
    select subject_id into topic_subject
    from public.topics
    where id = new.topic_id;
    if topic_subject is null or topic_subject is distinct from new.subject_id then
      raise exception 'topic does not belong to the subject'
        using errcode = '23514';
    end if;
  end if;

  if new.learning_outcome_id is not null then
    if new.topic_id is null then
      raise exception 'outcome requires a topic'
        using errcode = '23514';
    end if;
    select topic_id into outcome_topic
    from public.learning_outcomes
    where id = new.learning_outcome_id;
    if outcome_topic is null or outcome_topic is distinct from new.topic_id then
      raise exception 'outcome does not belong to the topic'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.study_logs_before_write() from public, anon;
grant execute on function public.study_logs_before_write() to authenticated, service_role;

create trigger study_logs_before_write
  before insert or update on public.study_logs
  for each row execute function public.study_logs_before_write();

create trigger study_logs_touch_updated_at
  before update on public.study_logs
  for each row execute function public.touch_updated_at();

create trigger study_goals_touch_updated_at
  before update on public.study_goals
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and RLS. Read and write policies are separate.
-- Column grants keep the owner and the request id out of updates.
-- ---------------------------------------------------------------------------

alter table public.study_logs enable row level security;
alter table public.study_goals enable row level security;

revoke all on table public.study_logs from public, anon, authenticated;
revoke all on table public.study_goals from public, anon, authenticated;

grant select on table public.study_logs to authenticated;
grant insert (
  student_id,
  studied_on,
  subject_id,
  topic_id,
  learning_outcome_id,
  question_count,
  correct_count,
  wrong_count,
  blank_count,
  duration_minutes,
  request_id
) on table public.study_logs to authenticated;
grant update (
  studied_on,
  subject_id,
  topic_id,
  learning_outcome_id,
  question_count,
  correct_count,
  wrong_count,
  blank_count,
  duration_minutes
) on table public.study_logs to authenticated;
grant delete on table public.study_logs to authenticated;

grant select on table public.study_goals to authenticated;
grant insert (student_id, period, subject_id, target_questions)
  on table public.study_goals to authenticated;
grant update (target_questions) on table public.study_goals to authenticated;
grant delete on table public.study_goals to authenticated;

grant select, insert, update, delete on table public.study_logs to service_role;
grant select, insert, update, delete on table public.study_goals to service_role;

create policy "study_logs: owner or active parent reads"
  on public.study_logs for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.family_links
      where family_links.student_id = study_logs.student_id
        and family_links.parent_id = (select auth.uid())
        and family_links.status = 'active'
    )
  );

create policy "study_logs: student inserts own row"
  on public.study_logs for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "study_logs: student updates own row"
  on public.study_logs for update to authenticated
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

create policy "study_logs: student deletes own row"
  on public.study_logs for delete to authenticated
  using (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "study_goals: owner or active parent reads"
  on public.study_goals for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.family_links
      where family_links.student_id = study_goals.student_id
        and family_links.parent_id = (select auth.uid())
        and family_links.status = 'active'
    )
  );

create policy "study_goals: student inserts own row"
  on public.study_goals for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "study_goals: student updates own row"
  on public.study_goals for update to authenticated
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

create policy "study_goals: student deletes own row"
  on public.study_goals for delete to authenticated
  using (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );
