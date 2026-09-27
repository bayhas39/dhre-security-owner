-- DHRE dashboard — shared state for cross-device sync
-- Run once in Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent.

-- 1. One row per collection (sites / incidents / accidents).
create table if not exists public.dhre_state (
  collection   text primary key,
  payload      jsonb        not null default '[]'::jsonb,
  rev          bigint       not null default 0,
  updated_at   timestamptz  not null default now()
);

-- 2. Realtime needs the table added to its publication.
--    Without this, cross-device updates only arrive on page reload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dhre_state'
  ) then
    alter publication supabase_realtime add table public.dhre_state;
  end if;
end $$;

-- 3. Row Level Security.
--    The dashboard uses the public anon key, so without a policy every read and
--    write is rejected. This project is a single-tenant internal tool, so we
--    allow anon access and rely on obscurity of the URL for gating.
--
--    TIGHTEN THIS BEFORE ANY PUBLIC LAUNCH: replace `to anon` with a check on
--    an authenticated role, e.g.
--      create policy "authenticated only" on public.dhre_state
--        for all to authenticated using (auth.role() = 'authenticated');
alter table public.dhre_state enable row level security;

drop policy if exists "dhre_state_anon_all" on public.dhre_state;
create policy "dhre_state_anon_all" on public.dhre_state
  for all to anon
  using (true)
  with check (true);

-- 4. Keep updated_at honest.
create or replace function public.touch_dhre_state()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dhre_state_touch on public.dhre_state;
create trigger dhre_state_touch
  before update on public.dhre_state
  for each row execute function public.touch_dhre_state();

-- Optional: verify it worked.
-- select collection, rev, updated_at from public.dhre_state;
