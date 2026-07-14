import { TRUSTED_VIDEO_PLATFORMS } from './types';

// ── Limits (mirror supabase buckets + set_onboarding_status) ──────────────────
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const DOC_MAX_BYTES = 15 * 1024 * 1024; // 15 MB
export const MIN_IMAGE_DIMENSION = 500; // px (recommended)
export const MAX_PORTFOLIO_PHOTOS = 15;
export const MAX_AUDITION_REELS = 10;
export const MAX_SHOWREELS = 10;
export const MAX_NOTABLE_WORK = 25;
export const MAX_AWARDS = 20;
export const CAPTION_MAX = 150;
export const REEL_TITLE_MIN = 2;
export const REEL_TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
export const DOC_MIME_TYPES = ['application/pdf', ...IMAGE_MIME_TYPES];
export const DOC_EXTENSIONS = ['pdf', ...IMAGE_EXTENSIONS];

export const CURRENT_YEAR = new Date().getFullYear();

function extensionOf(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

// ── Image / document files ────────────────────────────────────────────────────
export interface PickedFile {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
}

/** Validates a picked image against type, size, and (when known) resolution. */
export function validateImageFile(file: PickedFile): string | null {
  const ext = extensionOf(file.fileName || file.uri);
  const mime = (file.mimeType || '').toLowerCase();
  if ((ext && !IMAGE_EXTENSIONS.includes(ext)) || (mime && !IMAGE_MIME_TYPES.includes(mime))) {
    return 'This file type is not supported. Use JPG, PNG, or WebP.';
  }
  if (!ext && !mime) return 'This file type is not supported.';
  if (file.fileSize != null && file.fileSize <= 0) return 'This file appears to be empty or corrupted.';
  if (file.fileSize != null && file.fileSize > IMAGE_MAX_BYTES) {
    return 'The selected file exceeds the maximum size of 10 MB.';
  }
  if (
    file.width != null &&
    file.height != null &&
    (file.width < MIN_IMAGE_DIMENSION || file.height < MIN_IMAGE_DIMENSION)
  ) {
    return `Image resolution is too low (minimum ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}).`;
  }
  return null;
}

/** Validates a supporting document (PDF or image) for awards. */
export function validateDocumentFile(file: PickedFile): string | null {
  const ext = extensionOf(file.fileName || file.uri);
  const mime = (file.mimeType || '').toLowerCase();
  if ((ext && !DOC_EXTENSIONS.includes(ext)) || (mime && !DOC_MIME_TYPES.includes(mime))) {
    return 'This file type is not supported. Use PDF, JPG, PNG, or WebP.';
  }
  if (file.fileSize != null && file.fileSize <= 0) return 'This file appears to be empty or corrupted.';
  if (file.fileSize != null && file.fileSize > DOC_MAX_BYTES) {
    return 'The selected file exceeds the maximum size of 15 MB.';
  }
  return null;
}

// ── URLs ────────────────────────────────────────────────────────────────────────
function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    return null;
  }
}

/** A safe HTTPS URL (rejects javascript:, data:, http:, malformed). */
export function isSafeHttpsUrl(raw: string): boolean {
  const u = parseUrl(raw);
  return !!u && u.protocol === 'https:';
}

/** Returns the URL only if it is a safe HTTPS URL, else null (for display). */
export function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return isSafeHttpsUrl(raw) ? raw.trim() : null;
}

/** Validates a general project/verification link (optional; HTTPS if present). */
export function validateOptionalHttpsUrl(raw: string): string | null {
  if (!raw.trim()) return null;
  return isSafeHttpsUrl(raw) ? null : 'Please enter a valid HTTPS link.';
}

/** Validates an external video link: HTTPS + a trusted platform host. */
export function validateVideoLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Please enter a video link.';
  const u = parseUrl(v);
  if (!u || u.protocol !== 'https:') return 'Please enter a valid HTTPS link.';
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const trusted = TRUSTED_VIDEO_PLATFORMS.some((p) => host === p || host.endsWith('.' + p));
  if (!trusted) {
    return 'Use a YouTube, Vimeo, Google Drive, or Dropbox link.';
  }
  return null;
}

/** Google Drive / Dropbox links often need sharing permissions — warn only. */
export function videoLinkWarning(raw: string): string | null {
  const u = parseUrl(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (host.endsWith('drive.google.com') || host.endsWith('dropbox.com')) {
    return 'Make sure this link is shared publicly, or viewers may not be able to open it.';
  }
  return null;
}

// ── Text ────────────────────────────────────────────────────────────────────────
export function sanitizeText(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim();
}

export function validateReelTitle(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Please enter a title for this reel.';
  if (v.length < REEL_TITLE_MIN || v.length > REEL_TITLE_MAX) {
    return `Title must be between ${REEL_TITLE_MIN} and ${REEL_TITLE_MAX} characters.`;
  }
  return null;
}

export function validateYearNotFuture(year: number | null | undefined): string | null {
  if (year == null) return null;
  if (!Number.isInteger(year) || year < 1900) return 'Please enter a valid year.';
  if (year > CURRENT_YEAR) return 'The selected year cannot be in the future.';
  return null;
}

export function validateDescription(raw: string): string | null {
  if (raw.trim().length > DESCRIPTION_MAX) return `Description cannot exceed ${DESCRIPTION_MAX} characters.`;
  return null;
}
