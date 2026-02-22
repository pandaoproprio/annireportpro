import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReportSection } from '@/types';
import { JustificationReport, JustificationReportDraft } from '@/types/justificationReport';

const DEFAULT_SECTIONS: ReportSection[] = [
  { id: 'object', type: 'fixed', key: 'objectSection', title: 'DO OBJETO DO TERMO ADITIVO', isVisible: true },
  { id: 'justification', type: 'fixed', key: 'justificationSection', title: 'DA JUSTIFICATIVA PARA A PRORROGAÇÃO', isVisible: true },
  { id: 'executedActions', type: 'fixed', key: 'executedActionsSection', title: 'DAS AÇÕES JÁ EXECUTADAS (RESULTADOS PARCIAIS)', isVisible: true },
  { id: 'futureActions', type: 'fixed', key: 'futureActionsSection', title: 'DAS AÇÕES FUTURAS PREVISTAS NO PERÍODO DE PRORROGAÇÃO', isVisible: true },
  { id: 'requestedDeadline', type: 'fixed', key: 'requestedDeadlineSection', title: 'DO PRAZO SOLICITADO', isVisible: true },
  { id: 'attachments', type: 'fixed', key: 'attachmentsSection', title: 'ANEXOS', isVisible: true },
];

export type JustificationSectionKey = 
  | 'objectSection'
  | 'justificationSection'
  | 'executedActionsSection'
  | 'futureActionsSection'
  | 'requestedDeadlineSection'
  | 'attachmentsSection';

const SECTION_PLACEHOLDERS: Record<string, string> = {
  objectSection: 'Descreva o objeto do termo aditivo, incluindo o prazo de prorrogação solicitado e as finalidades...',
  justificationSection: 'Apresente os aspectos que fundamentam a solicitação de prorrogação...',
  executedActionsSection: 'Descreva os resultados alcançados até o momento...',
  futureActionsSection: 'Descreva as ações previstas durante o período de prorrogação...',
  requestedDeadlineSection: 'Informe o prazo solicitado e a destinação do período adicional...',
  attachmentsSection: 'Liste os anexos comprobatórios que acompanham esta justificativa...',
};

export const useJustificationReportState = () => {
  const { activeProject: project } = useAppData();
  const { user } = useAuth();

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'docx' | null>(null);
  const [showDraftsList, setShowDraftsList] = useState(true);
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>();

  const [drafts, setDrafts] = useState<JustificationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);
  const [sectionContents, setSectionContents] = useState<Record<JustificationSectionKey, string>>({
    objectSection: '',
    justificationSection: '',
    executedActionsSection: '',
    futureActionsSection: '',
    requestedDeadlineSection: '',
    attachmentsSection: '',
  });

  // Fetch drafts
  const fetchDrafts = useCallback(async () => {
    if (!project?.id || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('justification_reports')
        .select('*')
        .eq('project_id', project.id)
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
  }, [project?.id, user]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // Reset form
  const resetForm = () => {
    setCurrentDraftId(undefined);
    setSectionContents({
      objectSection: '', justificationSection: '', executedActionsSection: '',
      futureActionsSection: '', requestedDeadlineSection: '', attachmentsSection: '',
    });
    setSections(DEFAULT_SECTIONS);
    setMode('edit');
  };

  // Load draft
  const loadDraft = (draft: JustificationReport) => {
    setCurrentDraftId(draft.id);
    setSectionContents({
      objectSection: draft.objectSection,
      justificationSection: draft.justificationSection,
      executedActionsSection: draft.executedActionsSection,
      futureActionsSection: draft.futureActionsSection,
      requestedDeadlineSection: draft.requestedDeadlineSection,
      attachmentsSection: draft.attachmentsSection,
    });
    // TODO: load saved sections ordering if persisted
    setSections(DEFAULT_SECTIONS);
    setShowDraftsList(false);
  };

  // Update section content
  const updateSectionContent = (key: JustificationSectionKey, value: string) => {
    setSectionContents(prev => ({ ...prev, [key]: value }));
  };

  // Section management (same pattern as ReportStructureEditor)
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    } else if (direction === 'down' && index < newSections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    }
    setSections(newSections);
  };

  const toggleVisibility = (index: number) => {
    const newSections = [...sections];
    newSections[index].isVisible = !newSections[index].isVisible;
    setSections(newSections);
  };

  const updateSectionTitle = (index: number, newTitle: string) => {
    const newSections = [...sections];
    newSections[index].title = newTitle;
    setSections(newSections);
  };

  const updateCustomContent = (index: number, content: string) => {
    const newSections = [...sections];
    newSections[index].content = content;
    setSections(newSections);
  };

  const addCustomSection = () => {
    const newSection: ReportSection = {
      id: `custom_${Date.now()}`,
      type: 'custom',
      key: 'custom',
      title: 'Nova Seção',
      content: '',
      isVisible: true,
    };
    const attachmentsIndex = sections.findIndex(s => s.key === 'attachmentsSection');
    if (attachmentsIndex !== -1) {
      const newArr = [...sections];
      newArr.splice(attachmentsIndex, 0, newSection);
      setSections(newArr);
    } else {
      setSections([...sections, newSection]);
    }
  };

  const removeSection = (index: number) => {
    if (confirm('Tem certeza que deseja remover esta seção?')) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  // Save draft
  const saveDraft = async () => {
    if (!user || !project?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        project_id: project.id,
        user_id: user.id,
        object_section: sectionContents.objectSection,
        justification_section: sectionContents.justificationSection,
        executed_actions_section: sectionContents.executedActionsSection,
        future_actions_section: sectionContents.futureActionsSection,
        requested_deadline_section: sectionContents.requestedDeadlineSection,
        attachments_section: sectionContents.attachmentsSection,
        is_draft: true,
      };

      if (currentDraftId) {
        const { error } = await supabase
          .from('justification_reports')
          .update(payload)
          .eq('id', currentDraftId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('justification_reports')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        setCurrentDraftId(data.id);
      }
      await fetchDrafts();
      toast.success('Rascunho salvo com sucesso!');
    } catch (error) {
      console.error('Error saving justification report:', error);
      toast.error('Erro ao salvar justificativa');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete draft
  const deleteDraft = async (id: string) => {
    try {
      const { error } = await supabase
        .from('justification_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success('Justificativa excluída');
      await fetchDrafts();
      if (currentDraftId === id) {
        resetForm();
        setShowDraftsList(true);
      }
    } catch (error) {
      console.error('Error deleting justification report:', error);
      toast.error('Erro ao excluir justificativa');
    }
  };

  // Build report data for export
  const buildReportData = (): JustificationReport => ({
    id: currentDraftId || crypto.randomUUID(),
    projectId: project?.id || '',
    ...sectionContents,
    isDraft: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const hasContent = Object.values(sectionContents).some(v => v.trim() !== '');

  return {
    project,
    mode, setMode,
    isExporting, setIsExporting,
    exportType, setExportType,
    showDraftsList, setShowDraftsList,
    currentDraftId,
    drafts, isLoading, isSaving,
    sections, sectionContents,
    SECTION_PLACEHOLDERS,
    hasContent,
    resetForm, loadDraft,
    updateSectionContent,
    moveSection, toggleVisibility, updateSectionTitle, updateCustomContent,
    addCustomSection, removeSection,
    saveDraft, deleteDraft,
    buildReportData,
  };
};
