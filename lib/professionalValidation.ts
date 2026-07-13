import {
  EXPERIENCE_LEVEL_OPTIONS,
  ExperienceLevel,
} from './types';

// ── Limits (keep in sync with supabase/schema.sql) ────────────────────────────
export const MAX_ROLES = 10;
export const MAX_SKILLS = 20;
export const CUSTOM_ROLE_MIN = 2;
export const CUSTOM_ROLE_MAX = 50;
export const CUSTOM_SKILL_MIN = 2;
export const CUSTOM_SKILL_MAX = 40;
export const BIO_MIN = 50;
export const BIO_MAX = 1000;

function safeRegex(pattern: string, flags: string, fallback: RegExp): RegExp {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return fallback;
  }
}
// "contains a real letter" — rejects values made only of digits/symbols/emoji.
const HAS_LETTER = safeRegex('\\p{L}', 'u', /[A-Za-zÀ-ɏऀ-ॿ]/);

// ── Roles ─────────────────────────────────────────────────────────────────────

/** Case-insensitive, trimmed key used to dedupe roles/skills. */
export function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function validateCustomRole(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Please enter your professional role.';
  if (v.length < CUSTOM_ROLE_MIN || v.length > CUSTOM_ROLE_MAX) {
    return `Your role must be between ${CUSTOM_ROLE_MIN} and ${CUSTOM_ROLE_MAX} characters.`;
  }
  if (!HAS_LETTER.test(v)) return 'Please enter a valid professional role.';
  return null;
}

/**
 * Validates the role selection. `roles` is the list of selected predefined
 * roles (may include "Other"); `customRole` is the free-text value shown when
 * "Other" is selected.
 */
export function validateRoles(roles: string[], customRole: string): string | null {
  if (roles.length === 0) return 'Please select at least one professional role.';
  if (roles.length > MAX_ROLES) return `You can select up to ${MAX_ROLES} roles.`;
  if (roles.includes('Other')) {
    const customErr = validateCustomRole(customRole);
    if (customErr) return customErr;
  }
  return null;
}

/**
 * The concrete role values a primary can be chosen from and that get saved:
 * predefined roles except the "Other" placeholder, plus the custom role text.
 */
export function resolvedRoleValues(roles: string[], customRole: string): string[] {
  const values = roles.filter((r) => r !== 'Other');
  if (roles.includes('Other') && customRole.trim()) values.push(customRole.trim());
  // De-dupe case-insensitively, keeping first occurrence.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = normalizeKey(v);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

export function validatePrimaryRole(primaryRole: string | null, resolvedRoles: string[]): string | null {
  if (resolvedRoles.length <= 1) return null; // auto-selected when there's only one
  if (!primaryRole) return 'Please select your primary profession.';
  if (!resolvedRoles.some((r) => normalizeKey(r) === normalizeKey(primaryRole))) {
    return 'Please select your primary profession.';
  }
  return null;
}

// ── Experience ─────────────────────────────────────────────────────────────────

export function validateExperienceLevel(level: ExperienceLevel | null): string | null {
  if (!level || !EXPERIENCE_LEVEL_OPTIONS.includes(level)) return 'Please select your experience level.';
  return null;
}

function expectedYearsRange(level: ExperienceLevel | null): [number, number] | null {
  switch (level) {
    case 'Fresher':
    case 'Less than 1 year':
      return [0, 1];
    case '1–2 years':
      return [1, 2];
    case '2–5 years':
      return [2, 5];
    case '5–10 years':
      return [5, 10];
    case 'More than 10 years':
      return [10, 100];
    default:
      return null; // Prefer Not to Say / none
  }
}

/** Returns { error, warning } for the optional Year Started field. */
export function validateYearStarted(
  year: number | null,
  level: ExperienceLevel | null,
  currentYear: number,
): { error: string | null; warning: string | null } {
  if (year == null) return { error: null, warning: null };
  if (!Number.isInteger(year)) return { error: 'Please enter a valid year.', warning: null };
  if (year > currentYear) return { error: 'The start year cannot be in the future.', warning: null };
  if (year < 1900) return { error: 'Please enter a realistic year.', warning: null };

  const range = expectedYearsRange(level);
  if (range) {
    const years = currentYear - year;
    const [min, max] = range;
    if (years < min - 1 || (max < 100 && years > max + 3)) {
      return {
        error: null,
        warning: 'The start year doesn’t match your selected experience level. Please verify.',
      };
    }
  }
  return { error: null, warning: null };
}

// ── Bio ────────────────────────────────────────────────────────────────────────

const HTML_OR_SCRIPT = /<[^>]+>|javascript:|<script/i;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(?:\+?\d[\d\s-]{7,}\d)/;

/** Removes HTML tags and collapses whitespace for safe storage. */
export function sanitizeBio(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '') // strip tags
    .replace(/[ \t]+\n/g, '\n') // trailing spaces on lines
    .trim();
}

/** Returns { error, warning }. Warning is non-blocking (e.g. contact info). */
export function validateBio(raw: string): { error: string | null; warning: string | null } {
  const trimmed = raw.trim();

  if (HTML_OR_SCRIPT.test(raw)) {
    return { error: 'Please remove unsupported content from your bio.', warning: null };
  }
  if (trimmed.length < BIO_MIN) {
    return { error: `Your bio must contain at least ${BIO_MIN} characters.`, warning: null };
  }
  if (trimmed.length > BIO_MAX) {
    return { error: `Your bio cannot exceed ${BIO_MAX.toLocaleString()} characters.`, warning: null };
  }
  if (!HAS_LETTER.test(trimmed)) {
    return { error: 'Please add a meaningful description to your bio.', warning: null };
  }
  // Reject a single character repeated (e.g. "aaaaaa…").
  const despaced = trimmed.replace(/\s/g, '');
  if (despaced.length > 0 && /^(.)\1*$/u.test(despaced)) {
    return { error: 'Please add a meaningful description to your bio.', warning: null };
  }

  const warning =
    EMAIL_RE.test(trimmed) || PHONE_RE.test(trimmed)
      ? 'Your bio appears to contain contact details. These will not be shown publicly.'
      : null;

  return { error: null, warning };
}

// ── Skills ───────────────────────────────────────────────────────────────────

export function validateCustomSkill(raw: string, existing: string[]): string | null {
  const v = raw.trim();
  if (!v) return null;
  if (v.length < CUSTOM_SKILL_MIN || v.length > CUSTOM_SKILL_MAX) {
    return `Skills must be between ${CUSTOM_SKILL_MIN} and ${CUSTOM_SKILL_MAX} characters.`;
  }
  if (existing.some((s) => normalizeKey(s) === normalizeKey(v))) {
    return 'You have already added that skill.';
  }
  if (existing.length >= MAX_SKILLS) return `You can add up to ${MAX_SKILLS} skills.`;
  return null;
}
