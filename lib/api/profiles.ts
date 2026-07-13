import { supabase, isNetworkError, NetworkError, networkErrorMessage } from '../supabase';
import { createLogger } from '../logger';
import { UserProfile, BodyType, Complexion } from '../types';

const log = createLogger('api/profiles');

// ── Timeout helper ───────────────────────────────────────────────────────────
class TimeoutError extends Error {
  constructor() {
    super('Request timed out');
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError()), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function toProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as UserProfile['role'],
    title: row.title as string,
    crewRole: row.crew_role as UserProfile['crewRole'],
    bio: row.bio as string,
    skills: (row.skills as string[]) ?? [],
    experience: row.experience as string,
    experienceYears: row.experience_years as number,
    location: row.location as string,
    availability: row.availability as UserProfile['availability'],
    portfolioLinks: (row.portfolio_links as string[]) ?? [],
    profileImage: row.profile_image as string | null,
    contactEmail: row.contact_email as string,
    contactPhone: row.contact_phone as string,
    isVerified: row.is_verified as boolean,
    industryTypes: (row.industry_types as UserProfile['industryTypes']) ?? [],
    connections: [],
    dayRate: row.day_rate as number,
    rating: row.rating as number,
    reviewCount: row.review_count as number,
    createdAt: row.created_at as string,
    age: (row.age as number | null) ?? null,
    heightCm: (row.height_cm as number | null) ?? null,
    bodyType: (row.body_type as BodyType | null) ?? null,
    customBodyType: (row.custom_body_type as string) ?? '',
    complexion: (row.complexion as Complexion | null) ?? null,
    customComplexion: (row.custom_complexion as string) ?? '',
    authProvider: (row.auth_provider as string) ?? 'email',
    profileCompleted: (row.profile_completed as boolean) ?? false,
    updatedAt: (row.updated_at as string) ?? (row.created_at as string),
  };
}

export async function getProfile(id: string): Promise<UserProfile | null> {
  log.debug('getProfile', { id });
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getProfile failed', { id, code: error.code, message: error.message });
      return null;
    }
    if (!data) {
      log.warn('getProfile returned no data', { id });
      return null;
    }

    const connections = await getConnectionIds(id);
    log.info('getProfile success', { id, connections: connections.length });
    return { ...toProfile(data), connections };
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getProfile threw', { id, message: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function getProfiles(): Promise<UserProfile[]> {
  log.debug('getProfiles');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('rating', { ascending: false });

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getProfiles failed', { code: error.code, message: error.message });
      return [];
    }

    log.info('getProfiles success', { count: data?.length ?? 0 });
    return (data ?? []).map(toProfile);
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getProfiles threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function updateProfile(id: string, updates: Partial<UserProfile>): Promise<boolean> {
  log.debug('updateProfile', { id, fields: Object.keys(updates) });
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined)            payload.name = updates.name;
  if (updates.role !== undefined)            payload.role = updates.role;
  if (updates.title !== undefined)           payload.title = updates.title;
  if (updates.crewRole !== undefined)        payload.crew_role = updates.crewRole;
  if (updates.bio !== undefined)             payload.bio = updates.bio;
  if (updates.skills !== undefined)          payload.skills = updates.skills;
  if (updates.experience !== undefined)      payload.experience = updates.experience;
  if (updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears;
  if (updates.location !== undefined)        payload.location = updates.location;
  if (updates.availability !== undefined)    payload.availability = updates.availability;
  if (updates.portfolioLinks !== undefined)  payload.portfolio_links = updates.portfolioLinks;
  if (updates.profileImage !== undefined)    payload.profile_image = updates.profileImage;
  if (updates.contactEmail !== undefined)    payload.contact_email = updates.contactEmail;
  if (updates.contactPhone !== undefined)    payload.contact_phone = updates.contactPhone;
  if (updates.industryTypes !== undefined)   payload.industry_types = updates.industryTypes;
  if (updates.dayRate !== undefined)         payload.day_rate = updates.dayRate;

  try {
    const { error } = await supabase.from('profiles').update(payload).eq('id', id);
    if (error) {
      log.error('updateProfile failed', { id, code: error.code, message: error.message });
      return false;
    }
    log.info('updateProfile success', { id });
    return true;
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      log.warn('updateProfile: network unavailable', { id });
      return false;
    }
    log.error('updateProfile threw', { id, message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

// ── Onboarding / profile-completion ───────────────────────────────────────────

export type ProfileStatusResult = { exists: boolean; completed: boolean } | 'network-error';

const STATUS_TIMEOUT_MS = 12000;

/**
 * Slim query used by the root routing gate to decide whether a signed-in user
 * still needs to complete onboarding. Returns 'network-error' when the check
 * can't reach the server so the caller can show a retry screen instead of
 * guessing (and instead of flashing the dashboard).
 */
export async function getProfileStatus(userId: string): Promise<ProfileStatusResult> {
  log.debug('getProfileStatus', { userId });
  try {
    const query = supabase
      .from('profiles')
      .select('id, profile_completed')
      .eq('id', userId)
      .maybeSingle();

    const { data, error } = await withTimeout(query, STATUS_TIMEOUT_MS);

    if (error) {
      if (isNetworkError({ message: error.message })) return 'network-error';
      log.error('getProfileStatus failed', { userId, code: error.code, message: error.message });
      // A non-network error (missing row/column, RLS) shouldn't drop the user
      // into a half-broken dashboard — route them through onboarding instead.
      return { exists: false, completed: false };
    }
    if (!data) return { exists: false, completed: false };
    return { exists: true, completed: Boolean((data as { profile_completed?: boolean }).profile_completed) };
  } catch (err: unknown) {
    if (err instanceof TimeoutError || isNetworkError(err)) return 'network-error';
    log.error('getProfileStatus threw', { userId, message: err instanceof Error ? err.message : String(err) });
    return { exists: false, completed: false };
  }
}

export interface OnboardingInput {
  fullName: string;
  age: number;
  heightCm: number;
  bodyType: BodyType;
  customBodyType: string;
  complexion: Complexion;
  customComplexion: string;
  email: string;
  authProvider: string;
}

export type CompleteProfileError =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'validation'
  | 'incomplete'
  | 'unknown';

export type CompleteProfileResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; error: CompleteProfileError; message: string };

const SAVE_TIMEOUT_MS = 15000;

/**
 * Saves the onboarding profile. Uses upsert keyed on the auth user id so the
 * same user can never create a duplicate row, and re-reads the server-computed
 * `profile_completed` flag so the client can't self-report completion.
 */
export async function completeProfile(userId: string, input: OnboardingInput): Promise<CompleteProfileResult> {
  log.debug('completeProfile', { userId });

  const payload = {
    id: userId,
    name: input.fullName.trim(),
    contact_email: input.email,
    auth_provider: input.authProvider,
    age: input.age,
    height_cm: input.heightCm,
    body_type: input.bodyType,
    custom_body_type: input.bodyType === 'Other' ? input.customBodyType.trim() : '',
    complexion: input.complexion,
    custom_complexion: input.complexion === 'Other' ? input.customComplexion.trim() : '',
  };

  try {
    const query = supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    const { data, error } = await withTimeout(query, SAVE_TIMEOUT_MS);

    if (error) {
      if (isNetworkError({ message: error.message })) {
        return { ok: false, error: 'network', message: networkErrorMessage() };
      }
      const code = error.code ?? '';
      log.error('completeProfile failed', { userId, code, message: error.message });
      if (code === 'PGRST301' || code === '42501' || /jwt|unauthor|permission|policy|rls/i.test(error.message)) {
        return { ok: false, error: 'unauthorized', message: 'Your session has expired. Please sign in again.' };
      }
      if (code === '23514' || code === '23502') {
        return { ok: false, error: 'validation', message: 'Some details are outside the allowed range. Please review and try again.' };
      }
      return { ok: false, error: 'unknown', message: 'Could not save your profile. Please try again.' };
    }

    if (!data) {
      return { ok: false, error: 'unknown', message: 'Could not save your profile. Please try again.' };
    }

    const profile = toProfile(data);
    if (!profile.profileCompleted) {
      // Server validation rejected one or more values.
      return { ok: false, error: 'incomplete', message: 'Some required details are missing or invalid. Please review the form and try again.' };
    }

    log.info('completeProfile success', { userId });
    return { ok: true, profile };
  } catch (err: unknown) {
    if (err instanceof TimeoutError) {
      return { ok: false, error: 'timeout', message: 'The request timed out. Please check your connection and try again.' };
    }
    if (isNetworkError(err)) {
      return { ok: false, error: 'network', message: networkErrorMessage() };
    }
    log.error('completeProfile threw', { userId, message: err instanceof Error ? err.message : String(err) });
    return { ok: false, error: 'unknown', message: 'Something went wrong. Please try again.' };
  }
}

async function getConnectionIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('connections')
      .select('following_id')
      .eq('follower_id', userId);

    if (error) {
      log.warn('getConnectionIds failed', { userId, message: error.message });
      return [];
    }
    return (data ?? []).map((r) => r.following_id);
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      log.warn('getConnectionIds: network unavailable', { userId });
      return [];
    }
    log.error('getConnectionIds threw', { userId, message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function toggleConnection(myId: string, targetId: string): Promise<boolean> {
  log.debug('toggleConnection', { myId, targetId });
  try {
    const { data, error: fetchError } = await supabase
      .from('connections')
      .select('follower_id')
      .eq('follower_id', myId)
      .eq('following_id', targetId)
      .maybeSingle();

    if (fetchError) {
      log.error('toggleConnection check failed', { message: fetchError.message });
      return false;
    }

    if (data) {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('follower_id', myId)
        .eq('following_id', targetId);
      if (error) { log.error('toggleConnection unfollow failed', { message: error.message }); return false; }
      log.info('Unfollowed', { myId, targetId });
    } else {
      const { error } = await supabase
        .from('connections')
        .insert({ follower_id: myId, following_id: targetId });
      if (error) { log.error('toggleConnection follow failed', { message: error.message }); return false; }
      log.info('Followed', { myId, targetId });
    }
    return true;
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      log.warn('toggleConnection: network unavailable', { myId, targetId });
      return false;
    }
    log.error('toggleConnection threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
