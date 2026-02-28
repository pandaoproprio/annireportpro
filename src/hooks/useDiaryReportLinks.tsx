import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DiaryReportLink {
  id: string;
  report_id: string;
  report_type: string;
  activity_id: string;
  author_id: string;
  created_at: string;
}

export const useDiaryReportLinks = (reportId?: string, reportType = 'report_object') => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['diary-report-links', reportId, reportType],
    queryFn: async () => {
      if (!reportId) return [];
      const { data, error } = await (supabase as any)
        .from('report_diary_links')
        .select('*')
        .eq('report_id', reportId)
        .eq('report_type', reportType);
      if (error) throw error;
      return (data || []) as DiaryReportLink[];
    },
    enabled: !!reportId && !!user,
  });

  const linkActivities = useMutation({
    mutationFn: async (activityIds: string[]) => {
      if (!user || !reportId) throw new Error('Missing context');
      const rows = activityIds.map(aid => ({
        report_id: reportId,
        report_type: reportType,
        activity_id: aid,
        author_id: user.id,
      }));
      const { error } = await (supabase as any)
        .from('report_diary_links')
        .upsert(rows, { onConflict: 'report_id,activity_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary-report-links'] }),
  });

  const unlinkActivity = useMutation({
    mutationFn: async (activityId: string) => {
      if (!reportId) throw new Error('No report');
      const { error } = await (supabase as any)
        .from('report_diary_links')
        .delete()
        .eq('report_id', reportId)
        .eq('activity_id', activityId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diary-report-links'] }),
  });

  // Check if a specific activity is linked to any published report
  const isActivityLinked = (activityId: string): boolean => {
    return links.some(l => l.activity_id === activityId);
  };

  return {
    links,
    isLoading,
    linkActivities: linkActivities.mutateAsync,
    unlinkActivity: unlinkActivity.mutateAsync,
    isActivityLinked,
    linkedActivityIds: new Set(links.map(l => l.activity_id)),
  };
};
