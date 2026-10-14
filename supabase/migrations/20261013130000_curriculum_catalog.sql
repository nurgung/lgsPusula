-- Phase 5: curriculum catalog (subjects, topics, learning outcomes).
-- Decision 0.6: every row records its source name, source version and entry date. Rows are
-- never deleted from the app; an outdated row is marked with archived_at so past study logs
-- and exam mappings keep pointing at it.
-- Access: every signed-in user reads. Only an admin whose session completed TOTP (aal2) may
-- insert or update, enforced here as a second line of defence behind the server checks.

-- ---------------------------------------------------------------------------
-- Who may change the catalog
-- ---------------------------------------------------------------------------

create function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and 'admin' = any (roles)
    );
$$;

revoke all on function public.is_catalog_admin() from public, anon;
grant execute on function public.is_catalog_admin() to authenticated, service_role;

create function public.touch_catalog_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  -- Stable key used by the import file and later by exam types (Phase 7).
  code text not null unique
    constraint subjects_code_format check (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  name text not null
    constraint subjects_name_length check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0
    constraint subjects_sort_order_range check (sort_order between 0 and 9999),
  source_name text not null
    constraint subjects_source_name_length check (char_length(btrim(source_name)) between 1 and 120),
  source_version text not null
    constraint subjects_source_version_length check (char_length(btrim(source_version)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.subjects is
  'Curriculum subjects (decision 0.6). archived_at marks an outdated row; rows are not deleted.';

-- ---------------------------------------------------------------------------
-- topics
-- ---------------------------------------------------------------------------

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  name text not null
    constraint topics_name_length check (char_length(btrim(name)) between 1 and 160),
  sort_order integer not null default 0
    constraint topics_sort_order_range check (sort_order between 0 and 9999),
  source_name text not null
    constraint topics_source_name_length check (char_length(btrim(source_name)) between 1 and 120),
  source_version text not null
    constraint topics_source_version_length check (char_length(btrim(source_version)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint topics_unique_name_per_version unique (subject_id, name, source_version)
);

comment on table public.topics is
  'Curriculum topics within a subject (decision 0.6). A new source version adds new rows.';

create index topics_subject_id_idx on public.topics (subject_id);

-- ---------------------------------------------------------------------------
-- learning_outcomes
-- ---------------------------------------------------------------------------

create table public.learning_outcomes (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics (id) on delete restrict,
  -- Code as written in the official programme, e.g. "M.8.1.1.1".
  code text not null
    constraint learning_outcomes_code_format check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$'),
  description text not null
    constraint learning_outcomes_description_length check (char_length(btrim(description)) between 1 and 500),
  sort_order integer not null default 0
    constraint learning_outcomes_sort_order_range check (sort_order between 0 and 9999),
  source_name text not null
    constraint learning_outcomes_source_name_length check (char_length(btrim(source_name)) between 1 and 120),
  source_version text not null
    constraint learning_outcomes_source_version_length check (char_length(btrim(source_version)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint learning_outcomes_unique_code_per_version unique (code, source_version)
);

comment on table public.learning_outcomes is
  'Learning outcomes (kazanım) within a topic (decision 0.6). Old versions are archived, not deleted, so past mappings stay valid.';

create index learning_outcomes_topic_id_idx on public.learning_outcomes (topic_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create trigger subjects_touch_updated_at
  before update on public.subjects
  for each row execute function public.touch_catalog_updated_at();

create trigger topics_touch_updated_at
  before update on public.topics
  for each row execute function public.touch_catalog_updated_at();

create trigger learning_outcomes_touch_updated_at
  before update on public.learning_outcomes
  for each row execute function public.touch_catalog_updated_at();

-- ---------------------------------------------------------------------------
-- Grants and RLS. Read and write policies are separate.
-- Column grants keep id, parent ids and timestamps out of user updates: a row cannot be moved
-- under another subject or topic, which would silently change past mappings.
-- No delete grant for users. service_role may delete (owner maintenance and test cleanup);
-- foreign keys still block deleting a row that something points at.
-- ---------------------------------------------------------------------------

alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.learning_outcomes enable row level security;

revoke all on table public.subjects from public, anon, authenticated;
revoke all on table public.topics from public, anon, authenticated;
revoke all on table public.learning_outcomes from public, anon, authenticated;

grant select on table public.subjects to authenticated;
grant insert (code, name, sort_order, source_name, source_version)
  on table public.subjects to authenticated;
grant update (name, sort_order, source_name, source_version, archived_at)
  on table public.subjects to authenticated;

grant select on table public.topics to authenticated;
grant insert (subject_id, name, sort_order, source_name, source_version)
  on table public.topics to authenticated;
grant update (name, sort_order, source_name, source_version, archived_at)
  on table public.topics to authenticated;

grant select on table public.learning_outcomes to authenticated;
grant insert (topic_id, code, description, sort_order, source_name, source_version)
  on table public.learning_outcomes to authenticated;
grant update (code, description, sort_order, source_name, source_version, archived_at)
  on table public.learning_outcomes to authenticated;

grant select, insert, update, delete on table public.subjects to service_role;
grant select, insert, update, delete on table public.topics to service_role;
grant select, insert, update, delete on table public.learning_outcomes to service_role;

create policy "subjects: signed-in users read"
  on public.subjects for select to authenticated
  using (true);
create policy "subjects: catalog admin inserts"
  on public.subjects for insert to authenticated
  with check ((select public.is_catalog_admin()));
create policy "subjects: catalog admin updates"
  on public.subjects for update to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

create policy "topics: signed-in users read"
  on public.topics for select to authenticated
  using (true);
create policy "topics: catalog admin inserts"
  on public.topics for insert to authenticated
  with check ((select public.is_catalog_admin()));
create policy "topics: catalog admin updates"
  on public.topics for update to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));

create policy "learning_outcomes: signed-in users read"
  on public.learning_outcomes for select to authenticated
  using (true);
create policy "learning_outcomes: catalog admin inserts"
  on public.learning_outcomes for insert to authenticated
  with check ((select public.is_catalog_admin()));
create policy "learning_outcomes: catalog admin updates"
  on public.learning_outcomes for update to authenticated
  using ((select public.is_catalog_admin()))
  with check ((select public.is_catalog_admin()));
