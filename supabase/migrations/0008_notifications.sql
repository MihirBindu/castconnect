-- ============================================================
-- CastConnect — Notifications
-- Recipient-owned rows created by SECURITY DEFINER triggers on the source
-- events (new message, application status change, new follower).
-- Already applied to the live project via MCP.
-- ============================================================

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,  -- recipient
  type       text not null,                                                   -- message | application_status | follow
  actor_id   uuid references public.profiles(id) on delete set null,          -- who triggered it
  entity_id  uuid,                                                            -- related entity (message / call / …)
  title      text not null default '',
  body       text not null default '',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
-- Recipient can read/mark-read/delete their own. Only triggers insert.
drop policy if exists "notifications_select" on public.notifications;
drop policy if exists "notifications_update" on public.notifications;
drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_select" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_update" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_delete" on public.notifications for delete using (auth.uid() = user_id);

create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.receiver_id is not null and new.receiver_id <> new.sender_id then
    insert into public.notifications (user_id, type, actor_id, entity_id, title, body)
    values (new.receiver_id, 'message', new.sender_id, new.id, 'New message',
      coalesce((select name from public.profiles where id = new.sender_id), 'Someone') || ' sent you a message');
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message after insert on public.messages
  for each row execute function public.notify_on_message();

create or replace function public.notify_on_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (user_id, type, entity_id, title, body)
    values (new.applicant_id, 'application_status', new.casting_call_id, 'Application update',
      'Your application for "' ||
      coalesce((select title from public.casting_calls where id = new.casting_call_id), 'a casting call') ||
      '" is now ' || new.status);
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_on_application_status on public.applications;
create trigger trg_notify_on_application_status after update on public.applications
  for each row execute function public.notify_on_application_status();

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.follower_id <> new.following_id then
    insert into public.notifications (user_id, type, actor_id, title, body)
    values (new.following_id, 'follow', new.follower_id, 'New follower',
      coalesce((select name from public.profiles where id = new.follower_id), 'Someone') || ' started following you');
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_on_follow on public.connections;
create trigger trg_notify_on_follow after insert on public.connections
  for each row execute function public.notify_on_follow();
