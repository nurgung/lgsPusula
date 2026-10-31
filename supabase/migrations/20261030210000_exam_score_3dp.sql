-- Allow up to 3 decimal places on optional exam booklet scores (e.g. 412,555).

alter table public.exams
  alter column score type numeric(8, 3);

comment on column public.exams.score is
  'Optional booklet/result score (0–500, up to 3 decimal places). Entered by the student; not computed from nets. Null means not recorded.';
