import { supabase, isNetworkError } from '../supabase';
import { createLogger } from '../logger';
import { MediaStatus } from '../types';
import { PickedFile } from '../portfolioValidation';

const log = createLogger('api/portfolio');

const MEDIA_BUCKET = 'portfolio-media';
const DOCS_BUCKET = 'portfolio-docs';

/** Opaque, collision-resistant id — never derived from the original filename. */
function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function extAndType(file: PickedFile): { ext: string; contentType: string } {
  const source = (file.fileName || file.uri).split('?')[0].split('#')[0];
  let ext = source.includes('.') ? source.slice(source.lastIndexOf('.') + 1).toLowerCase() : '';
  const mime = (file.mimeType || '').toLowerCase();
  const extByMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  if (!ext && extByMime[mime]) ext = extByMime[mime];
  if (ext === 'jpeg') ext = 'jpg';
  const typeByExt: Record<string, string> = {
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  return { ext: ext || 'jpg', contentType: mime || typeByExt[ext] || 'application/octet-stream' };
}

async function fileToArrayBuffer(uri: string): Promise<ArrayBuffer> {
  // Dep-free RN upload path: read the local file URI as bytes.
  const res = await fetch(uri);
  return await res.arrayBuffer();
}

export type UploadImageResult =
  | { ok: true; mediaId: string; path: string; url: string; status: MediaStatus }
  | { ok: false; error: string };

/** Uploads a showcase image to the public bucket under {userId}/{kind}/{uuid}.ext */
export async function uploadPortfolioImage(
  userId: string,
  kind: 'profile' | 'photos',
  file: PickedFile,
): Promise<UploadImageResult> {
  const { ext, contentType } = extAndType(file);
  const path = `${userId}/${kind}/${genId()}.${ext}`;
  try {
    const body = await fileToArrayBuffer(file.uri);
    if (!body || body.byteLength === 0) return { ok: false, error: 'This file appears to be empty or corrupted.' };
    const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, body, { contentType, upsert: false });
    if (error) {
      log.error('uploadPortfolioImage failed', { path, message: error.message });
      if (isNetworkError({ message: error.message })) return { ok: false, error: 'Your upload was interrupted. Please try again.' };
      if (/maximum allowed size|payload too large|413/i.test(error.message)) return { ok: false, error: 'The selected file exceeds the maximum size.' };
      if (/mime type|not supported/i.test(error.message)) return { ok: false, error: 'This file type is not supported.' };
      return { ok: false, error: 'We could not upload this image. Please try again.' };
    }
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return { ok: true, mediaId: genId(), path, url: data.publicUrl, status: 'COMPLETED' };
  } catch (err: unknown) {
    log.error('uploadPortfolioImage threw', { path, message: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: 'Your upload was interrupted. Please try again.' };
  }
}

export type UploadDocResult =
  | { ok: true; mediaId: string; path: string; signedUrl: string | null }
  | { ok: false; error: string };

/** Uploads an award document to the PRIVATE bucket; returns a short-lived signed URL for preview. */
export async function uploadPortfolioDocument(userId: string, file: PickedFile): Promise<UploadDocResult> {
  const { ext, contentType } = extAndType(file);
  const path = `${userId}/awards/${genId()}.${ext}`;
  try {
    const body = await fileToArrayBuffer(file.uri);
    if (!body || body.byteLength === 0) return { ok: false, error: 'This file appears to be empty or corrupted.' };
    const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, body, { contentType, upsert: false });
    if (error) {
      log.error('uploadPortfolioDocument failed', { path, message: error.message });
      if (isNetworkError({ message: error.message })) return { ok: false, error: 'Your upload was interrupted. Please try again.' };
      return { ok: false, error: 'We could not upload this document. Please try again.' };
    }
    return { ok: true, mediaId: genId(), path, signedUrl: await getSignedDocUrl(path) };
  } catch (err: unknown) {
    log.error('uploadPortfolioDocument threw', { path, message: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: 'Your upload was interrupted. Please try again.' };
  }
}

/** Short-lived signed URL for a private award document. */
export async function getSignedDocUrl(path: string, expiresIn = 3600): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, expiresIn);
    if (error) {
      log.warn('getSignedDocUrl failed', { path, message: error.message });
      return null;
    }
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** Best-effort delete (RLS ensures a user can only remove their own files). */
export async function deletePortfolioMedia(bucket: 'portfolio-media' | 'portfolio-docs', path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      log.warn('deletePortfolioMedia failed', { bucket, path, message: error.message });
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
