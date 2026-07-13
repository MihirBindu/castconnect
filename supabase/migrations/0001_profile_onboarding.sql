-- ============================================================
-- CastConnect — Profile Onboarding migration
-- Adds the "Complete Your Profile" fields + server-side validation.
-- Safe to run on an existing database (all statements are idempotent).
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. New columns on profiles
--    (contact_email already stores the user's email; name stores fullName)
-- ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists age               int,
  add column if not exists height_cm         int,
  add column if not exists body_type         text,
  add column if not exists custom_body_type  text        not null default '',
  add column if not exists complexion        text,
  add column if not exists custom_complexion text        not null default '',
  add column if not exists auth_provider     text        not null default 'email',
  add column if not exists profile_completed boolean     not null default false,
  add column if not exists updated_at        timestamptz not null default now();

-- ────────────────────────────────────────────────────────────
-- 2. Hard bounds — reject impossible values regardless of client
-- ────────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_age_chk;
alter table public.profiles
  add constraint profiles_age_chk check (age is null or (age between 18 and 100));

alter table public.profiles drop constraint if exists profiles_height_chk;
alter table public.profiles
  add constraint profiles_height_chk check (height_cm is null or (height_cm between 90 and 250));

alter table public.profiles drop constraint if exists profiles_body_type_chk;
alter table public.profiles
  add constraint profiles_body_type_chk check (
    body_type is null or body_type in (
      'Slim','Athletic','Average','Muscular','Curvy',
      'Plus Size','Broad','Petite','Prefer Not to Say','Other'
    )
  );

alter table public.profiles drop constraint if exists profiles_complexion_chk;
alter table public.profiles
  add constraint profiles_complexion_chk check (
    complexion is null or complexion in (
      'Very Fair','Fair','Light','Wheatish','Medium','Olive',
      'Dusky','Brown','Dark','Deep','Prefer Not to Say','Other'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. Server-authoritative completion + normalisation
--    profile_completed is recomputed on every write, so a client can
--    never mark itself complete with invalid or missing data.
-- ────────────────────────────────────────────────────────────
create or replace function public.set_profile_completion()
returns trigger language plpgsql as $$
declare
  v_name text := btrim(coalesce(new.name, ''));
begin
  -- Normalise the stored name (collapse to trimmed value) and bump updated_at.
  new.name := v_name;
  new.updated_at := now();

  new.profile_completed :=
        char_length(v_name) between 2 and 100
    and v_name ~ '[[:alpha:]]'                       -- must contain a real letter
    and v_name ~ '^[[:alpha:][:space:]''-]+$'        -- letters, spaces, hyphen, apostrophe
    and new.age is not null       and new.age between 18 and 100
    and new.height_cm is not null and new.height_cm between 90 and 250
    and coalesce(new.body_type, '') in (
      'Slim','Athletic','Average','Muscular','Curvy',
      'Plus Size','Broad','Petite','Prefer Not to Say','Other'
    )
    and coalesce(new.complexion, '') in (
      'Very Fair','Fair','Light','Wheatish','Medium','Olive',
      'Dusky','Brown','Dark','Deep','Prefer Not to Say','Other'
    );

  return new;
end;
$$;

drop trigger if exists trg_set_profile_completion on public.profiles;
create trigger trg_set_profile_completion
  before insert or update on public.profiles
  for each row execute function public.set_profile_completion();

-- ────────────────────────────────────────────────────────────
-- 4. Refresh handle_new_user so a fresh profile row records the auth
--    provider and the Google display name, and never duplicates a row
--    (e.g. when the same verified email links a second identity).
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, contact_email, auth_provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
