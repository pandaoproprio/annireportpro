import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AutomationAlert {
  id: string;
  run_id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  target_user_id: string;
  target_email: string | null;
  entity_type: string | null;
  entity_id: string | null;
  project_id: string | null;
  email_sent: boolean;
  email_error: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AutomationRun {
  id: string;
  run_type: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  alerts_generated: number;
  emails_sent: number;
  errors: string[] | null;
  metadata: Record<string, any> | null;
}

export function useAutomationAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['automation-alerts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as AutomationAlert[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const runsQuery = useQuery({
    queryKey: ['automation-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as AutomationRun[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const unreadCount = (alertsQuery.data || []).filter(a => !a.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automation_alerts')
        .update({ is_read: true } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-alerts'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('automation_alerts')
        .update({ is_read: true } as any)
        .eq('target_user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-alerts'] }),
  });

  const triggerManualRun = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('automato-monitor', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automation-alerts'] });
      qc.invalidateQueries({ queryKey: ['automation-runs'] });
    },
  });

  return {
    alerts: alertsQuery.data || [],
    runs: runsQuery.data || [],
    unreadCount,
    isLoading: alertsQuery.isLoading,
    markAsRead,
    markAllAsRead,
    triggerManualRun,
  };
}
