import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AsanaConfig {
  id: string;
  project_gid: string;
  workspace_gid: string;
  enable_create_tasks: boolean;
  enable_sync_status: boolean;
  enable_notifications: boolean;
  enable_import_tasks: boolean;
  created_by: string;
}

interface AsanaWorkspace {
  gid: string;
  name: string;
}

interface AsanaProject {
  gid: string;
  name: string;
}

async function callAsana(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/asana-integration`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    }
  );

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Erro na integração Asana');
  return data;
}

export function useAsanaConfig() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['asana-config'],
    queryFn: async () => {
      const { data } = await supabase
        .from('asana_config')
        .select('*')
        .limit(1);
      return (data?.[0] as unknown as AsanaConfig) || null;
    },
  });

  const saveConfig = useCallback(async (values: Partial<AsanaConfig> & { created_by: string }) => {
    if (config?.id) {
      const { error } = await supabase
        .from('asana_config')
        .update(values as any)
        .eq('id', config.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('asana_config')
        .insert(values as any);
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['asana-config'] });
  }, [config, queryClient]);

  return { config, isLoading, saveConfig };
}

export function useAsanaActions() {
  const testConnection = useMutation({
    mutationFn: () => callAsana('test_connection'),
    onSuccess: (data) => toast.success(`Conectado como ${data.user?.name || data.user?.email}`),
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  const listWorkspaces = useCallback(async (): Promise<AsanaWorkspace[]> => {
    const data = await callAsana('list_workspaces');
    return data.workspaces || [];
  }, []);

  const listProjects = useCallback(async (workspaceGid: string): Promise<AsanaProject[]> => {
    const data = await callAsana('list_projects', { workspace_gid: workspaceGid });
    return data.projects || [];
  }, []);

  const createTask = useMutation({
    mutationFn: (params: {
      name: string;
      notes: string;
      entity_type?: string;
      entity_id?: string;
      system_project_id?: string;
    }) => callAsana('create_task', params),
    onSuccess: () => toast.success('Tarefa criada no Asana!'),
    onError: (e: Error) => toast.error(e.message),
  });

  const syncStatus = useMutation({
    mutationFn: (params: {
      entity_type: string;
      entity_id: string;
      completed?: boolean;
      notes?: string;
    }) => callAsana('sync_status', params),
    onSuccess: () => toast.success('Status sincronizado com Asana'),
    onError: (e: Error) => toast.error(e.message),
  });

  const notify = useMutation({
    mutationFn: (params: {
      message: string;
      entity_type?: string;
      entity_id?: string;
    }) => callAsana('notify', params),
    onSuccess: () => toast.success('Notificação enviada ao Asana'),
    onError: (e: Error) => toast.error(e.message),
  });

  const importTasks = useMutation({
    mutationFn: (params: { system_project_id: string; project_gid?: string }) =>
      callAsana('import_tasks', params),
    onSuccess: (data) =>
      toast.success(`${data.imported_count} tarefas importadas de ${data.total_tasks} encontradas`),
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    testConnection,
    listWorkspaces,
    listProjects,
    createTask,
    syncStatus,
    notify,
    importTasks,
  };
}
