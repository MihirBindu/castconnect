-- ============================================================
-- CastConnect — Saved searches (Discover filter presets)
-- Owner-scoped. Already applied to the live project via MCP.
-- ============================================================

create table if not exists public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null default '',
  filters    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists saved_searches_user_idx on public.saved_searches (user_id, created_at desc);

alter table public.saved_searches enable row level security;
drop policy if exists "saved_searches_select" on public.saved_searches;
drop policy if exists "saved_searches_insert" on public.saved_searches;
drop policy if exists "saved_searches_delete" on public.saved_searches;
create policy "saved_searches_select" on public.saved_searches for select using (auth.uid() = user_id);
create policy "saved_searches_insert" on public.saved_searches for insert with check (auth.uid() = user_id);
create policy "saved_searches_delete" on public.saved_searches for delete using (auth.uid() = user_id);
