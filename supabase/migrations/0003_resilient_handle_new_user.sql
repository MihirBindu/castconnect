-- ============================================================
-- Fix: "Database error saving new user" on Google (OAuth) sign-in
--
-- GoTrue aborts auth-user creation if the on_auth_user_created trigger
-- (handle_new_user) raises. Any problem creating the profile row — a
-- transient error, a leftover row, a restricted search_path — surfaced
-- to the client as "Database error saving new user".
--
-- This wraps the profile insert so it can never abort sign-up, and pins
-- search_path. The app still creates/completes the profile via upsert
-- during onboarding, so nothing else changes.
--
-- Safe to re-run (CREATE OR REPLACE). Only touches handle_new_user.
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, name, contact_email, auth_provider)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
      coalesce(new.email, ''),
      coalesce(new.raw_app_meta_data->>'provider', 'email')
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: profile insert skipped for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;
