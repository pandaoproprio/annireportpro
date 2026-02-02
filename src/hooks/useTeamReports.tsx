import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PhotoWithCaption } from '@/types';
import type { Json } from '@/integrations/supabase/types';

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
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useTeamReports = (projectId?: string) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<TeamReportDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch drafts for the current project
  const fetchDrafts = async () => {
    if (!user || !projectId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mappedDrafts: TeamReportDraft[] = (data || []).map((row) => ({
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
        isDraft: row.is_draft ?? true,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setDrafts(mappedDrafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [user, projectId]);

  // Save or update a draft
  const saveDraft = async (draft: Omit<TeamReportDraft, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!user || !projectId) return null;

    setIsSaving(true);
    try {
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
        is_draft: draft.isDraft,
      };

      if (draft.id) {
        // Update existing draft
        const { data, error } = await supabase
          .from('team_reports')
          .update(reportData)
          .eq('id', draft.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        await fetchDrafts();
        return data?.id;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('team_reports')
          .insert(reportData)
          .select()
          .single();

        if (error) throw error;
        await fetchDrafts();
        return data?.id;
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Erro ao salvar rascunho');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a draft
  const deleteDraft = async (draftId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('team_reports')
        .delete()
        .eq('id', draftId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchDrafts();
      toast.success('Rascunho excluído');
      return true;
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Erro ao excluir rascunho');
      return false;
    }
  };

  return {
    drafts,
    isLoading,
    isSaving,
    saveDraft,
    deleteDraft,
    refetch: fetchDrafts,
  };
};
