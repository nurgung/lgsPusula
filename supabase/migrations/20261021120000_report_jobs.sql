-- Phase 11: weekly PDF report jobs.
-- The PDF bytes live in this table (storage_kind = database), never on a public web path.
-- A ready row must start with the PDF header and stay within 24 hours.
-- Authenticated users cannot insert, update, or delete. They cannot read pdf_bytes.
-- The app writes with service_role only after it has checked the active family link.
-- Expired rows are deleted by purge_expired_report_jobs(), which the parent pages call.
-- There is no scheduled worker yet; a file can outlive 24 hours until the next parent visit.

-- ---------------------------------------------------------------------------
-- report_jobs
-- ---------------------------------------------------------------------------

create table public.report_jobs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  report_type text not null
    constraint report_jobs_type check (report_type = 'weekly_pdf'),
  period_from date not null,
  period_to date not null,
  status text not null
    constraint report_jobs_status check (status in ('ready', 'failed')),
  pdf_bytes bytea,
  byte_size integer not null
    constraint report_jobs_byte_size check (byte_size between 0 and 1500000),
  failure_code text,
  storage_kind text not null default 'database'
    constraint report_jobs_storage check (storage_kind = 'database'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint report_jobs_period check (period_to - period_from between 0 and 6),
  constraint report_jobs_requester_differs check (requested_by <> student_id),
  constraint report_jobs_failure_code check (
    failure_code is null or failure_code in ('generation_failed', 'empty_document')
  ),
  constraint report_jobs_payload check (
    (
      status = 'ready'
      and pdf_bytes is not null
      and octet_length(pdf_bytes) between 400 and 1500000
      and byte_size = octet_length(pdf_bytes)
      and failure_code is null
    )
    or (
      status = 'failed'
      and pdf_bytes is null
      and byte_size = 0
      and failure_code is not null
    )
  ),
  constraint report_jobs_one_period unique (
    requested_by, student_id, report_type, period_from, period_to
  )
);

comment on table public.report_jobs is
  'One weekly PDF for a parent and a linked student. pdf_bytes is the file. It is not a web path. expires_at is at most 24 hours ahead. Expired rows are deleted, not kept.';

comment on column public.report_jobs.storage_kind is
  'database means the bytes are in pdf_bytes. No other location is allowed.';

comment on column public.report_jobs.period_from is
  'Inclusive Europe/Istanbul civil date. Weekly reports cover at most 7 days.';

create index report_jobs_expires_at_idx on public.report_jobs (expires_at);

-- ---------------------------------------------------------------------------
-- Integrity: parent requester, student subject, PDF header, 24 hour cap.
-- Past expiry is allowed so purge can be tested; download still rejects it.
-- ---------------------------------------------------------------------------

create function public.report_jobs_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_roles public.app_role[];
  student_roles public.app_role[];
begin
  select roles into parent_roles from public.profiles where id = new.requested_by;
  select roles into student_roles from public.profiles where id = new.student_id;

  if parent_roles is null or not ('parent' = any (parent_roles)) then
    raise exception 'report requester must be a parent'
      using errcode = '42501';
  end if;

  if student_roles is distinct from array['student']::public.app_role[] then
    raise exception 'report subject must be a student'
      using errcode = '42501';
  end if;

  if new.expires_at > pg_catalog.now() + interval '24 hours 1 minute' then
    raise exception 'report expiry cannot exceed 24 hours'
      using errcode = '23514';
  end if;

  if new.status = 'ready'
    and substring(new.pdf_bytes from 1 for 5) is distinct from '\x255044462d'::bytea then
    raise exception 'ready report must start with the PDF header'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.report_jobs_before_write() from public, anon, authenticated;
grant execute on function public.report_jobs_before_write() to service_role;

create trigger report_jobs_before_write
  before insert or update on public.report_jobs
  for each row execute function public.report_jobs_before_write();

-- ---------------------------------------------------------------------------
-- Delete every row whose 24 hour window has ended. service_role only.
-- ---------------------------------------------------------------------------

create function public.purge_expired_report_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.report_jobs
  where expires_at <= pg_catalog.now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.purge_expired_report_jobs() from public, anon, authenticated;
grant execute on function public.purge_expired_report_jobs() to service_role;

comment on function public.purge_expired_report_jobs() is
  'Deletes report files whose expires_at has passed. Called when a parent opens the panel or asks for a report.';

-- ---------------------------------------------------------------------------
-- Grants. pdf_bytes is not granted to authenticated, so the Data API cannot read the file.
-- ---------------------------------------------------------------------------

alter table public.report_jobs enable row level security;

revoke all on table public.report_jobs from public, anon, authenticated;

grant select (
  id,
  student_id,
  requested_by,
  report_type,
  period_from,
  period_to,
  status,
  byte_size,
  failure_code,
  storage_kind,
  created_at,
  expires_at
) on table public.report_jobs to authenticated;

grant select, insert, update, delete on table public.report_jobs to service_role;

create policy "report_jobs: requester with active link reads ready file"
  on public.report_jobs for select to authenticated
  using (
    requested_by = (select auth.uid())
    and status = 'ready'
    and expires_at > pg_catalog.now()
    and exists (
      select 1
      from public.family_links
      where family_links.student_id = report_jobs.student_id
        and family_links.parent_id = (select auth.uid())
        and family_links.status = 'active'
    )
  );
