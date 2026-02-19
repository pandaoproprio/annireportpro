import { supabase } from '@/integrations/supabase/client';

import type { Json } from '@/integrations/supabase/types';

interface LogParams {
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Json;
  newData?: Json;
}

/**
 * Fire-and-forget system log. Never blocks the calling operation.
 */
export async function logAction(params: LogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile name/email for modified_by tracking
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', user.id)
      .single();

    await supabase.from('system_logs').insert([{
      user_id: user.id,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? undefined,
      old_data: params.oldData ?? undefined,
      new_data: params.newData ?? undefined,
      user_agent: navigator.userAgent,
      modified_by_name: profile?.name ?? null,
      modified_by_email: profile?.email ?? null,
    }]);
  } catch (e) {
    console.warn('System log failed:', e);
  }
}
