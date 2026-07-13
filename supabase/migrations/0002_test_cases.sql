-- QA Command Center — Phase 2 (part 1): Test Case Library
-- Test cases belong to a project (no module/feature hierarchy yet — deferred).
-- Version history is a full-snapshot, append-only log populated by the
-- application layer (see test-case-library/actions.ts), not a DB trigger:
-- restoring an old version is just a normal update whose resulting fields
-- happen to match that version, so history is never rewritten (git-revert
-- style).

create type test_case_priority as enum ('critical', 'high', 'medium', 'low');
create type test_case_category as enum ('smoke', 'regression', 'sanity', 'performance', 'security', 'uat', 'automation');
create type test_case_platform as enum ('android', 'ios', 'web', 'api');

-- ============================================================================
-- Tables
-- ============================================================================

create table test_cases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  case_number integer not null,
  title text not null,
  description text,
  preconditions text,
  expected_result text,
  priority test_case_priority not null default 'medium',
  category test_case_category not null default 'regression',
  platform test_case_platform,
  tags text[] not null default '{}',
  owner_id uuid references profiles (id),
  estimated_minutes integer,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, case_number)
);

create index test_cases_project_id_idx on test_cases (project_id);

-- Per-project counter for the human-readable "TC-{n}" number. A separate
-- table with an atomic upsert avoids the race condition a plain
-- max(case_number)+1 query would have under concurrent creates.
create table project_test_case_counters (
  project_id uuid primary key references projects (id) on delete cascade,
  last_number integer not null default 0
);

alter table project_test_case_counters enable row level security;
-- No policies: only reachable via the security-definer function below, never
-- queried directly by client code.

create function next_test_case_number(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into project_test_case_counters (project_id, last_number)
  values (p_project_id, 1)
  on conflict (project_id) do update set last_number = project_test_case_counters.last_number + 1
  returning last_number into v_number;
  return v_number;
end;
$$;

create function set_test_case_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.case_number is null then
    new.case_number := next_test_case_number(new.project_id);
  end if;
  return new;
end;
$$;

create trigger test_cases_set_case_number
  before insert on test_cases
  for each row execute function set_test_case_number();

create trigger test_cases_set_updated_at
  before update on test_cases
  for each row execute function set_updated_at();

create table test_case_versions (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references test_cases (id) on delete cascade,
  version_number integer not null,
  title text not null,
  description text,
  preconditions text,
  expected_result text,
  priority test_case_priority not null,
  category test_case_category not null,
  platform test_case_platform,
  tags text[] not null,
  owner_id uuid,
  estimated_minutes integer,
  changed_by uuid not null references profiles (id),
  changed_at timestamptz not null default now(),
  change_note text,
  unique (test_case_id, version_number)
);

create index test_case_versions_test_case_id_idx on test_case_versions (test_case_id);

-- ============================================================================
-- Helper (reused by RLS below)
-- ============================================================================

create function test_case_project_id(p_test_case_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select project_id from test_cases where id = p_test_case_id;
$$;

-- ============================================================================
-- RLS
-- ============================================================================

alter table test_cases enable row level security;
alter table test_case_versions enable row level security;

-- Any project member can view (testers/viewers need to see test cases to
-- execute/review them, even though only producer/qa_lead can author them).
create policy test_cases_select_member on test_cases
  for select to authenticated
  using (is_project_member(project_id));

create policy test_cases_insert_manager on test_cases
  for insert to authenticated
  with check (is_project_member(project_id) and current_app_role() in ('producer', 'qa_lead'));

create policy test_cases_update_manager on test_cases
  for update to authenticated
  using (is_project_member(project_id) and current_app_role() in ('producer', 'qa_lead'));

-- No delete policy — archive via status instead. Even producer/qa_lead
-- shouldn't hard-delete a "reusable library" entry that later phases
-- (executions, reports) may come to reference.

create policy test_case_versions_select_member on test_case_versions
  for select to authenticated
  using (is_project_member(test_case_project_id(test_case_id)));

create policy test_case_versions_insert_manager on test_case_versions
  for insert to authenticated
  with check (
    current_app_role() in ('producer', 'qa_lead')
    and is_project_member(test_case_project_id(test_case_id))
  );
