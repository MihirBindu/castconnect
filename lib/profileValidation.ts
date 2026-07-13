import {
  BODY_TYPE_OPTIONS,
  COMPLEXION_OPTIONS,
  BodyType,
  Complexion,
} from './types';

// ── Constants (keep in sync with supabase/schema.sql constraints) ─────────────
export const NAME_MIN = 2;
export const NAME_MAX = 100;
export const AGE_MIN = 18;
export const AGE_MAX = 100;
export const HEIGHT_CM_MIN = 90;
export const HEIGHT_CM_MAX = 250;
export const FEET_MIN = 3;
export const FEET_MAX = 8;
export const INCHES_MIN = 0;
export const INCHES_MAX = 11;

// Allowed name characters: unicode letters + marks, spaces, hyphen, apostrophe.
// Must also contain at least one real letter (rejects "---" or "  ").
// Built defensively: some JS engines (older Hermes) don't support Unicode
// property escapes, so we fall back to a Latin range instead of crashing.
function safeRegex(pattern: string, flags: string, fallback: RegExp): RegExp {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return fallback;
  }
}
const NAME_ALLOWED = safeRegex("^[\\p{L}\\p{M} '’-]+$", 'u', /^[A-Za-zÀ-ÿ '’-]+$/);
const NAME_HAS_LETTER = safeRegex('\\p{L}', 'u', /[A-Za-zÀ-ÿ]/);

// ── Field validators — each returns an error message string or null ───────────

export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (!name) return 'Please enter your full name.';
  if (name.length < NAME_MIN) return `Name must be at least ${NAME_MIN} characters.`;
  if (name.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer.`;
  if (!NAME_HAS_LETTER.test(name) || !NAME_ALLOWED.test(name)) {
    return 'Please enter a valid name using letters only.';
  }
  return null;
}

/** Parses raw age text to an integer, or null if it isn't a valid whole number. */
export function parseAge(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return parseInt(trimmed, 10);
}

export function validateAge(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return `Please enter a valid age between ${AGE_MIN} and ${AGE_MAX}.`;
  if (!/^\d+$/.test(trimmed)) {
    return 'Please enter your age as a whole number (no letters, decimals or symbols).';
  }
  const age = parseInt(trimmed, 10);
  if (age < AGE_MIN || age > AGE_MAX) {
    return `Please enter a valid age between ${AGE_MIN} and ${AGE_MAX}.`;
  }
  return null;
}

/** Converts feet + inches to whole centimetres. */
export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

/**
 * Validates height in feet/inches mode. Returns { error, cm }.
 * `cm` is only meaningful when error is null.
 */
export function validateHeightFeet(feetRaw: string, inchesRaw: string): { error: string | null; cm: number | null } {
  const invalid = { error: 'Please enter a valid height.', cm: null };
  const f = feetRaw.trim();
  const i = inchesRaw.trim();
  if (!/^\d+$/.test(f) || !/^\d+$/.test(i)) return invalid;
  const feet = parseInt(f, 10);
  const inches = parseInt(i, 10);
  if (feet < FEET_MIN || feet > FEET_MAX) {
    return { error: `Feet must be between ${FEET_MIN} and ${FEET_MAX}.`, cm: null };
  }
  if (inches < INCHES_MIN || inches > INCHES_MAX) {
    return { error: `Inches must be between ${INCHES_MIN} and ${INCHES_MAX}.`, cm: null };
  }
  const cm = feetInchesToCm(feet, inches);
  if (cm < HEIGHT_CM_MIN || cm > HEIGHT_CM_MAX) return invalid;
  return { error: null, cm };
}

/** Validates height in centimetres mode. Returns { error, cm }. */
export function validateHeightCm(raw: string): { error: string | null; cm: number | null } {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { error: 'Please enter a valid height.', cm: null };
  const cm = parseInt(trimmed, 10);
  if (cm < HEIGHT_CM_MIN || cm > HEIGHT_CM_MAX) {
    return { error: `Please enter a height between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.`, cm: null };
  }
  return { error: null, cm };
}

export function validateBodyType(value: BodyType | null): string | null {
  if (!value || !BODY_TYPE_OPTIONS.includes(value)) return 'Please select your body type.';
  return null;
}

export function validateComplexion(value: Complexion | null): string | null {
  if (!value || !COMPLEXION_OPTIONS.includes(value)) return 'Please select your complexion.';
  return null;
}

/** Converts whole cm back to feet + inches for prefill in feet/inches mode. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}
