import { supabase, isNetworkError } from '../supabase';
import { createLogger } from '../logger';

const log = createLogger('api/connections');

/** Follow a user. Idempotent — a repeat follow collides on the PK (23505). */
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  try {
    const { error } = await supabase.from('connections').insert({ follower_id: followerId, following_id: followingId });
    if (error && error.code !== '23505') {
      if (isNetworkError({ message: error.message })) return false;
      log.error('followUser failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('followUser threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) {
      log.error('unfollowUser failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('unfollowUser threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
