-- Phase 12: retention cleanup and family-data erase.
-- Durations: decision 0.5. Catalog rows are reference data and are not deleted.
-- Both functions are service_role only. The app never calls erase_personal_data.

create function public.purge_retained_rows()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  audit_removed integer;
  links_removed integer;
  invites_removed integer;
  limits_removed integer;
  reports_removed integer;
begin
  delete from public.audit_events
  where occurred_at < pg_catalog.now() - interval '1 year';
  get diagnostics audit_removed = row_count;

  delete from public.family_links
  where status in ('declined', 'expired', 'revoked')
    and coalesce(revoked_at, responded_at, created_at) < pg_catalog.now() - interval '1 year';
  get diagnostics links_removed = row_count;

  delete from public.family_invites
  where created_at < pg_catalog.now() - interval '7 days';
  get diagnostics invites_removed = row_count;

  delete from public.auth_rate_limits
  where window_started_at < pg_catalog.now() - interval '1 day';
  get diagnostics limits_removed = row_count;

  reports_removed := public.purge_expired_report_jobs();

  return jsonb_build_object(
    'audit_events', audit_removed,
    'family_links', links_removed,
    'family_invites', invites_removed,
    'auth_rate_limits', limits_removed,
    'report_jobs', reports_removed
  );
end;
$$;

revoke all on function public.purge_retained_rows() from public, anon, authenticated;
grant execute on function public.purge_retained_rows() to service_role;

comment on function public.purge_retained_rows() is
  'Deletes rows past decision 0.5 retention: audit and finished links after 1 year, unused invites after 7 days, rate-limit windows after 1 day, and expired report files.';

create function public.erase_personal_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  accounts integer;
begin
  select count(*) into accounts from auth.users;
  delete from auth.users;
  delete from public.audit_events;
  delete from public.auth_rate_limits;
  return jsonb_build_object('accounts', accounts);
end;
$$;

revoke all on function public.erase_personal_data() from public, anon, authenticated;
grant execute on function public.erase_personal_data() to service_role;

comment on function public.erase_personal_data() is
  'Deletes every account and the rows that cascade from it, plus the audit log and rate-limit counters. Curriculum catalog rows stay. Run only from the owner script after confirmation.';
