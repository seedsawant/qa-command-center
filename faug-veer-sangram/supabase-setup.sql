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

-- Table privileges for the Data API. Row-level security (the policies below) still
-- decides who can actually read or write rows; these grants just let the API reach
-- the table, which is needed if "automatically expose new tables" is turned off.
grant select on public.fvs_state to anon, authenticated;
grant insert, update, delete on public.fvs_state to authenticated;

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


-- ---------------------------------------------------------------------------
-- OPTIONAL: live "watching" count for the admin bar. Run this once as well.
--   * every visitor reports in with a random anonymous id (no names, nothing personal)
--   * only the admin email can read the count
--   * the table cannot be read or written directly, only through the two functions
-- ---------------------------------------------------------------------------
create table if not exists public.fvs_presence (
  viewer    uuid primary key,
  last_seen timestamptz not null default now()
);
alter table public.fvs_presence enable row level security;   -- no policies: nobody can touch it directly
revoke all on public.fvs_presence from anon, authenticated;

create or replace function public.fvs_heartbeat(v uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into fvs_presence (viewer, last_seen) values (v, now())
  on conflict (viewer) do update set last_seen = now();
  -- keep the table small: now and then forget viewers not seen for 10 minutes
  if random() < 0.05 then
    delete from fvs_presence where last_seen < now() - interval '10 minutes';
  end if;
end $$;
revoke all on function public.fvs_heartbeat(uuid) from public;
grant execute on function public.fvs_heartbeat(uuid) to anon, authenticated;

create or replace function public.fvs_viewer_count() returns integer
language plpgsql security definer set search_path = public as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'siddhesh@dot9games.com' then   -- ADMIN_EMAIL
    return null;
  end if;
  return (select count(*)::int from fvs_presence where last_seen > now() - interval '75 seconds');
end $$;
revoke all on function public.fvs_viewer_count() from public;
grant execute on function public.fvs_viewer_count() to authenticated;
