import { supabase } from './supabase';
import { ActivityLog } from '@/types';

export const logActivity = async (
  organizationId: string,
  userId: string | null,
  userName: string,
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  details?: any
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        user_name: userName,
        action,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details: details ? JSON.stringify(details) : null,
      });
    
    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Activity logging error:', error);
  }
};

export const getActivityLogs = async (
  organizationId?: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: string;
    entityType?: string;
    userId?: string;
  }
): Promise<ActivityLog[]> => {
  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }
  
  if (options?.action) {
    query = query.eq('action', options.action);
  }
  
  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType);
  }
  
  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 100) - 1
    );
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to load activity logs: ${error.message}`);
  
  return (data || []).map(log => ({
    id: log.id,
    organizationId: log.organization_id,
    userId: log.user_id,
    userName: log.user_name,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    entityName: log.entity_name,
    details: log.details,
    ipAddress: log.ip_address,
    createdAt: log.created_at,
  }));
};
