import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ReportPerformanceTracking, PerformanceSummary, CollaboratorRanking, StaleDraft } from '@/types/performance';
import type { SlaReportType } from '@/types/sla';

export function usePerformanceTracking(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  // Fetch stale drafts (> 7 days) from team_reports + justification_reports
  const { data: staleDrafts = [], isLoading: isLoadingStaleDrafts } = useQuery({
    queryKey: ['stale-drafts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const [teamRes, justRes] = await Promise.all([
        supabase
          .from('team_reports')
          .select('id, user_id, created_at')
          .eq('project_id', projectId)
          .eq('is_draft', true)
          .is('deleted_at', null)
          .lt('created_at', sevenDaysAgo),
        supabase
          .from('justification_reports')
          .select('id, user_id, created_at')
          .eq('project_id', projectId)
          .eq('is_draft', true)
          .is('deleted_at', null)
          .lt('created_at', sevenDaysAgo),
      ]);

      const allDrafts = [
        ...(teamRes.data || []).map(d => ({ ...d, report_type: 'report_team' as SlaReportType })),
        ...(justRes.data || []).map(d => ({ ...d, report_type: 'justification' as SlaReportType })),
      ];

      if (allDrafts.length === 0) return [];

      // Fetch profile names
      const userIds = [...new Set(allDrafts.map(d => d.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', userIds);
      const nameMap = new Map((profiles || []).map(p => [p.user_id, p.name]));

      return allDrafts.map(d => ({
        report_id: d.id,
        report_type: d.report_type,
        user_id: d.user_id,
        user_name: nameMap.get(d.user_id) || 'Desconhecido',
        created_at: d.created_at,
        days_in_draft: Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      })) as StaleDraft[];
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

  // WIP count for current user
  const { data: wipCount = 0 } = useQuery({
    queryKey: ['wip-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const [teamRes, justRes] = await Promise.all([
        supabase.from('team_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_draft', true).is('deleted_at', null),
        supabase.from('justification_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_draft', true).is('deleted_at', null),
      ]);
      return (teamRes.count || 0) + (justRes.count || 0);
    },
    enabled: !!user?.id,
  });

  // Build summary
  const summary: PerformanceSummary = (() => {
    const published = trackingRecords.filter(r => r.published_at !== null);
    const avgLeadTime = published.length > 0
      ? published.reduce((acc, r) => acc + (r.calculated_lead_time || 0), 0) / published.length
      : 0;

    // Build collaborator ranking
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
      name: '', // will be enriched below
      published_count: data.count,
      avg_lead_time_hours: data.lead_times.length > 0 ? data.lead_times.reduce((a, b) => a + b, 0) / data.lead_times.length : 0,
      reopen_total: data.reopens,
    }));

    return {
      avg_lead_time_hours: avgLeadTime,
      on_time_percentage: 0, // computed below
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

  return {
    trackingRecords,
    summary,
    wipCount,
    isLoading: isLoadingTracking || isLoadingStaleDrafts,
    updatePriority,
  };
}
