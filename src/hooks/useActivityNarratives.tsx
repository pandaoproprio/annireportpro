import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ActivityNarrative {
  id: string;
  activity_id: string;
  project_id: string;
  user_id: string;
  narrative_text: string;
  status: 'rascunho' | 'aprovado' | 'rejeitado';
  ai_model: string | null;
  edited_by: string | null;
  edited_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  target_reports: string[];
  created_at: string;
  updated_at: string;
}

const TARGET_REPORT_LABELS: Record<string, string> = {
  report_object: 'Relatório do Objeto',
  report_team: 'Relatório da Equipe',
  justification: 'Justificativa',
  institutional: 'Relatório Institucional',
  accountability: 'Prestação de Contas',
};

export function useActivityNarratives(projectId?: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const narrativesQuery = useQuery({
    queryKey: ['activity-narratives', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('activity_narratives')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ActivityNarrative[];
    },
    enabled: !!projectId && !!user,
    staleTime: 60_000,
  });

  const narrativeForActivity = (activityId: string) => {
    return narrativesQuery.data?.find(n => n.activity_id === activityId) || null;
  };

  const generateNarrative = useMutation({
    mutationFn: async (activityId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-activity-narrative', {
        body: { activity_id: activityId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.narrative as ActivityNarrative;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-narratives'] });
      toast.success('Narrativa institucional gerada com sucesso!');
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar narrativa');
    },
  });

  const updateNarrative = useMutation({
    mutationFn: async ({ id, text, targetReports }: { id: string; text: string; targetReports?: string[] }) => {
      const updateData: any = {
        narrative_text: text,
        edited_by: user?.id,
        edited_at: new Date().toISOString(),
      };
      if (targetReports) updateData.target_reports = targetReports;

      const { error } = await supabase
        .from('activity_narratives')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-narratives'] });
      toast.success('Narrativa atualizada');
    },
  });

  const approveNarrative = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activity_narratives')
        .update({
          status: 'aprovado',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-narratives'] });
      toast.success('Narrativa aprovada!');
    },
  });

  const rejectNarrative = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activity_narratives')
        .update({ status: 'rejeitado' } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity-narratives'] });
      toast.info('Narrativa rejeitada');
    },
  });

  // Get approved narratives for a specific report type
  const getApprovedNarratives = (reportType: string) => {
    return (narrativesQuery.data || []).filter(
      n => n.status === 'aprovado' && n.target_reports.includes(reportType)
    );
  };

  return {
    narratives: narrativesQuery.data || [],
    isLoading: narrativesQuery.isLoading,
    narrativeForActivity,
    generateNarrative,
    updateNarrative,
    approveNarrative,
    rejectNarrative,
    getApprovedNarratives,
    TARGET_REPORT_LABELS,
  };
}
