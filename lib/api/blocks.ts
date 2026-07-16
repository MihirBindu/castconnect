import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';

const log = createLogger('api/blocks');

/** Ids of users the current user has blocked. Throws NetworkError offline. */
export async function getMyBlocks(userId: string): Promise<string[]> {
  log.debug('getMyBlocks', { userId });
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getMyBlocks failed', { code: error.code, message: error.message });
      return [];
    }
    return (data ?? []).map(r => r.blocked_id as string);
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getMyBlocks threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/** Idempotent — a repeat block collides on the primary key (23505). */
export async function blockUser(userId: string, blockedId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: blockedId });
    if (error && error.code !== '23505') {
      log.error('blockUser failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('blockUser threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function unblockUser(userId: string, blockedId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', blockedId);
    if (error) {
      log.error('unblockUser failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('unblockUser threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function reportUser(
  userId: string,
  reportedId: string,
  reason: string,
  details = '',
): Promise<boolean> {
  try {
    const { error } = await supabase.from('reports').insert({
      reporter_id: userId,
      reported_id: reportedId,
      reason,
      details: details.slice(0, 1000),
    });
    if (error) {
      log.error('reportUser failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('reportUser threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
