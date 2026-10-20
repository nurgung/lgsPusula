-- Phase 8: map wrong/blank exam answers to learning outcomes (manual source).
-- Each row is one tagged mistake. Counts cannot exceed the parent subject result's
-- wrong_count / blank_count. The outcome must belong to the same subject.
-- Access mirrors exams: student writes own rows; active parent reads only.
-- Admin role adds no access (decision 0.13).

-- ---------------------------------------------------------------------------
-- exam_mistakes
-- ---------------------------------------------------------------------------

create table public.exam_mistakes (
  id uuid primary key default gen_random_uuid(),
  exam_subject_result_id uuid not null
    references public.exam_subject_results (id) on delete cascade,
  learning_outcome_id uuid not null
    references public.learning_outcomes (id) on delete restrict,
  mistake_kind text not null
    constraint exam_mistakes_kind_values check (mistake_kind in ('wrong', 'blank')),
  source text not null
    constraint exam_mistakes_source_values check (source in ('manual')),
  confidence text not null
    constraint exam_mistakes_confidence_values check (confidence in ('high', 'medium', 'low')),
  sort_order integer not null default 0
    constraint exam_mistakes_sort_range check (sort_order between 0 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_mistakes_manual_is_high check (
    source <> 'manual' or confidence = 'high'
  )
);

comment on table public.exam_mistakes is
  'One wrong or blank answer tagged to a learning outcome. source and confidence record how the match was made; Phase 8 only writes source=manual, confidence=high. Missing rows mean no outcome analysis for that answer.';

create index exam_mistakes_result_id_idx
  on public.exam_mistakes (exam_subject_result_id);

create index exam_mistakes_outcome_id_idx
  on public.exam_mistakes (learning_outcome_id);

-- ---------------------------------------------------------------------------
-- Integrity
-- ---------------------------------------------------------------------------

create function public.exam_mistakes_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  result_subject_id uuid;
  result_wrong integer;
  result_blank integer;
  outcome_subject_id uuid;
  kind_count integer;
  kind_limit integer;
begin
  select
    exam_subject_results.subject_id,
    exam_subject_results.wrong_count,
    exam_subject_results.blank_count
  into result_subject_id, result_wrong, result_blank
  from public.exam_subject_results
  where exam_subject_results.id = new.exam_subject_result_id;

  if result_subject_id is null then
    raise exception 'exam subject result not found'
      using errcode = '23503';
  end if;

  select topics.subject_id
  into outcome_subject_id
  from public.learning_outcomes
  join public.topics on topics.id = learning_outcomes.topic_id
  where learning_outcomes.id = new.learning_outcome_id;

  if outcome_subject_id is null then
    raise exception 'learning outcome not found'
      using errcode = '23503';
  end if;

  if outcome_subject_id is distinct from result_subject_id then
    raise exception 'learning outcome subject does not match exam subject'
      using errcode = '23514';
  end if;

  select count(*)::integer
  into kind_count
  from public.exam_mistakes
  where exam_subject_result_id = new.exam_subject_result_id
    and mistake_kind = new.mistake_kind
    and (tg_op = 'INSERT' or id is distinct from old.id);

  kind_count := kind_count + 1;
  kind_limit := case when new.mistake_kind = 'wrong' then result_wrong else result_blank end;

  if kind_count > kind_limit then
    raise exception 'mistake count exceeds subject wrong/blank total'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.exam_mistakes_before_write() from public, anon;
grant execute on function public.exam_mistakes_before_write() to authenticated, service_role;

create trigger exam_mistakes_before_write
  before insert or update on public.exam_mistakes
  for each row execute function public.exam_mistakes_before_write();

create trigger exam_mistakes_touch_updated_at
  before update on public.exam_mistakes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.exam_mistakes enable row level security;

revoke all on table public.exam_mistakes from public, anon, authenticated;

grant select on table public.exam_mistakes to authenticated;
grant insert (
  exam_subject_result_id,
  learning_outcome_id,
  mistake_kind,
  source,
  confidence,
  sort_order
) on table public.exam_mistakes to authenticated;
grant update (
  learning_outcome_id,
  mistake_kind,
  source,
  confidence,
  sort_order
) on table public.exam_mistakes to authenticated;
grant delete on table public.exam_mistakes to authenticated;

grant select, insert, update, delete on table public.exam_mistakes to service_role;

create policy "exam_mistakes: owner or active parent reads"
  on public.exam_mistakes for select to authenticated
  using (
    exists (
      select 1
      from public.exam_subject_results
      join public.exams on exams.id = exam_subject_results.exam_id
      where exam_subject_results.id = exam_mistakes.exam_subject_result_id
        and (
          exams.student_id = (select auth.uid())
          or exists (
            select 1
            from public.family_links
            where family_links.student_id = exams.student_id
              and family_links.parent_id = (select auth.uid())
              and family_links.status = 'active'
          )
        )
    )
  );

create policy "exam_mistakes: student inserts for own exam"
  on public.exam_mistakes for insert to authenticated
  with check (
    exists (
      select 1
      from public.exam_subject_results
      join public.exams on exams.id = exam_subject_results.exam_id
      join public.profiles on profiles.id = (select auth.uid())
      where exam_subject_results.id = exam_mistakes.exam_subject_result_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "exam_mistakes: student updates for own exam"
  on public.exam_mistakes for update to authenticated
  using (
    exists (
      select 1
      from public.exam_subject_results
      join public.exams on exams.id = exam_subject_results.exam_id
      join public.profiles on profiles.id = (select auth.uid())
      where exam_subject_results.id = exam_mistakes.exam_subject_result_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  )
  with check (
    exists (
      select 1
      from public.exam_subject_results
      join public.exams on exams.id = exam_subject_results.exam_id
      join public.profiles on profiles.id = (select auth.uid())
      where exam_subject_results.id = exam_mistakes.exam_subject_result_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "exam_mistakes: student deletes for own exam"
  on public.exam_mistakes for delete to authenticated
  using (
    exists (
      select 1
      from public.exam_subject_results
      join public.exams on exams.id = exam_subject_results.exam_id
      join public.profiles on profiles.id = (select auth.uid())
      where exam_subject_results.id = exam_mistakes.exam_subject_result_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );
