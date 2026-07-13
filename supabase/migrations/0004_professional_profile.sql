-- ============================================================
-- CastConnect — Professional Profile onboarding (step 2)
-- Adds professional fields + a server-authoritative onboarding_status.
-- Safe to run on an existing database (idempotent).
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. New columns
--    (bio + skills already exist and are reused for professional data)
-- ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists roles                          text[]  not null default '{}',
  add column if not exists custom_roles                   text[]  not null default '{}',
  add column if not exists primary_role                   text,
  add column if not exists experience_level               text,
  add column if not exists year_started                   int,
  add column if not exists languages                      jsonb   not null default '[]'::jsonb,
  add column if not exists work_preferences               text[]  not null default '{}',
  add column if not exists availability_status            text,
  add column if not exists professional_profile_completed boolean not null default false,
  add column if not exists onboarding_status              text    not null default 'PERSONAL_PROFILE_PENDING';

-- ────────────────────────────────────────────────────────────
-- 2. Constraints
-- ────────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_year_started_chk;
alter table public.profiles
  add constraint profiles_year_started_chk check (
    year_started is null or (year_started between 1900 and 2100)
  );

alter table public.profiles drop constraint if exists profiles_onboarding_status_chk;
alter table public.profiles
  add constraint profiles_onboarding_status_chk check (
    onboarding_status in (
      'PERSONAL_PROFILE_PENDING','PROFESSIONAL_PROFILE_PENDING','PORTFOLIO_PENDING','COMPLETED'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. Server-authoritative professional completion + onboarding_status
--    Named "trg_zz_" so it fires AFTER trg_set_profile_completion
--    (BEFORE row triggers run in trigger-name order), so
--    new.profile_completed is set before we derive onboarding_status.
-- ────────────────────────────────────────────────────────────
create or replace function public.set_onboarding_status()
returns trigger language plpgsql as $$
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

  new.onboarding_status :=
    case
      when not coalesce(new.profile_completed, false) then 'PERSONAL_PROFILE_PENDING'
      when not new.professional_profile_completed     then 'PROFESSIONAL_PROFILE_PENDING'
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
-- 4. Backfill existing rows: a no-op update fires the BEFORE triggers,
--    recomputing profile_completed, professional_profile_completed and
--    onboarding_status from current data (so users who already finished
--    the personal step land on PROFESSIONAL_PROFILE_PENDING, not step 1).
-- ────────────────────────────────────────────────────────────
update public.profiles set updated_at = now();
