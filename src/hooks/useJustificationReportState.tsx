import { useState, useEffect, useCallback } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ReportSection } from '@/types';
import { JustificationReport, JustificationReportDraft } from '@/types/justificationReport';

export interface AttachmentFile {
  name: string;
  url: string;
}

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
  const { user, role } = useAuth();
  const isSuperAdmin = role === 'SUPER_ADMIN';

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
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([]);
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, string[]>>({});
  const [sectionDocs, setSectionDocs] = useState<Record<string, AttachmentFile[]>>({});

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
        attachmentFiles: d.attachment_files || [],
        sectionPhotos: d.section_photos || {},
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
    setAttachmentFiles([]);
    setSectionPhotos({});
    setSectionDocs({});
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
    setAttachmentFiles(draft.attachmentFiles || []);
    setSectionPhotos(draft.sectionPhotos || {});
    setSectionDocs((draft as any).sectionDocs || {});
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

  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);

  const removeSection = (index: number) => {
    setPendingRemoveIndex(index);
  };

  const confirmRemoveSection = () => {
    if (pendingRemoveIndex !== null) {
      setSections(sections.filter((_, i) => i !== pendingRemoveIndex));
      setPendingRemoveIndex(null);
    }
  };

  const cancelRemoveSection = () => {
    setPendingRemoveIndex(null);
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
        attachment_files: attachmentFiles as any,
        section_photos: sectionPhotos as any,
        section_docs: sectionDocs as any,
        is_draft: true,
      };

      if (currentDraftId) {
        // On update, don't override user_id (SuperAdmin editing another user's draft)
        const { user_id, ...updatePayload } = payload;
        const { error } = await supabase
          .from('justification_reports')
          .update(updatePayload)
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

  const hasContent = Object.values(sectionContents).some(v => v.trim() !== '') || attachmentFiles.length > 0;

  // Document upload handler
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !project?.id) return;
    const file = e.target.files[0];
    try {
      const fileId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'pdf';
      const filePath = `reports/${project.id}/justificativas/${fileId}.${fileExt}`;
      const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error(`Erro ao enviar documento: ${file.name}`); return; }
      const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
      setAttachmentFiles(prev => [...prev, { name: file.name, url: urlData.publicUrl }]);
      toast.success(`Documento "${file.name}" enviado com sucesso`);
    } catch { toast.error(`Erro ao processar documento: ${file.name}`); }
    e.target.value = '';
  };

  // Section photo upload
  const handleSectionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => {
    if (!e.target.files || !e.target.files.length || !project?.id) return;
    for (const file of Array.from(e.target.files)) {
      try {
        const photoId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `reports/${project.id}/justificativas/photos/${sectionKey}/${photoId}.${fileExt}`;
        const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (error) { toast.error(`Erro ao enviar foto: ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
        setSectionPhotos(prev => ({
          ...prev,
          [sectionKey]: [...(prev[sectionKey] || []), urlData.publicUrl],
        }));
      } catch { toast.error(`Erro ao processar foto: ${file.name}`); }
    }
    e.target.value = '';
    toast.success('Foto(s) enviada(s) com sucesso!');
  };

  const removeSectionPhoto = async (sectionKey: string, index: number) => {
    const photos = sectionPhotos[sectionKey] || [];
    const photoUrl = photos[index];
    if (photoUrl) {
      try {
        const urlParts = new URL(photoUrl).pathname.split('/');
        const filePath = urlParts.slice(-5).join('/');
        await supabase.storage.from('team-report-photos').remove([filePath]);
      } catch { /* still remove from UI */ }
    }
    setSectionPhotos(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((_, i) => i !== index),
    }));
  };

  const removeAttachmentFile = async (index: number) => {
    const file = attachmentFiles[index];
    if (file?.url) {
      try {
        const urlParts = new URL(file.url).pathname.split('/');
        const filePath = urlParts.slice(-4).join('/');
        await supabase.storage.from('team-report-photos').remove([filePath]);
      } catch { /* still remove from UI */ }
    }
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Per-section document upload
  const handleSectionDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => {
    if (!e.target.files || !e.target.files[0] || !project?.id) return;
    const file = e.target.files[0];
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Arquivo excede o tamanho máximo de 20MB.');
      e.target.value = '';
      return;
    }
    try {
      const fileId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'pdf';
      const filePath = `reports/${project.id}/justificativas/docs/${sectionKey}/${fileId}.${fileExt}`;
      const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) { toast.error(`Erro ao enviar documento: ${file.name}`); return; }
      const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
      setSectionDocs(prev => ({
        ...prev,
        [sectionKey]: [...(prev[sectionKey] || []), { name: file.name, url: urlData.publicUrl }],
      }));
      toast.success(`Documento "${file.name}" enviado com sucesso`);
    } catch { toast.error(`Erro ao processar documento: ${file.name}`); }
    e.target.value = '';
  };

  const removeSectionDoc = async (sectionKey: string, index: number) => {
    const docs = sectionDocs[sectionKey] || [];
    const doc = docs[index];
    if (doc?.url) {
      try {
        const urlParts = new URL(doc.url).pathname.split('/');
        const filePath = urlParts.slice(-5).join('/');
        await supabase.storage.from('team-report-photos').remove([filePath]);
      } catch { /* still remove from UI */ }
    }
    setSectionDocs(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((_, i) => i !== index),
    }));
  };

  return {
    project,
    mode, setMode,
    isExporting, setIsExporting,
    exportType, setExportType,
    showDraftsList, setShowDraftsList,
    currentDraftId,
    drafts, isLoading, isSaving,
    sections, sectionContents,
    attachmentFiles, sectionPhotos,
    SECTION_PLACEHOLDERS,
    hasContent,
    resetForm, loadDraft,
    updateSectionContent,
    moveSection, toggleVisibility, updateSectionTitle, updateCustomContent,
    addCustomSection, removeSection,
    pendingRemoveIndex, confirmRemoveSection, cancelRemoveSection,
    saveDraft, deleteDraft,
    buildReportData,
    handleDocumentUpload, removeAttachmentFile,
    handleSectionPhotoUpload, removeSectionPhoto,
    handleSectionDocUpload, removeSectionDoc,
    sectionDocs,
  };
};
