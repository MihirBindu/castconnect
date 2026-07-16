import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';

const log = createLogger('api/bookmarks');

/** Returns the ids of casting calls the user has saved. Throws NetworkError offline. */
export async function getBookmarks(userId: string): Promise<string[]> {
  log.debug('getBookmarks', { userId });
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('casting_call_id')
      .eq('user_id', userId);

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getBookmarks failed', { code: error.code, message: error.message });
      return [];
    }
    return (data ?? []).map(r => r.casting_call_id as string);
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getBookmarks threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/** Idempotent — a repeat save collides on the primary key (23505) and is treated as success. */
export async function addBookmark(userId: string, castingCallId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('bookmarks').insert({ user_id: userId, casting_call_id: castingCallId });
    if (error && error.code !== '23505') {
      log.error('addBookmark failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('addBookmark threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function removeBookmark(userId: string, castingCallId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('casting_call_id', castingCallId);
    if (error) {
      log.error('removeBookmark failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('removeBookmark threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
