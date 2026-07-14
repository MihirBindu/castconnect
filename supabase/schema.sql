-- ============================================================
-- CastConnect — Supabase Database Schema
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- PROFILES
-- One row per auth.users entry, created via trigger on sign-up
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  name             text not null default '',
  role             text not null default 'talent' check (role in ('talent', 'producer', 'casting_director')),
  title            text not null default '',
  crew_role        text not null default 'Actor',
  bio              text not null default '',
  skills           text[] not null default '{}',
  experience       text not null default '',
  experience_years int  not null default 0,
  location         text not null default '',
  availability     text not null default 'available' check (availability in ('available', 'busy', 'not_available')),
  portfolio_links  text[] not null default '{}',
  profile_image    text,
  contact_email    text not null default '',
  contact_phone    text not null default '',
  is_verified      boolean not null default false,
  industry_types   text[] not null default '{}',
  day_rate         int  not null default 0,
  rating           numeric(3,2) not null default 0,
  review_count     int  not null default 0,
  created_at       timestamptz not null default now(),

  -- ── Onboarding / "Complete Your Profile" fields ──
  age               int,
  height_cm         int,
  body_type         text,
  custom_body_type  text        not null default '',
  complexion        text,
  custom_complexion text        not null default '',
  auth_provider     text        not null default 'email',
  profile_completed boolean     not null default false,
  updated_at        timestamptz not null default now(),

  -- ── Professional Profile onboarding fields ──
  roles                          text[]  not null default '{}',
  custom_roles                   text[]  not null default '{}',
  primary_role                   text,
  experience_level               text,
  year_started                   int,
  languages                      jsonb   not null default '[]'::jsonb,
  work_preferences               text[]  not null default '{}',
  availability_status            text,
  professional_profile_completed boolean not null default false,
  onboarding_status              text    not null default 'PERSONAL_PROFILE_PENDING',

  -- ── Portfolio onboarding fields (step 3) ──
  profile_photo       jsonb,
  portfolio_photos    jsonb   not null default '[]'::jsonb,
  audition_reels      jsonb   not null default '[]'::jsonb,
  showreels           jsonb   not null default '[]'::jsonb,
  notable_work        jsonb   not null default '[]'::jsonb,
  awards              jsonb   not null default '[]'::jsonb,
  portfolio_submitted boolean not null default false,
  portfolio_completed boolean not null default false,

  constraint profiles_age_chk        check (age is null or (age between 18 and 100)),
  constraint profiles_height_chk     check (height_cm is null or (height_cm between 90 and 250)),
  constraint profiles_body_type_chk  check (
    body_type is null or body_type in (
      'Slim','Athletic','Average','Muscular','Curvy',
      'Plus Size','Broad','Petite','Prefer Not to Say','Other'
    )
  ),
  constraint profiles_complexion_chk check (
    complexion is null or complexion in (
      'Very Fair','Fair','Light','Wheatish','Medium','Olive',
      'Dusky','Brown','Dark','Deep','Prefer Not to Say','Other'
    )
  ),
  constraint profiles_year_started_chk check (
    year_started is null or (year_started between 1900 and 2100)
  ),
  constraint profiles_onboarding_status_chk check (
    onboarding_status in (
      'PERSONAL_PROFILE_PENDING','PROFESSIONAL_PROFILE_PENDING',
      'PORTFOLIO_PENDING','PORTFOLIO_PROCESSING','COMPLETED'
    )
  )
);

-- Auto-create a profile row when a new user signs up. Records the auth
-- provider + Google display name and never duplicates a row. The insert is
-- wrapped so a profile-side problem can never abort auth sign-up ("Database
-- error saving new user") — onboarding creates/completes the row via upsert.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- profile_completed is recomputed server-side on every write, so a client can
-- never mark itself complete with invalid or missing data. Also trims name
-- and bumps updated_at.
create or replace function public.set_profile_completion()
returns trigger language plpgsql as $$
declare
  v_name text := btrim(coalesce(new.name, ''));
begin
  new.name := v_name;
  new.updated_at := now();

  new.profile_completed :=
        char_length(v_name) between 2 and 100
    and v_name ~ '[[:alpha:]]'
    and v_name ~ '^[[:alpha:][:space:]''-]+$'
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

-- professional_profile_completed + onboarding_status are recomputed
-- server-side on every write. Named "trg_zz_" so it fires AFTER
-- trg_set_profile_completion (BEFORE triggers run in name order), so
-- new.profile_completed is already set when we derive onboarding_status.
-- Kept separate from set_profile_completion so the two steps don't entangle.
create or replace function public.set_onboarding_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_bio         text := btrim(coalesce(new.bio, ''));
  v_role_count  int  := coalesce(array_length(new.roles, 1), 0);
  v_custom_ok   boolean := coalesce(array_length(new.custom_roles, 1), 0) >= 1;
  v_has_other   boolean := 'Other' = any(coalesce(new.roles, '{}'::text[]));
begin
  new.professional_profile_completed :=
        v_role_count >= 1
    and (not v_has_other or v_custom_ok)
    and new.primary_role is not null
    and new.primary_role = any(new.roles)
    and coalesce(new.experience_level, '') in (
      'Fresher','Less than 1 year','1–2 years','2–5 years',
      '5–10 years','More than 10 years','Prefer Not to Say'
    )
    and char_length(v_bio) between 50 and 1000
    and v_bio ~ '[[:alpha:]]';

  -- Portfolio is complete only when explicitly submitted AND a valid photo exists
  -- (a draft save must never finish onboarding).
  new.portfolio_completed :=
        coalesce(new.portfolio_submitted, false)
    and new.profile_photo is not null
    and coalesce(new.profile_photo->>'url', '') <> ''
    and coalesce(new.profile_photo->>'status', 'COMPLETED') = 'COMPLETED';

  new.onboarding_status :=
    case
      when not coalesce(new.profile_completed, false) then 'PERSONAL_PROFILE_PENDING'
      when not new.professional_profile_completed     then 'PROFESSIONAL_PROFILE_PENDING'
      when not new.portfolio_completed                then 'PORTFOLIO_PENDING'
      else 'COMPLETED'
    end;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_zz_onboarding_status on public.profiles;
create trigger trg_zz_onboarding_status
  before insert or update on public.profiles
  for each row execute function public.set_onboarding_status();

-- ────────────────────────────────────────────────────────────
-- CONNECTIONS (many-to-many)
-- ────────────────────────────────────────────────────────────
create table if not exists public.connections (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id)
);

-- ────────────────────────────────────────────────────────────
-- CASTING CALLS
-- ────────────────────────────────────────────────────────────
create table if not exists public.casting_calls (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null default '',
  role_needed      text not null default '',
  project_type     text not null default 'film' check (project_type in ('film','ott','ad_film','theatre','music_video','web_series')),
  project_name     text not null default '',
  location         text not null default '',
  compensation     text not null default '',
  deadline         date not null,
  posted_by        uuid not null references public.profiles(id) on delete cascade,
  skills_required  text[] not null default '{}',
  experience_level text not null default '',
  status           text not null default 'open' check (status in ('open', 'closed')),
  applicant_count  int  not null default 0,
  created_at       timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- APPLICATIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  casting_call_id uuid not null references public.casting_calls(id) on delete cascade,
  applicant_id    uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'applied' check (status in ('applied','shortlisted','selected','rejected')),
  note            text not null default '',
  applied_at      timestamptz not null default now(),
  unique (casting_call_id, applicant_id)
);

-- Increment applicant_count on new application
create or replace function public.increment_applicant_count()
returns trigger language plpgsql security definer as $$
begin
  update public.casting_calls set applicant_count = applicant_count + 1 where id = new.casting_call_id;
  return new;
end;
$$;

drop trigger if exists on_application_created on public.applications;
create trigger on_application_created
  after insert on public.applications
  for each row execute procedure public.increment_applicant_count();

-- ────────────────────────────────────────────────────────────
-- MESSAGES
-- ────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- CREW BASKETS
-- ────────────────────────────────────────────────────────────
create table if not exists public.crew_baskets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  project_name text not null default 'My Production',
  created_at   timestamptz not null default now()
);

create table if not exists public.crew_basket_items (
  id            uuid primary key default gen_random_uuid(),
  basket_id     uuid not null references public.crew_baskets(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  assigned_role text not null,
  added_at      timestamptz not null default now(),
  unique (basket_id, profile_id)
);

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

alter table public.profiles          enable row level security;
alter table public.connections       enable row level security;
alter table public.casting_calls     enable row level security;
alter table public.applications      enable row level security;
alter table public.messages          enable row level security;
alter table public.crew_baskets      enable row level security;
alter table public.crew_basket_items enable row level security;

-- profiles: anyone can read, only owner can write
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- connections: anyone can read, authenticated users can manage their own
create policy "connections_select" on public.connections for select using (true);
create policy "connections_insert" on public.connections for insert with check (auth.uid() = follower_id);
create policy "connections_delete" on public.connections for delete using (auth.uid() = follower_id);

-- casting_calls: anyone can read, owner can write
create policy "casting_calls_select" on public.casting_calls for select using (true);
create policy "casting_calls_insert" on public.casting_calls for insert with check (auth.uid() = posted_by);
create policy "casting_calls_update" on public.casting_calls for update using (auth.uid() = posted_by);
create policy "casting_calls_delete" on public.casting_calls for delete using (auth.uid() = posted_by);

-- applications: applicant + casting call owner can read, applicant inserts
create policy "applications_select" on public.applications for select
  using (
    auth.uid() = applicant_id or
    auth.uid() = (select posted_by from public.casting_calls where id = casting_call_id)
  );
create policy "applications_insert" on public.applications for insert with check (auth.uid() = applicant_id);
create policy "applications_update" on public.applications for update
  using (auth.uid() = (select posted_by from public.casting_calls where id = casting_call_id));

-- messages: sender or receiver can read, sender inserts
create policy "messages_select" on public.messages for select using (auth.uid() in (sender_id, receiver_id));
create policy "messages_insert" on public.messages for insert with check (auth.uid() = sender_id);
create policy "messages_update" on public.messages for update using (auth.uid() = receiver_id);

-- crew baskets: owner only
create policy "crew_baskets_select" on public.crew_baskets for select using (auth.uid() = owner_id);
create policy "crew_baskets_insert" on public.crew_baskets for insert with check (auth.uid() = owner_id);
create policy "crew_baskets_update" on public.crew_baskets for update using (auth.uid() = owner_id);
create policy "crew_baskets_delete" on public.crew_baskets for delete using (auth.uid() = owner_id);

create policy "crew_basket_items_select" on public.crew_basket_items for select
  using (auth.uid() = (select owner_id from public.crew_baskets where id = basket_id));
create policy "crew_basket_items_insert" on public.crew_basket_items for insert
  with check (auth.uid() = (select owner_id from public.crew_baskets where id = basket_id));
create policy "crew_basket_items_delete" on public.crew_basket_items for delete
  using (auth.uid() = (select owner_id from public.crew_baskets where id = basket_id));

-- ────────────────────────────────────────────────────────────
-- STORAGE — portfolio media (see supabase/migrations/0005_portfolio.sql)
--   portfolio-media : PUBLIC showcase images (profile photo, portfolio photos)
--   portfolio-docs  : PRIVATE award documents (served via signed URLs)
-- Owner-scoped writes; path convention {userId}/{kind}/{uuid}.{ext}.
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portfolio-media', 'portfolio-media', true, 10485760,
     array['image/jpeg','image/png','image/webp']),
  ('portfolio-docs', 'portfolio-docs', false, 15728640,
     array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio_media_insert" on storage.objects;
drop policy if exists "portfolio_media_update" on storage.objects;
drop policy if exists "portfolio_media_delete" on storage.objects;
drop policy if exists "portfolio_docs_rw"      on storage.objects;

create policy "portfolio_media_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio_media_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio_media_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "portfolio_docs_rw"
  on storage.objects for all to authenticated
  using (bucket_id = 'portfolio-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'portfolio-docs' and (storage.foldername(name))[1] = auth.uid()::text);
