-- Optional practice-exam score entered by the student (not derived from nets).
-- Existing rows stay null; reports show "Kayıt yok" when empty.

alter table public.exams
  add column score numeric(8, 2) null
    constraint exams_score_range check (score is null or (score >= 0 and score <= 500));

comment on column public.exams.score is
  'Optional booklet/result score (0–500). Entered by the student; not computed from nets. Null means not recorded.';

grant insert (score) on table public.exams to authenticated;
grant update (score) on table public.exams to authenticated;
