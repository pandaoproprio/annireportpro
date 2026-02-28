import { logAction } from '@/lib/systemLog';
import { logAuditEvent } from '@/lib/auditLog';
import type { Json } from '@/integrations/supabase/types';

interface UnifiedLogParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  auditAction?: 'CREATE' | 'UPDATE' | 'DELETE';
  metadata?: Record<string, Json>;
  oldData?: Json;
  newData?: Json;
}

/**
 * Fire-and-forget unified log that writes to BOTH system_logs and audit_logs.
 * Ensures consistency across all modules without duplicating calls.
 */
export function logUnified(params: UnifiedLogParams): void {
  const auditAction = params.auditAction ?? (
    params.action.includes('created') ? 'CREATE' :
    params.action.includes('deleted') ? 'DELETE' : 'UPDATE'
  );

  // Fire both in parallel, never block the caller
  logAction({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldData: params.oldData,
    newData: params.newData,
  }).catch(() => {});

  logAuditEvent({
    userId: params.userId,
    action: auditAction,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    metadata: params.metadata,
  }).catch(() => {});
}
