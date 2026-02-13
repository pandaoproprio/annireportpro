import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogEntry {
  userId: string;
  action: 'DELETE' | 'UPDATE' | 'CREATE';
  entityType: string;
  entityId: string;
  entityName?: string;
  metadata?: Record<string, Json>;
}

export const logAuditEvent = async (entry: AuditLogEntry) => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([{
        user_id: entry.userId,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        entity_name: entry.entityName || null,
        metadata: entry.metadata || {},
      }]);

    if (error) {
      console.error('Error logging audit event:', error);
    }
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};
