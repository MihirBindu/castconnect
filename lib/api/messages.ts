import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';
import { Message, Conversation } from '../types';

const log = createLogger('api/messages');

export async function getMessages(myId: string, otherId: string): Promise<Message[]> {
  log.debug('getMessages', { myId, otherId });
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),` +
        `and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      log.error('getMessages failed', { code: error.code, message: error.message });
      return [];
    }

    log.info('getMessages success', { count: data?.length ?? 0 });
    return (data ?? []).map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      timestamp: row.created_at,
      read: row.read,
    }));
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      log.warn('getMessages: network unavailable', { myId, otherId });
      return [];
    }
    log.error('getMessages threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function sendMessage(senderId: string, receiverId: string, content: string): Promise<Message | null> {
  log.debug('sendMessage', { senderId, receiverId, contentLength: content.length });
  if (!content.trim()) {
    log.warn('sendMessage called with empty content');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: senderId, receiver_id: receiverId, content: content.trim() })
      .select()
      .single();

    if (error) {
      log.error('sendMessage failed', { code: error.code, message: error.message });
      return null;
    }

    log.info('sendMessage success', { messageId: data?.id });
    return {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      content: data.content,
      timestamp: data.created_at,
      read: data.read,
    };
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      log.warn('sendMessage: network unavailable');
      return null;
    }
    log.error('sendMessage threw', { message: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function markMessagesRead(myId: string, senderId: string): Promise<void> {
  log.debug('markMessagesRead', { myId, senderId });
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', myId)
      .eq('sender_id', senderId)
      .eq('read', false);

    if (error) {
      log.error('markMessagesRead failed', { code: error.code, message: error.message });
    }
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      log.warn('markMessagesRead: network unavailable', { myId, senderId });
      return;
    }
    log.error('markMessagesRead threw', { message: err instanceof Error ? err.message : String(err) });
  }
}

export async function getConversations(myId: string): Promise<Conversation[]> {
  log.debug('getConversations', { myId });
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id,name,role,profile_image,is_verified), receiver:profiles!receiver_id(id,name,role,profile_image,is_verified)')
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      .order('created_at', { ascending: false });

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getConversations failed', { code: error.code, message: error.message });
      return [];
    }

    const seen = new Map<string, Conversation>();
    for (const row of data ?? []) {
      const other = row.sender_id === myId ? row.receiver : row.sender;
      if (!other || seen.has(other.id)) continue;
      const unread = !row.read && row.receiver_id === myId ? 1 : 0;
      seen.set(other.id, {
        id: other.id,
        participantId: other.id,
        participantName: other.name,
        participantRole: other.role,
        participantImage: other.profile_image ?? null,
        participantVerified: other.is_verified,
        lastMessage: row.content,
        lastMessageTime: row.created_at,
        unreadCount: unread,
      });
    }

    log.info('getConversations success', { count: seen.size });
    return Array.from(seen.values());
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getConversations threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}
