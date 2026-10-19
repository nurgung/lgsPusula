-- Phase 7: exams and per-subject results with stored net rule version (decision 0.7).
-- taken_on is a Europe/Istanbul civil date. Nets are recomputed in the app; the
-- database stores the values for read models and checks non-negative counts.
-- Access: the student creates, reads, updates and deletes their own rows. A parent
-- with an active family link may read and may not write. The admin role adds no
-- access (decision 0.13). RLS is a second line of defence behind the server checks.

-- ---------------------------------------------------------------------------
-- exams
-- ---------------------------------------------------------------------------

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null
    constraint exams_title_length check (char_length(title) between 1 and 80),
  taken_on date not null,
  exam_type text not null
    constraint exams_type_values check (exam_type in ('lgs_full', 'branch')),
  rule_version text not null
    constraint exams_rule_version_length check (char_length(rule_version) between 1 and 32),
  total_net numeric(10, 4) not null
    constraint exams_total_net_non_negative check (total_net >= 0),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exams_request_once unique (student_id, request_id)
);

comment on table public.exams is
  'One practice exam. taken_on is the Europe/Istanbul civil date. total_net is floored at 0; subject nets may be negative. rule_version selects the net formula and LGS distribution.';

create index exams_student_day_idx on public.exams (student_id, taken_on desc);

-- ---------------------------------------------------------------------------
-- exam_subject_results
-- ---------------------------------------------------------------------------

create table public.exam_subject_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  question_count integer not null
    constraint exam_subject_results_question_range check (question_count between 1 and 100),
  correct_count integer not null
    constraint exam_subject_results_correct_range check (correct_count between 0 and 100),
  wrong_count integer not null
    constraint exam_subject_results_wrong_range check (wrong_count between 0 and 100),
  blank_count integer not null
    constraint exam_subject_results_blank_range check (blank_count between 0 and 100),
  net numeric(10, 4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_subject_results_counts_sum check (
    correct_count + wrong_count + blank_count = question_count
  ),
  constraint exam_subject_results_one_subject unique (exam_id, subject_id)
);

comment on table public.exam_subject_results is
  'Per-subject doğru/yanlış/boş and computed net for one exam. Subject net may be negative.';

create index exam_subject_results_exam_id_idx on public.exam_subject_results (exam_id);

-- ---------------------------------------------------------------------------
-- Integrity
-- ---------------------------------------------------------------------------

create function public.exams_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  istanbul_today date := (pg_catalog.timezone('Europe/Istanbul', pg_catalog.now()))::date;
begin
  if tg_op = 'UPDATE' then
    if new.student_id is distinct from old.student_id
      or new.request_id is distinct from old.request_id then
      raise exception 'exam owner and request id cannot change'
        using errcode = '42501';
    end if;
  end if;

  if new.taken_on > istanbul_today or new.taken_on < date '2024-09-01' then
    raise exception 'exam date is outside the allowed window'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.exams_before_write() from public, anon;
grant execute on function public.exams_before_write() to authenticated, service_role;

create trigger exams_before_write
  before insert or update on public.exams
  for each row execute function public.exams_before_write();

create trigger exams_touch_updated_at
  before update on public.exams
  for each row execute function public.touch_updated_at();

create trigger exam_subject_results_touch_updated_at
  before update on public.exam_subject_results
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and RLS
-- ---------------------------------------------------------------------------

alter table public.exams enable row level security;
alter table public.exam_subject_results enable row level security;

revoke all on table public.exams from public, anon, authenticated;
revoke all on table public.exam_subject_results from public, anon, authenticated;

grant select on table public.exams to authenticated;
grant insert (
  student_id,
  title,
  taken_on,
  exam_type,
  rule_version,
  total_net,
  request_id
) on table public.exams to authenticated;
grant update (
  title,
  taken_on,
  exam_type,
  rule_version,
  total_net
) on table public.exams to authenticated;
grant delete on table public.exams to authenticated;

grant select on table public.exam_subject_results to authenticated;
grant insert (
  exam_id,
  subject_id,
  question_count,
  correct_count,
  wrong_count,
  blank_count,
  net
) on table public.exam_subject_results to authenticated;
grant update (
  subject_id,
  question_count,
  correct_count,
  wrong_count,
  blank_count,
  net
) on table public.exam_subject_results to authenticated;
grant delete on table public.exam_subject_results to authenticated;

grant select, insert, update, delete on table public.exams to service_role;
grant select, insert, update, delete on table public.exam_subject_results to service_role;

create policy "exams: owner or active parent reads"
  on public.exams for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.family_links
      where family_links.student_id = exams.student_id
        and family_links.parent_id = (select auth.uid())
        and family_links.status = 'active'
    )
  );

create policy "exams: student inserts own row"
  on public.exams for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "exams: student updates own row"
  on public.exams for update to authenticated
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

create policy "exams: student deletes own row"
  on public.exams for delete to authenticated
  using (
    student_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

-- Subject rows inherit visibility from the parent exam.
create policy "exam_subject_results: owner or active parent reads"
  on public.exam_subject_results for select to authenticated
  using (
    exists (
      select 1
      from public.exams
      where exams.id = exam_subject_results.exam_id
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

create policy "exam_subject_results: student inserts for own exam"
  on public.exam_subject_results for insert to authenticated
  with check (
    exists (
      select 1
      from public.exams
      join public.profiles on profiles.id = (select auth.uid())
      where exams.id = exam_subject_results.exam_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "exam_subject_results: student updates for own exam"
  on public.exam_subject_results for update to authenticated
  using (
    exists (
      select 1
      from public.exams
      join public.profiles on profiles.id = (select auth.uid())
      where exams.id = exam_subject_results.exam_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  )
  with check (
    exists (
      select 1
      from public.exams
      join public.profiles on profiles.id = (select auth.uid())
      where exams.id = exam_subject_results.exam_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );

create policy "exam_subject_results: student deletes for own exam"
  on public.exam_subject_results for delete to authenticated
  using (
    exists (
      select 1
      from public.exams
      join public.profiles on profiles.id = (select auth.uid())
      where exams.id = exam_subject_results.exam_id
        and exams.student_id = (select auth.uid())
        and profiles.roles = array['student']::public.app_role[]
    )
  );
