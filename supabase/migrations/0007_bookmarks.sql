-- ============================================================
-- CastConnect — Bookmarks (saved casting calls)
-- Owner-scoped; PK makes a repeated save idempotent (23505).
-- Already applied to the live project via MCP.
-- ============================================================

create table if not exists public.bookmarks (
  user_id         uuid not null references public.profiles(id) on delete cascade,
  casting_call_id uuid not null references public.casting_calls(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (user_id, casting_call_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_select" on public.bookmarks;
drop policy if exists "bookmarks_insert" on public.bookmarks;
drop policy if exists "bookmarks_delete" on public.bookmarks;

create policy "bookmarks_select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on public.bookmarks for delete using (auth.uid() = user_id);
