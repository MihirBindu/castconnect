-- ============================================================
-- CastConnect — Profile-view analytics
-- One row per (viewer, viewed) pair; upserted so created_at is the last view.
-- The viewed user sees who viewed them. Already applied via MCP.
-- ============================================================

create table if not exists public.profile_views (
  viewer_id  uuid not null references public.profiles(id) on delete cascade,
  viewed_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, viewed_id)
);
create index if not exists profile_views_viewed_idx on public.profile_views (viewed_id, created_at desc);

alter table public.profile_views enable row level security;
drop policy if exists "profile_views_select" on public.profile_views;
drop policy if exists "profile_views_insert" on public.profile_views;
drop policy if exists "profile_views_update" on public.profile_views;
create policy "profile_views_select" on public.profile_views for select using (auth.uid() = viewed_id);
create policy "profile_views_insert" on public.profile_views for insert with check (auth.uid() = viewer_id and viewer_id <> viewed_id);
create policy "profile_views_update" on public.profile_views for update using (auth.uid() = viewer_id);
