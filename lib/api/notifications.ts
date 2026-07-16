import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';
import { AppNotification } from '../types';

const log = createLogger('api/notifications');

function toNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: row.id as string,
    type: row.type as string,
    actorId: (row.actor_id as string | null) ?? null,
    entityId: (row.entity_id as string | null) ?? null,
    title: (row.title as string) ?? '',
    body: (row.body as string) ?? '',
    read: Boolean(row.read),
    createdAt: row.created_at as string,
  };
}

/** Most recent notifications for a user. Throws NetworkError offline. */
export async function getNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  log.debug('getNotifications', { userId });
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getNotifications failed', { code: error.code, message: error.message });
      return [];
    }
    return (data ?? []).map(toNotification);
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getNotifications threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

/** Marks every unread notification for the user as read. Best-effort. */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) {
      log.error('markAllNotificationsRead failed', { code: error.code, message: error.message });
      return false;
    }
    return true;
  } catch (err: unknown) {
    log.warn('markAllNotificationsRead threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
