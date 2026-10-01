-- FAUG VEER SANGRAM — live results table
--
-- Run this ONCE in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- (Use a project that is only for this tournament; see the notes in the README/chat.)
--
-- What it sets up
--   * one table, fvs_state, holding a single JSON document with teams + match results
--   * everyone can READ it (the public bracket page)
--   * only the admin email below can WRITE it (enforced here, not in the web page)
--
-- Before running: change ADMIN_EMAIL (two places) if the admin uses a different address.

create table if not exists public.fvs_state (
  id         text primary key,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.fvs_state enable row level security;

drop policy if exists "anyone can read bracket" on public.fvs_state;
create policy "anyone can read bracket"
  on public.fvs_state
  for select
  to anon, authenticated
  using (true);

drop policy if exists "admin can write bracket" on public.fvs_state;
create policy "admin can write bracket"
  on public.fvs_state
  for all
  to authenticated
  using      ((auth.jwt() ->> 'email') = 'siddhesh@dot9games.com')   -- ADMIN_EMAIL
  with check ((auth.jwt() ->> 'email') = 'siddhesh@dot9games.com');  -- ADMIN_EMAIL

-- The row the page reads. Empty data means "use the defaults in script.js".
insert into public.fvs_state (id) values ('bracket') on conflict (id) do nothing;

-- After running this:
--   1. Authentication -> Users -> Add user: create the admin (the email above) with a strong password.
--   2. Authentication -> Sign In / Providers (or Settings): turn OFF "Allow new users to sign up".
--   3. Project Settings -> API: copy the Project URL and the anon / publishable key into
--      CONFIG.supabase in script.js. Never copy the service_role key anywhere.
