-- Monthly PDF reports share report_jobs with weekly ones.
-- Weekly periods stay at most 7 days; monthly periods stay at most 31 days.
-- report_type distinguishes the two so the unique period key cannot collide.

alter table public.report_jobs
  drop constraint if exists report_jobs_type;

alter table public.report_jobs
  add constraint report_jobs_type
  check (report_type in ('weekly_pdf', 'monthly_pdf'));

alter table public.report_jobs
  drop constraint if exists report_jobs_period;

alter table public.report_jobs
  add constraint report_jobs_period check (
    (
      report_type = 'weekly_pdf'
      and period_to - period_from between 0 and 6
    )
    or (
      report_type = 'monthly_pdf'
      and period_to - period_from between 0 and 30
    )
  );

comment on table public.report_jobs is
  'One weekly or monthly PDF for a parent and a linked student. pdf_bytes is the file. It is not a web path. expires_at is at most 24 hours ahead. Expired rows are deleted, not kept.';

comment on column public.report_jobs.period_from is
  'Inclusive Europe/Istanbul civil date. Weekly reports cover at most 7 days; monthly reports cover at most 31 days.';
