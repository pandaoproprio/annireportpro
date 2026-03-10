import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { WORKFLOW_STATUS_LABELS } from '@/hooks/useReportWorkflow';
import type { WorkflowStatus } from '@/hooks/useReportWorkflow';

export interface WorkflowNotification {
  id: string;
  workflow_id: string;
  recipient_user_id: string;
  from_status: string | null;
  to_status: string;
  changed_by_name: string | null;
  report_type: string;
  project_id: string;
  report_id: string;
  notes: string | null;
  is_read: boolean;
  created_at: string;
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  report_object: 'Relatório do Objeto',
  report_team: 'Relatório da Equipe',
  justification: 'Justificativa',
};

export function useWorkflowNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['workflow-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_notifications')
        .select('*')
        .eq('recipient_user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as WorkflowNotification[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('workflow-notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_notifications',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['workflow-notifications', user.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const unreadCount = (query.data || []).filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_notifications')
        .update({ is_read: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('workflow_notifications')
        .update({ is_read: true } as any)
        .eq('recipient_user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-notifications', user?.id] }),
  });

  return {
    notifications: query.data || [],
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllAsRead,
    REPORT_TYPE_LABELS,
  };
}
