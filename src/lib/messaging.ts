import { supabase } from './supabase';
import { Message } from '@/types';

export const sendMessage = async (
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  subject: string,
  message: string,
  organizationId?: string,
  parentId?: string
): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .insert({
      from_user_id: fromUserId,
      from_user_name: fromUserName,
      to_user_id: toUserId,
      to_user_name: toUserName,
      organization_id: organizationId || null,
      subject,
      message,
      parent_id: parentId || null,
    });
  
  if (error) throw new Error(`Failed to send message: ${error.message}`);
};

export const getMessages = async (
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
  }
): Promise<Message[]> => {
  let query = supabase
    .from('messages')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  
  if (options?.unreadOnly) {
    query = query.eq('is_read', false).eq('to_user_id', userId);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  
  return (data || []).map(msg => ({
    id: msg.id,
    fromUserId: msg.from_user_id,
    fromUserName: msg.from_user_name,
    toUserId: msg.to_user_id,
    toUserName: msg.to_user_name,
    organizationId: msg.organization_id,
    subject: msg.subject,
    message: msg.message,
    isRead: msg.is_read,
    parentId: msg.parent_id,
    createdAt: msg.created_at,
  }));
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId);
  
  if (error) throw new Error(`Failed to mark message as read: ${error.message}`);
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('to_user_id', userId)
    .eq('is_read', false);
  
  if (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
  
  return count || 0;
};
