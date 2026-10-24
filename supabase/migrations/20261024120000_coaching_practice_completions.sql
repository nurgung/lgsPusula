-- A student can mark the current outcome practice as done.
-- The row stores how many linked questions that mark covered. A later wrong or blank
-- on the same outcome makes the count higher, so the outcome can be suggested again.
-- No points are written. Parents with an active link may read; only the student writes.

create table public.coaching_practice_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  learning_outcome_id uuid not null references public.learning_outcomes (id) on delete restrict,
  question_count integer not null
    constraint coaching_practice_question_count check (question_count between 1 and 2000),
  completed_at timestamptz not null default now(),
  constraint coaching_practice_once unique (student_id, learning_outcome_id)
);

comment on table public.coaching_practice_completions is
  'Student marked the suggested outcome practice done for this linked-question count. Not a study log and not a score.';

alter table public.coaching_practice_completions enable row level security;

revoke all on table public.coaching_practice_completions from public, anon, authenticated;

grant select on table public.coaching_practice_completions to authenticated;
grant insert (
  student_id,
  learning_outcome_id,
  question_count,
  completed_at
) on table public.coaching_practice_completions to authenticated;
grant update (
  question_count,
  completed_at
) on table public.coaching_practice_completions to authenticated;

grant select, insert, update, delete on table public.coaching_practice_completions to service_role;

create policy "coaching_practice: owner or active parent reads"
  on public.coaching_practice_completions for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.family_links
      where family_links.student_id = coaching_practice_completions.student_id
        and family_links.parent_id = (select auth.uid())
        and family_links.status = 'active'
    )
  );

create policy "coaching_practice: student inserts own row"
  on public.coaching_practice_completions for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "coaching_practice: student updates own row"
  on public.coaching_practice_completions for update to authenticated
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
