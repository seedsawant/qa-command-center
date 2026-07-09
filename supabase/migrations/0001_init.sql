-- QA Command Center — Phase 1 schema: profiles, projects, project_members
-- Role model: one global role per user (profiles.role) governs *what* they
-- can do; project_members governs *which* projects they can see/work in at
-- all (including producers, who are auto-added to projects they create).

create extension if not exists pgcrypto;

create type app_role as enum ('producer', 'qa_lead', 'tester', 'viewer');

-- ============================================================================
-- Tables
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  platform_tags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  added_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_project_id_idx on project_members (project_id);
create index project_members_user_id_idx on project_members (user_id);

-- ============================================================================
-- Helper functions (security definer — reused by every future table's RLS:
-- modules, features, test_cases, builds, executions, ...)
-- ============================================================================

create function is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create function current_app_role()
returns app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

-- ============================================================================
-- updated_at maintenance
-- ============================================================================

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ============================================================================
-- New auth user -> profile row
-- ============================================================================

create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::app_role, 'viewer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- New project -> creator becomes a member
-- ============================================================================

create function handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into project_members (project_id, user_id, added_by)
  values (new.id, new.created_by, new.created_by);
  return new;
end;
$$;

create trigger on_project_created
  after insert on projects
  for each row execute function handle_new_project();

-- ============================================================================
-- Guard profiles.role / profiles.is_active from self-service changes
-- ============================================================================

create function guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for direct/service-role DB access (SQL editor, server
  -- actions using the service-role key) — that access level is already
  -- trusted and bypasses RLS, so only guard requests made through a user's
  -- own session (e.g. via PostgREST/the browser client).
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and current_app_role() is distinct from 'producer' then
    raise exception 'Only producers can change role or is_active';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged_fields
  before update on profiles
  for each row execute function guard_profile_privileged_fields();

-- ============================================================================
-- RLS
-- ============================================================================

alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;

create policy profiles_select_all on profiles
  for select to authenticated
  using (true);

create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid());

create policy projects_select_member on projects
  for select to authenticated
  using (is_project_member(id));

create policy projects_update_member on projects
  for update to authenticated
  using (is_project_member(id));

create policy projects_insert_producer on projects
  for insert to authenticated
  with check (current_app_role() = 'producer' and created_by = auth.uid());

create policy project_members_select_member on project_members
  for select to authenticated
  using (is_project_member(project_id));

create policy project_members_insert_producer on project_members
  for insert to authenticated
  with check (current_app_role() = 'producer' and is_project_member(project_id));

create policy project_members_delete_producer on project_members
  for delete to authenticated
  using (current_app_role() = 'producer' and is_project_member(project_id));
