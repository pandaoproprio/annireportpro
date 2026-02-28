import { supabase } from '@/integrations/supabase/client';

interface AsanaAutoTaskParams {
  entityType: 'activity' | 'team_report' | 'justification';
  entityId: string;
  projectId: string;
  name: string;
  notes?: string;
}

/**
 * Attempts to create an Asana task when a draft is published.
 * Silently fails if Asana is not configured or feature is disabled.
 */
export async function createAsanaTaskOnPublish(params: AsanaAutoTaskParams) {
  try {
    // Check if Asana config exists and create_tasks is enabled
    const { data: configs } = await supabase
      .from('asana_config')
      .select('enable_create_tasks, project_gid')
      .limit(1);

    const config = configs?.[0];
    if (!config?.enable_create_tasks || !config?.project_gid) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asana-integration`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_task',
          name: params.name,
          notes: params.notes || '',
          entity_type: params.entityType,
          entity_id: params.entityId,
          system_project_id: params.projectId,
        }),
      }
    );
  } catch (err) {
    console.warn('[Asana] Falha ao criar tarefa automática:', err);
  }
}
