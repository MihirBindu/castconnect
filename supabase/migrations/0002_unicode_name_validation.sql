-- ============================================================
-- Fix: Unicode name validation in set_profile_completion
--
-- Client (lib/profileValidation.ts) accepts Unicode letters via \p{L}.
-- The previous trigger used POSIX [[:alpha:]], which on many Postgres
-- locales only matches ASCII — so "José" passed client validation but
-- left profile_completed = false.
--
-- Safe to re-run (CREATE OR REPLACE).
-- Run in Supabase: SQL Editor → New query → paste → Run.
-- ============================================================

create or replace function public.set_profile_completion()
returns trigger language plpgsql as $$
declare
  v_name text := btrim(coalesce(new.name, ''));
begin
  new.name := v_name;
  new.updated_at := now();

  -- Keep in sync with lib/profileValidation.ts.
  -- Explicit ranges: Latin-1 letters (excl. ×÷), Latin Extended-A,
  -- combining marks, Devanagari; plus spaces, hyphen, ' / ’.
  new.profile_completed :=
        char_length(v_name) between 2 and 100
    and v_name ~ E'[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF\\u0100-\\u017F\\u0900-\\u097F]'
    and v_name ~ E'^[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF\\u0100-\\u017F\\u0300-\\u036F\\u0900-\\u097F[:space:]''\\u2019-]+$'
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
