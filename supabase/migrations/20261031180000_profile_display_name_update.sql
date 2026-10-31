-- Users may edit only their own display_name. Roles, username and must_change_password
-- stay service_role-only (AUTHORIZATION.md / auth foundation comment).

grant update (display_name) on table public.profiles to authenticated;

create policy "profiles: users update own display_name"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

comment on table public.profiles is
  'One row per account. Authenticated users may update only display_name on their own row. Roles and must_change_password are written only by the server (service_role) or the setup script.';
