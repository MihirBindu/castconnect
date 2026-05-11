import { supabase } from '../supabase';
import { Message, Conversation } from '../types';

export async function getMessages(myId: string, otherId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),` +
      `and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
    )
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    timestamp: row.created_at,
    read: row.read,
  }));
}

export async function sendMessage(senderId: string, receiverId: string, content: string): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .select()
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    content: data.content,
    timestamp: data.created_at,
    read: data.read,
  };
}

export async function markMessagesRead(myId: string, senderId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('receiver_id', myId)
    .eq('sender_id', senderId)
    .eq('read', false);
}

export async function getConversations(myId: string): Promise<Conversation[]> {
  // Fetch all messages involving the current user
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id,name,role,profile_image,is_verified), receiver:profiles!receiver_id(id,name,role,profile_image,is_verified)')
    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const seen = new Map<string, Conversation>();
  for (const row of data) {
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
  return Array.from(seen.values());
}
