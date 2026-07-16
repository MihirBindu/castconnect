import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';
import { SavedSearch, DiscoverFilters } from '../types';

const log = createLogger('api/savedSearches');

function toSavedSearch(row: Record<string, unknown>): SavedSearch {
  return {
    id: row.id as string,
    name: (row.name as string) ?? '',
    filters: ((row.filters as DiscoverFilters) ?? {}) as DiscoverFilters,
    createdAt: row.created_at as string,
  };
}

/** The user's saved Discover filter presets. Throws NetworkError offline. */
export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  log.debug('getSavedSearches', { userId });
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getSavedSearches failed', { code: error.code, message: error.message });
      return [];
    }
    return (data ?? []).map(toSavedSearch);
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getSavedSearches threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function addSavedSearch(userId: string, name: string, filters: DiscoverFilters): Promise<SavedSearch | null> {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .insert({ user_id: userId, name: name.slice(0, 80), filters })
      .select()
      .single();
    if (error) {
      log.error('addSavedSearch failed', { code: error.code, message: error.message });
      return null;
    }
    return toSavedSearch(data);
  } catch (err: unknown) {
    log.warn('addSavedSearch threw', { message: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function deleteSavedSearch(userId: string, id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('saved_searches').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      log.error('deleteSavedSearch failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('deleteSavedSearch threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
