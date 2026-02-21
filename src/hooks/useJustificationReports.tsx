import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { JustificationReport, JustificationReportDraft } from '@/types/justificationReport';
import { toast } from 'sonner';

export const useJustificationReports = (projectId?: string) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<JustificationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDrafts = useCallback(async () => {
    if (!projectId || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('justification_reports')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setDrafts((data || []).map((d: any) => ({
        id: d.id,
        projectId: d.project_id,
        objectSection: d.object_section,
        justificationSection: d.justification_section,
        executedActionsSection: d.executed_actions_section,
        futureActionsSection: d.future_actions_section,
        requestedDeadlineSection: d.requested_deadline_section,
        attachmentsSection: d.attachments_section,
        newDeadlineDate: d.new_deadline_date,
        isDraft: d.is_draft,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })));
    } catch (error) {
      console.error('Error fetching justification reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const saveDraft = async (draft: JustificationReportDraft): Promise<string | null> => {
    if (!user || !projectId) return null;
    setIsSaving(true);
    try {
      const payload = {
        project_id: projectId,
        user_id: user.id,
        object_section: draft.objectSection,
        justification_section: draft.justificationSection,
        executed_actions_section: draft.executedActionsSection,
        future_actions_section: draft.futureActionsSection,
        requested_deadline_section: draft.requestedDeadlineSection,
        attachments_section: draft.attachmentsSection,
        new_deadline_date: draft.newDeadlineDate || null,
        is_draft: draft.isDraft,
      };

      if (draft.id) {
        const { error } = await supabase
          .from('justification_reports')
          .update(payload)
          .eq('id', draft.id);
        if (error) throw error;
        await fetchDrafts();
        return draft.id;
      } else {
        const { data, error } = await supabase
          .from('justification_reports')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        await fetchDrafts();
        return data.id;
      }
    } catch (error) {
      console.error('Error saving justification report:', error);
      toast.error('Erro ao salvar justificativa');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      const { error } = await supabase
        .from('justification_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Justificativa excluída');
      await fetchDrafts();
    } catch (error) {
      console.error('Error deleting justification report:', error);
      toast.error('Erro ao excluir justificativa');
    }
  };

  return { drafts, isLoading, isSaving, saveDraft, deleteDraft };
};
