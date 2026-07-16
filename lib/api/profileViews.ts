import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';
import { ProfileViewer } from '../types';

const log = createLogger('api/profileViews');

/** Records (or refreshes) that `viewerId` viewed `viewedId`. Best-effort, idempotent. */
export async function recordProfileView(viewerId: string, viewedId: string): Promise<void> {
  if (viewerId === viewedId) return;
  try {
    const { error } = await supabase
      .from('profile_views')
      .upsert({ viewer_id: viewerId, viewed_id: viewedId, created_at: new Date().toISOString() }, { onConflict: 'viewer_id,viewed_id' });
    if (error) log.warn('recordProfileView failed', { code: error.code, message: error.message });
  } catch (err: unknown) {
    log.warn('recordProfileView threw', { message: err instanceof Error ? err.message : String(err) });
  }
}

/** Who viewed the user's profile, most recent first. Throws NetworkError offline. */
export async function getProfileViewers(userId: string, limit = 100): Promise<ProfileViewer[]> {
  log.debug('getProfileViewers', { userId });
  try {
    const { data, error } = await supabase
      .from('profile_views')
      .select('created_at, viewer:profiles!viewer_id(id,name,role,title,profile_image,is_verified)')
      .eq('viewed_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getProfileViewers failed', { code: error.code, message: error.message });
      return [];
    }
    return (data ?? [])
      .filter((r) => r.viewer)
      .map((r) => {
        const v = r.viewer as unknown as {
          id: string; name: string; role: ProfileViewer['role']; title: string; profile_image: string | null; is_verified: boolean;
        };
        return {
          viewerId: v.id,
          name: v.name ?? '',
          role: v.role,
          title: v.title ?? '',
          profileImage: v.profile_image ?? null,
          isVerified: !!v.is_verified,
          viewedAt: r.created_at as string,
        };
      });
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getProfileViewers threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}
