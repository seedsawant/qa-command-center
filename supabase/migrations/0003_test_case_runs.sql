-- QA Command Center — lightweight test run log
-- Standalone execution history attached directly to a test case (result +
-- build label + who + when), ahead of the full Builds/Test Plans/Execution
-- pipeline (Phase 3). Append-only, same philosophy as test_case_versions:
-- no update/delete policy, a bad entry just gets corrected by logging a new
-- one.

create type test_case_run_result as enum ('passed', 'failed', 'blocked');

create table test_case_runs (
  id uuid primary key default gen_random_uuid(),
  test_case_id uuid not null references test_cases (id) on delete cascade,
  result test_case_run_result not null,
  build_label text not null,
  tested_by uuid not null references profiles (id),
  tested_at timestamptz not null default now()
);

create index test_case_runs_test_case_id_idx on test_case_runs (test_case_id);

alter table test_case_runs enable row level security;

-- any project member can view (same as test_cases_select_member)
create policy test_case_runs_select_member on test_case_runs
  for select to authenticated
  using (is_project_member(test_case_project_id(test_case_id)));

-- producer/qa_lead/tester can log — not viewer
create policy test_case_runs_insert_tester on test_case_runs
  for insert to authenticated
  with check (
    current_app_role() in ('producer', 'qa_lead', 'tester')
    and is_project_member(test_case_project_id(test_case_id))
  );

-- no update/delete policy — append-only
