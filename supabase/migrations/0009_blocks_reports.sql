-- ============================================================
-- CastConnect — Blocking + reports
--  * blocks: owner-scoped; hides a user and (via trigger) prevents messaging
--  * reports: feed a moderation queue reviewed out-of-band (service role)
-- Already applied to the live project via MCP.
-- ============================================================

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists "blocks_select" on public.blocks;
drop policy if exists "blocks_insert" on public.blocks;
drop policy if exists "blocks_delete" on public.blocks;
create policy "blocks_select" on public.blocks for select using (auth.uid() = blocker_id);
create policy "blocks_insert" on public.blocks for insert with check (auth.uid() = blocker_id and blocker_id <> blocked_id);
create policy "blocks_delete" on public.blocks for delete using (auth.uid() = blocker_id);

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null default '',
  details     text not null default '',
  status      text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "reports_insert" on public.reports;
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_insert" on public.reports for insert with check (auth.uid() = reporter_id and reporter_id <> reported_id);
create policy "reports_select_own" on public.reports for select using (auth.uid() = reporter_id);

-- Safety: no messages between a blocked pair (either direction).
create or replace function public.check_message_not_blocked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.blocks
    where (blocker_id = new.sender_id and blocked_id = new.receiver_id)
       or (blocker_id = new.receiver_id and blocked_id = new.sender_id)
  ) then
    raise exception 'You can no longer message this user.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
drop trigger if exists trg_check_message_not_blocked on public.messages;
create trigger trg_check_message_not_blocked before insert on public.messages
  for each row execute function public.check_message_not_blocked();
