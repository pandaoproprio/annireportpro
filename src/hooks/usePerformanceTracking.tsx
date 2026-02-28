import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ReportPerformanceTracking, PerformanceSummary, CollaboratorRanking, StaleDraft } from '@/types/performance';
import type { SlaReportType, SLA_REPORT_TYPE_LABELS } from '@/types/sla';

export interface WipDraft {
  id: string;
  report_type: SlaReportType;
  created_at: string;
  provider_name?: string;
  user_id: string;
  user_name?: string;
  project_id: string;
}

export interface PerformanceConfig {
  id: string;
  stale_draft_threshold_hours: number;
  wip_limit: number;
}

export function usePerformanceTracking(projectId: string | undefined) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

  // Fetch config
  const { data: config } = useQuery({
    queryKey: ['performance-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_config' as any)
        .select('*')
        .limit(1)
        .single();
      if (error) return { id: '', stale_draft_threshold_hours: 168, wip_limit: 5 } as PerformanceConfig;
      return data as unknown as PerformanceConfig;
    },
  });

  const thresholdHours = config?.stale_draft_threshold_hours ?? 168;
  const wipLimit = config?.wip_limit ?? 5;

  // Fetch performance tracking records for current project
  const { data: trackingRecords = [], isLoading: isLoadingTracking } = useQuery({
    queryKey: ['performance-tracking', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('report_performance_tracking' as any)
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as unknown as ReportPerformanceTracking[];
    },
    enabled: !!projectId,
  });

  // Fetch stale drafts based on configurable threshold
  const { data: staleDrafts = [], isLoading: isLoadingStaleDrafts } = useQuery({
    queryKey: ['stale-drafts', projectId, thresholdHours],
    queryFn: async () => {
      if (!projectId) return [];
      const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();
      
      const [teamRes, justRes] = await Promise.all([
        supabase
          .from('team_reports')
          .select('id, user_id, created_at')
          .eq('project_id', projectId)
          .eq('is_draft', true)
          .is('deleted_at', null)
          .lt('created_at', cutoff),
        supabase
          .from('justification_reports')
          .select('id, user_id, created_at')
          .eq('project_id', projectId)
          .eq('is_draft', true)
          .is('deleted_at', null)
          .lt('created_at', cutoff),
      ]);

      const allDrafts = [
        ...(teamRes.data || []).map(d => ({ ...d, report_type: 'report_team' as SlaReportType })),
        ...(justRes.data || []).map(d => ({ ...d, report_type: 'justification' as SlaReportType })),
      ];

      if (allDrafts.length === 0) return [];

      const userIds = [...new Set(allDrafts.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.name]));

      return allDrafts.map(d => {
        const hoursInDraft = (Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60);
        return {
          report_id: d.id,
          report_type: d.report_type,
          user_id: d.user_id,
          user_name: nameMap.get(d.user_id) || 'Desconhecido',
          created_at: d.created_at,
          days_in_draft: Math.floor(hoursInDraft / 24),
          hours_in_draft: Math.round(hoursInDraft),
        };
      }) as StaleDraft[];
    },
    enabled: !!projectId,
  });

  // Fetch SLA overdue count
  const { data: overdueCount = 0 } = useQuery({
    queryKey: ['perf-overdue-count', projectId],
    queryFn: async () => {
      if (!projectId) return 0;
      const { count, error } = await supabase
        .from('report_sla_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('status', ['atrasado', 'bloqueado']);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!projectId,
  });

  // WIP drafts — admins see all users, regular users see only their own
  const { data: wipDrafts = [] as WipDraft[] } = useQuery({
    queryKey: ['wip-drafts', user?.id, isAdmin],
    queryFn: async (): Promise<WipDraft[]> => {
      if (!user?.id) return [];

      let teamQuery = supabase.from('team_reports').select('id, created_at, provider_name, user_id, project_id').eq('is_draft', true).is('deleted_at', null);
      let justQuery = supabase.from('justification_reports').select('id, created_at, user_id, project_id').eq('is_draft', true).is('deleted_at', null);

      if (!isAdmin) {
        teamQuery = teamQuery.eq('user_id', user.id);
        justQuery = justQuery.eq('user_id', user.id);
      }

      const [teamRes, justRes] = await Promise.all([teamQuery, justQuery]);

      const allDrafts: WipDraft[] = [
        ...(teamRes.data || []).map(d => ({ id: d.id, report_type: 'report_team' as SlaReportType, created_at: d.created_at, provider_name: d.provider_name, user_id: d.user_id, project_id: d.project_id })),
        ...(justRes.data || []).map(d => ({ id: d.id, report_type: 'justification' as SlaReportType, created_at: d.created_at, user_id: d.user_id, project_id: d.project_id })),
      ];

      // Enrich with user names
      const userIds = [...new Set(allDrafts.map(d => d.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds);
        const nameMap = new Map((profiles || []).map(p => [p.user_id, p.name]));
        allDrafts.forEach(d => { d.user_name = nameMap.get(d.user_id) || 'Desconhecido'; });
      }

      return allDrafts;
    },
    enabled: !!user?.id,
  });

  const wipCount = wipDrafts.length;

  // Build summary
  const summary: PerformanceSummary = (() => {
    const published = trackingRecords.filter(r => r.published_at !== null);
    const avgLeadTime = published.length > 0
      ? published.reduce((acc, r) => acc + (r.calculated_lead_time || 0), 0) / published.length
      : 0;

    const byUser = new Map<string, { lead_times: number[]; reopens: number; count: number }>();
    published.forEach(r => {
      const entry = byUser.get(r.user_id) || { lead_times: [], reopens: 0, count: 0 };
      entry.count++;
      if (r.calculated_lead_time) entry.lead_times.push(r.calculated_lead_time);
      entry.reopens += r.reopen_count;
      byUser.set(r.user_id, entry);
    });

    const ranking: CollaboratorRanking[] = Array.from(byUser.entries()).map(([uid, data]) => ({
      user_id: uid,
      name: '',
      published_count: data.count,
      avg_lead_time_hours: data.lead_times.length > 0 ? data.lead_times.reduce((a, b) => a + b, 0) / data.lead_times.length : 0,
      reopen_total: data.reopens,
    }));

    return {
      avg_lead_time_hours: avgLeadTime,
      on_time_percentage: 0,
      critical_drafts_count: staleDrafts.length,
      overdue_count: overdueCount,
      collaborator_ranking: ranking,
      stale_drafts: staleDrafts,
    };
  })();

  // Enrich ranking with profile names
  const { data: rankingProfiles } = useQuery({
    queryKey: ['perf-ranking-profiles', summary.collaborator_ranking.map(r => r.user_id).join(',')],
    queryFn: async () => {
      const ids = summary.collaborator_ranking.map(r => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from('profiles').select('user_id, name').in('user_id', ids);
      return data || [];
    },
    enabled: summary.collaborator_ranking.length > 0,
  });

  if (rankingProfiles) {
    const nameMap = new Map(rankingProfiles.map(p => [p.user_id, p.name]));
    summary.collaborator_ranking.forEach(r => { r.name = nameMap.get(r.user_id) || 'Desconhecido'; });
  }

  // Update priority mutation
  const updatePriority = useMutation({
    mutationFn: async ({ id, priority }: { id: string; priority: number }) => {
      const { error } = await supabase
        .from('report_performance_tracking' as any)
        .update({ priority } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['performance-tracking', projectId] }),
  });

  // Update config mutation
  const updateConfig = useMutation({
    mutationFn: async (newConfig: { stale_draft_threshold_hours?: number; wip_limit?: number }) => {
      if (!config?.id) return;
      const { error } = await supabase
        .from('performance_config' as any)
        .update(newConfig as any)
        .eq('id', config.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-config'] });
      queryClient.invalidateQueries({ queryKey: ['stale-drafts'] });
    },
  });

  return {
    trackingRecords,
    summary,
    wipCount,
    wipDrafts,
    wipLimit,
    thresholdHours,
    config,
    isLoading: isLoadingTracking || isLoadingStaleDrafts,
    updatePriority,
    updateConfig,
  };
}
