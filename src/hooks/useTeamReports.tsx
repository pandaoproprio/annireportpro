import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PhotoWithCaption, AdditionalSection } from '@/types';
import type { Json } from '@/integrations/supabase/types';
import { logAuditEvent } from '@/lib/auditLog';
import { createAsanaTaskOnPublish } from '@/lib/asanaAutoTask';

export interface TeamReportDraft {
  id: string;
  projectId: string;
  teamMemberId: string;
  providerName: string;
  providerDocument: string;
  responsibleName: string;
  functionRole: string;
  periodStart: string;
  periodEnd: string;
  executionReport: string;
  photos: string[];
  photoCaptions: PhotoWithCaption[];
  reportTitle: string;
  executionReportTitle: string;
  attachmentsTitle: string;
  additionalSections: AdditionalSection[];
  footerText: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

const mapRowToDraft = (row: any): TeamReportDraft => ({
  id: row.id,
  projectId: row.project_id,
  teamMemberId: row.team_member_id,
  providerName: row.provider_name,
  providerDocument: row.provider_document,
  responsibleName: row.responsible_name,
  functionRole: row.function_role,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  executionReport: row.execution_report,
  photos: row.photos || [],
  photoCaptions: (row.photo_captions as unknown as PhotoWithCaption[]) || [],
  reportTitle: row.report_title || 'RELATÓRIO DA EQUIPE DE TRABALHO',
  executionReportTitle: row.execution_report_title || '2. Relato de Execução da Coordenação do Projeto',
  attachmentsTitle: row.attachments_title || '3. Anexos de Comprovação',
  additionalSections: (row.additional_sections as unknown as AdditionalSection[]) || [],
  footerText: row.footer_text || '',
  isDraft: row.is_draft ?? true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fetchDraftsFromDb = async (
  userId: string,
  isAdmin: boolean,
  projectId: string
): Promise<TeamReportDraft[]> => {
  let query = supabase
    .from('team_reports')
    .select('*')
    .eq('project_id', projectId);

  if (!isAdmin) query = query.eq('user_id', userId);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRowToDraft);
};

export const useTeamReports = (projectId?: string) => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ['team-reports', user?.id, isAdmin, projectId],
    queryFn: () => fetchDraftsFromDb(user!.id, isAdmin, projectId!),
    enabled: !!user && !!projectId,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['team-reports'] });

  const saveDraftMutation = useMutation({
    mutationFn: async (draft: Omit<TeamReportDraft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      if (!user || !projectId) throw new Error('Invalid');

      const reportData = {
        project_id: projectId,
        user_id: user.id,
        team_member_id: draft.teamMemberId || '',
        provider_name: draft.providerName || '',
        provider_document: draft.providerDocument || '',
        responsible_name: draft.responsibleName,
        function_role: draft.functionRole,
        period_start: draft.periodStart,
        period_end: draft.periodEnd,
        execution_report: draft.executionReport,
        photos: draft.photos,
        photo_captions: draft.photoCaptions as unknown as Json,
        report_title: draft.reportTitle || 'RELATÓRIO DA EQUIPE DE TRABALHO',
        execution_report_title: draft.executionReportTitle || '2. Relato de Execução da Coordenação do Projeto',
        attachments_title: draft.attachmentsTitle || '3. Anexos de Comprovação',
        additional_sections: draft.additionalSections as unknown as Json,
        footer_text: draft.footerText || null,
        is_draft: draft.isDraft,
      };

      if (draft.id) {
        let query = supabase
          .from('team_reports')
          .update(reportData)
          .eq('id', draft.id);
        if (!isAdmin) query = query.eq('user_id', user.id);
        const { data, error } = await query.select().single();
        if (error) throw error;
        return data?.id;
      } else {
        const { data, error } = await supabase
          .from('team_reports')
          .insert(reportData)
          .select()
          .single();
        if (error) throw error;
        return data?.id;
      }
    },
    onSuccess: (savedId, variables) => {
      invalidate();
      if (!variables.isDraft && savedId && projectId) {
        createAsanaTaskOnPublish({
          entityType: 'team_report',
          entityId: savedId,
          projectId,
          name: `[Relatório Equipe] ${variables.providerName} - ${variables.periodStart} a ${variables.periodEnd}`,
          notes: `Função: ${variables.functionRole}\nResponsável: ${variables.responsibleName}`,
        });
      }
    },
    onError: () => toast.error('Erro ao salvar rascunho'),
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      if (!user) throw new Error('Not authenticated');
      const draftToDelete = drafts.find(d => d.id === draftId);
      let query = supabase
        .from('team_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', draftId);
      if (!isAdmin) query = query.eq('user_id', user.id);
      const { error } = await query;
      if (error) throw error;
      await logAuditEvent({ userId: user.id, action: 'DELETE', entityType: 'team_reports', entityId: draftId, entityName: draftToDelete?.providerName });
    },
    onMutate: async (draftId) => {
      await queryClient.cancelQueries({ queryKey: ['team-reports'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['team-reports'] });
      queryClient.setQueriesData({ queryKey: ['team-reports'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((d: TeamReportDraft) => d.id !== draftId);
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Erro ao excluir rascunho');
    },
    onSuccess: () => toast.success('Rascunho excluído'),
    onSettled: () => invalidate(),
  });

  return {
    drafts,
    isLoading,
    isSaving: saveDraftMutation.isPending,
    saveDraft: async (draft: Omit<TeamReportDraft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
      try { return await saveDraftMutation.mutateAsync(draft); } catch { return null; }
    },
    deleteDraft: async (draftId: string) => {
      try { await deleteDraftMutation.mutateAsync(draftId); return true; } catch { return false; }
    },
    refetch: () => invalidate(),
  };
};
