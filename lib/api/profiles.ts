import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';
import { UserProfile } from '../types';

const log = createLogger('api/profiles');

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
    if (isNetworkError(err)) { log.warn('updateProfile: network unavailable', { id }); return false; }
    log.error('updateProfile threw', { id, message: err instanceof Error ? err.message : String(err) });
    return false;
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
    if (isNetworkError(err)) { log.warn('getConnectionIds: network unavailable', { userId }); return []; }
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
    if (isNetworkError(err)) { log.warn('toggleConnection: network unavailable', { myId, targetId }); return false; }
    log.error('toggleConnection threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
