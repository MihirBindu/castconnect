-- ============================================================
-- CastConnect — Portfolio onboarding (step 3)
-- Storage buckets + RLS, portfolio columns, onboarding_status stage.
-- Safe to run on an existing database (idempotent).
-- Already applied to the live project via MCP; kept here as the record.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Storage buckets
--    portfolio-media : PUBLIC showcase images (profile photo, portfolio photos)
--    portfolio-docs  : PRIVATE award supporting documents (served via signed URLs)
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

-- Owner-scoped access. Path convention: {userId}/{kind}/{uuid}.{ext}
-- Note: no SELECT policy on the public bucket — public objects are served via
-- their public URL without RLS, and omitting it prevents file enumeration.
drop policy if exists "portfolio_media_read"   on storage.objects;
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

-- ────────────────────────────────────────────────────────────
-- 2. Portfolio columns (jsonb; bio/skills already store professional data)
-- ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists profile_photo       jsonb,
  add column if not exists portfolio_photos    jsonb   not null default '[]'::jsonb,
  add column if not exists audition_reels      jsonb   not null default '[]'::jsonb,
  add column if not exists showreels           jsonb   not null default '[]'::jsonb,
  add column if not exists notable_work        jsonb   not null default '[]'::jsonb,
  add column if not exists awards              jsonb   not null default '[]'::jsonb,
  add column if not exists portfolio_submitted boolean not null default false,
  add column if not exists portfolio_completed boolean not null default false;

-- ────────────────────────────────────────────────────────────
-- 3. Allow the PORTFOLIO_PROCESSING status (forward-compat)
-- ────────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_onboarding_status_chk;
alter table public.profiles
  add constraint profiles_onboarding_status_chk check (
    onboarding_status in (
      'PERSONAL_PROFILE_PENDING','PROFESSIONAL_PROFILE_PENDING',
      'PORTFOLIO_PENDING','PORTFOLIO_PROCESSING','COMPLETED'
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4. Recompute professional + portfolio completion and onboarding_status.
--    Portfolio requires a valid, completed profile photo.
-- ────────────────────────────────────────────────────────────
create or replace function public.set_onboarding_status()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_bio        text    := btrim(coalesce(new.bio, ''));
  v_role_count int     := coalesce(array_length(new.roles, 1), 0);
  v_custom_ok  boolean := coalesce(array_length(new.custom_roles, 1), 0) >= 1;
  v_has_other  boolean := 'Other' = any(coalesce(new.roles, '{}'::text[]));
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

  -- Complete only when explicitly submitted AND a valid photo exists
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
-- 5. Backfill: recompute portfolio_completed + onboarding_status.
-- ────────────────────────────────────────────────────────────
update public.profiles set updated_at = now();
