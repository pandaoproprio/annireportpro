import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { SlaConfig, SlaTracking, SlaReportType } from '@/types/sla';
import { slaConfigToTotalHours } from '@/types/sla';

export const useSlaTracking = (projectId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['sla-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_sla_config')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as unknown as SlaConfig[];
    },
    staleTime: 300_000,
  });

  const { data: trackings = [], isLoading } = useQuery({
    queryKey: ['sla-tracking', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('report_sla_tracking')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as unknown as SlaTracking[];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });

  const { data: allTrackings = [] } = useQuery({
    queryKey: ['sla-tracking-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_sla_tracking')
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as SlaTracking[];
    },
    staleTime: 120_000,
  });

  const createTracking = useMutation({
    mutationFn: async (params: {
      reportType: SlaReportType;
      reportId: string;
      projectId: string;
    }) => {
      const config = configs.find(c => c.report_type === params.reportType);
      const totalHours = config
        ? slaConfigToTotalHours(config.default_days, config.default_hours)
        : 15 * 24; // fallback 15 days
      const deadline = new Date();
      deadline.setTime(deadline.getTime() + totalHours * 60 * 60 * 1000);

      const { error } = await supabase.from('report_sla_tracking').upsert({
        report_type: params.reportType,
        report_id: params.reportId,
        project_id: params.projectId,
        user_id: user?.id || '',
        deadline_at: deadline.toISOString(),
      }, { onConflict: 'report_type,report_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['sla-tracking-all'] });
    },
  });

  const refreshStatuses = useMutation({
    mutationFn: async () => {
      const previousStatuses = new Map(allTrackings.map(t => [t.id, t.status]));

      for (const t of allTrackings) {
        await supabase
          .from('report_sla_tracking')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', t.id);
      }

      // Re-fetch to get updated statuses from the trigger
      const { data: updatedTrackings } = await supabase
        .from('report_sla_tracking')
        .select('*');

      // Sync changed statuses to Asana
      if (updatedTrackings) {
        for (const t of updatedTrackings) {
          const prevStatus = previousStatuses.get(t.id);
          if (prevStatus && prevStatus !== t.status) {
            // Fire and forget — don't block the UI
            syncSlaToAsana(t.report_type, t.report_id, t.status).catch(console.error);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['sla-tracking-all'] });
    },
  });

  const syncSlaToAsana = async (reportType: string, reportId: string, slaStatus: string) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      await supabase.functions.invoke('asana-integration', {
        body: {
          action: 'sync_sla_status',
          entity_type: reportType,
          entity_id: reportId,
          sla_status: slaStatus,
        },
      });
    } catch (e) {
      console.error('Asana SLA sync failed:', e);
    }
  };

  const updateConfig = useMutation({
    mutationFn: async (config: Partial<SlaConfig> & { id: string }) => {
      const { error } = await supabase
        .from('report_sla_config')
        .update({
          default_days: config.default_days,
          default_hours: config.default_hours,
          warning_days: config.warning_days,
          warning_hours: config.warning_hours,
          escalation_days: config.escalation_days,
          escalation_hours: config.escalation_hours,
        })
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-configs'] });
    },
  });

  const getTrackingForReport = (reportType: SlaReportType, reportId: string) =>
    trackings.find(t => t.report_type === reportType && t.report_id === reportId);

  const isBlocked = (reportType: SlaReportType, reportId: string) => {
    const t = getTrackingForReport(reportType, reportId);
    return t?.status === 'bloqueado';
  };

  const getSummary = () => {
    const noPrazo = allTrackings.filter(t => t.status === 'no_prazo').length;
    const atencao = allTrackings.filter(t => t.status === 'atencao').length;
    const atrasado = allTrackings.filter(t => t.status === 'atrasado').length;
    const bloqueado = allTrackings.filter(t => t.status === 'bloqueado').length;
    return { noPrazo, atencao, atrasado, bloqueado, total: allTrackings.length };
  };

  const getOverdueTrackings = () =>
    allTrackings
      .filter(t => t.status === 'atrasado' || t.status === 'bloqueado')
      .sort((a, b) => new Date(a.deadline_at).getTime() - new Date(b.deadline_at).getTime());

  return {
    configs,
    trackings,
    allTrackings,
    isLoading,
    createTracking,
    refreshStatuses,
    updateConfig,
    getTrackingForReport,
    isBlocked,
    getSummary,
    getOverdueTrackings,
  };
};
