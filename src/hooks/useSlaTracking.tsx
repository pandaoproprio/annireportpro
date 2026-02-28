import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { SlaConfig, SlaTracking, SlaReportType } from '@/types/sla';

export const useSlaTracking = (projectId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch SLA configs
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
    staleTime: 60_000,
  });

  // Fetch SLA tracking for current project
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

  // Fetch ALL user's SLA trackings (for dashboard)
  const { data: allTrackings = [] } = useQuery({
    queryKey: ['sla-tracking-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_sla_tracking')
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as SlaTracking[];
    },
    staleTime: 30_000,
  });

  // Create SLA tracking when a report is created
  const createTracking = useMutation({
    mutationFn: async (params: {
      reportType: SlaReportType;
      reportId: string;
      projectId: string;
    }) => {
      const config = configs.find(c => c.report_type === params.reportType);
      const days = config?.default_days || 15;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + days);

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

  // Refresh SLA statuses (trigger recalculation by touching updated_at)
  const refreshStatuses = useMutation({
    mutationFn: async () => {
      // Touch each tracking to trigger the DB trigger recalculation
      for (const t of allTrackings) {
        await supabase
          .from('report_sla_tracking')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', t.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['sla-tracking-all'] });
    },
  });

  // Update SLA config (admin only)
  const updateConfig = useMutation({
    mutationFn: async (config: Partial<SlaConfig> & { id: string }) => {
      const { error } = await supabase
        .from('report_sla_config')
        .update({
          default_days: config.default_days,
          warning_days: config.warning_days,
          escalation_days: config.escalation_days,
        })
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-configs'] });
    },
  });

  // Helpers
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
