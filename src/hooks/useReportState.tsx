import { useState, useEffect, useRef } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Activity, ActivityType, ReportSection, ExpenseItem, ReportPhotoMeta, PhotoGroup } from '@/types';
import { PageLayout } from '@/types/imageLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSectionManager } from '@/hooks/useSectionManager';
import { useFileUploader, SectionDoc } from '@/hooks/useFileUploader';

export type { SectionDoc } from '@/hooks/useFileUploader';

const DEFAULT_SECTIONS: ReportSection[] = [
  { id: 'object', type: 'fixed', key: 'object', title: 'OBJETO', isVisible: true },
  { id: 'summary', type: 'fixed', key: 'summary', title: 'RESUMO', isVisible: true },
  { id: 'goals', type: 'fixed', key: 'goals', title: 'DEMONSTRAÇÃO DO ALCANCE DAS METAS ESTABELECIDAS', isVisible: true },
  { id: 'other', type: 'fixed', key: 'other', title: 'OUTRAS INFORMAÇÕES SOBRE AS AÇÕES DESENVOLVIDAS', isVisible: true },
  { id: 'communication', type: 'fixed', key: 'communication', title: 'PUBLICAÇÕES E AÇÕES DE DIVULGAÇÃO', isVisible: true },
  { id: 'satisfaction', type: 'fixed', key: 'satisfaction', title: 'GRAU DE SATISFAÇÃO DO PÚBLICO-ALVO', isVisible: true },
  { id: 'future', type: 'fixed', key: 'future', title: 'SOBRE AS AÇÕES FUTURAS', isVisible: true },
  { id: 'expenses', type: 'fixed', key: 'expenses', title: 'COMPROVAÇÃO DA EXECUÇÃO DOS ITENS DE DESPESA', isVisible: true },
  { id: 'links', type: 'fixed', key: 'links', title: 'DOCUMENTOS DE COMPROVAÇÃO DO CUMPRIMENTO DO OBJETO', isVisible: true },
];

export const useReportState = () => {
  const { activeProject: project, updateReportData, activities } = useAppData();

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'docx' | null>(null);
  const [objectText, setObjectText] = useState('');
  const [summary, setSummary] = useState('');
  const [goalNarratives, setGoalNarratives] = useState<Record<string, string>>({});
  const [goalPhotos, setGoalPhotos] = useState<Record<string, string[]>>({});
  const [otherActionsNarrative, setOtherActionsNarrative] = useState('');
  const [otherActionsPhotos, setOtherActionsPhotos] = useState<string[]>([]);
  const [communicationNarrative, setCommunicationNarrative] = useState('');
  const [communicationPhotos, setCommunicationPhotos] = useState<string[]>([]);
  const [satisfaction, setSatisfaction] = useState('');
  const [futureActions, setFutureActions] = useState('');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [links, setLinks] = useState<{ attendance: string; registration: string; media: string }>({ attendance: '', registration: '', media: '' });
  const [linkFileNames, setLinkFileNames] = useState<{ attendance: string; registration: string; media: string }>({ attendance: '', registration: '', media: '' });
  const [photoMetadata, setPhotoMetadata] = useState<Record<string, ReportPhotoMeta[]>>({});
  const [pageLayouts, setPageLayouts] = useState<Record<string, PageLayout>>({});
  const [sectionPhotoGroups, setSectionPhotoGroups] = useState<Record<string, PhotoGroup[]>>({});

  // ── Shared section manager ──
  const sectionManager = useSectionManager({ defaultSections: DEFAULT_SECTIONS, insertBeforeKey: 'expenses' });

  // ── Shared file uploader ──
  const fileUploader = useFileUploader({
    projectId: project?.id,
    basePath: `reports/${project?.id}/sections`,
  });

  // Initialize from project data only when project ID changes (not on every reference change)
  const initializedProjectId = useRef<string | null>(null);

  // Reset ref on unmount so data reloads when navigating back
  useEffect(() => {
    return () => { initializedProjectId.current = null; };
  }, []);

  useEffect(() => {
    if (project && project.id !== initializedProjectId.current) {
      initializedProjectId.current = project.id;
      const rd = project.reportData || {};
      setObjectText(rd.objectOverride || project.object || '');
      setSummary(rd.executiveSummary || project.summary || '');
      setGoalNarratives(rd.goalNarratives || {});
      setGoalPhotos(rd.goalPhotos || {});
      setOtherActionsNarrative(rd.otherActionsText || '');
      setOtherActionsPhotos(rd.otherActionsPhotos || []);
      setCommunicationNarrative(rd.communicationText || '');
      setCommunicationPhotos(rd.communicationPhotos || []);
      setSatisfaction(rd.satisfactionText || '');
      setFutureActions(rd.futureActionsText || '');
      setExpenses(rd.expenses || []);
      if (rd.links) {
        setLinks({
          attendance: rd.links.attendanceList || '',
          registration: rd.links.registrationList || '',
          media: rd.links.mediaFolder || '',
        });
        setLinkFileNames({
          attendance: rd.links.attendanceFileName || '',
          registration: rd.links.registrationFileName || '',
          media: rd.links.mediaFileName || '',
        });
      }
      if (rd.sections && rd.sections.length > 0) {
        sectionManager.setSections(rd.sections);
      }
      fileUploader.setSectionPhotos((rd as any).sectionPhotos || {});
      fileUploader.setSectionDocs((rd as any).sectionDocs || {});
      setPhotoMetadata((rd as any).photoMetadata || {});
      setPageLayouts((rd as any).pageLayouts || {});
      setSectionPhotoGroups((rd as any).sectionPhotoGroups || {});
    }
  }, [project]);

  const saveReportData = async (showToast = true) => {
    try {
      await updateReportData({
        objectOverride: objectText,
        executiveSummary: summary,
        goalNarratives,
        goalPhotos,
        otherActionsText: otherActionsNarrative,
        otherActionsPhotos,
        communicationText: communicationNarrative,
        communicationPhotos,
        satisfactionText: satisfaction,
        futureActionsText: futureActions,
        expenses,
        links: {
          attendanceList: links.attendance,
          registrationList: links.registration,
          mediaFolder: links.media,
          attendanceFileName: linkFileNames.attendance,
          registrationFileName: linkFileNames.registration,
          mediaFileName: linkFileNames.media,
        },
        sections: sectionManager.sections,
        sectionPhotos: fileUploader.sectionPhotos,
        sectionDocs: fileUploader.sectionDocs,
        photoMetadata,
        pageLayouts,
        sectionPhotoGroups,
      } as any);
      if (showToast) toast.success('Rascunho salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar rascunho do relatório:', error);
      toast.error('Erro ao salvar rascunho. Tente novamente.');
    }
  };

  // Expense management
  const addExpense = () => setExpenses([...expenses, { id: Date.now().toString(), itemName: '', description: '', image: '' }]);
  const updateExpense = (id: string, field: keyof ExpenseItem, value: string) => {
    setExpenses(expenses.map(e => (e.id === id ? { ...e, [field]: value } : e)));
  };
  const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

  // Photo uploads (generic + goal-specific)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (const file of Array.from(e.target.files)) {
        try {
          const photoId = crypto.randomUUID();
          const fileExt = file.name.split('.').pop() || 'jpg';
          const filePath = `reports/${project?.id}/${photoId}.${fileExt}`;
          const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
          if (error) { toast.error(`Erro ao enviar foto: ${file.name}`); continue; }
          const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
          setter(prev => [...prev, urlData.publicUrl]);
          toast.success(`Foto ${file.name} enviada com sucesso`);
        } catch { toast.error(`Erro ao processar foto: ${file.name}`); }
      }
      e.target.value = '';
    }
  };

  const handleGoalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, goalId: string) => {
    if (e.target.files && e.target.files.length > 0) {
      for (const file of Array.from(e.target.files)) {
        try {
          const photoId = crypto.randomUUID();
          const fileExt = file.name.split('.').pop() || 'jpg';
          const filePath = `reports/${project?.id}/goals/${goalId}/${photoId}.${fileExt}`;
          const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
          if (error) { toast.error(`Erro ao enviar foto: ${file.name}`); continue; }
          const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
          setGoalPhotos(prev => ({ ...prev, [goalId]: [...(prev[goalId] || []), urlData.publicUrl] }));
          toast.success(`Foto ${file.name} enviada com sucesso`);
        } catch { toast.error(`Erro ao processar foto: ${file.name}`); }
      }
      e.target.value = '';
    }
  };

  const removeGoalPhoto = async (goalId: string, index: number) => {
    const photoUrl = goalPhotos[goalId]?.[index];
    if (photoUrl && !photoUrl.startsWith('data:')) {
      try {
        const urlParts = new URL(photoUrl).pathname.split('/');
        const filePath = urlParts.slice(-5).join('/');
        await supabase.storage.from('team-report-photos').remove([filePath]);
      } catch { /* still remove from UI */ }
    }
    setGoalPhotos(prev => ({ ...prev, [goalId]: (prev[goalId] || []).filter((_, i) => i !== index) }));
  };

  const handleExpenseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, expenseId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const photoId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `reports/${project?.id}/expenses/${photoId}.${fileExt}`;
        const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (error) { toast.error(`Erro ao enviar imagem: ${file.name}`); return; }
        const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
        updateExpense(expenseId, 'image', urlData.publicUrl);
        toast.success(`Imagem ${file.name} enviada com sucesso`);
      } catch { toast.error(`Erro ao processar imagem: ${file.name}`); }
    }
  };

  // Activity helpers
  const getActivitiesByGoal = (goalId: string) =>
    activities.filter(a => a.goalId === goalId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCommunicationActivities = () =>
    activities.filter(a => a.type === ActivityType.COMUNICACAO).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOtherActivities = () =>
    activities.filter(a => a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO || a.type === ActivityType.OCORRENCIA)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const formatActivityDate = (date: string, endDate?: string) => {
    const start = new Date(date).toLocaleDateString('pt-BR');
    if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
    return start;
  };

  // Photo metadata helpers
  const updatePhotoCaption = (key: string, index: number, caption: string) => {
    setPhotoMetadata(prev => {
      const metas = [...(prev[key] || [])];
      while (metas.length <= index) metas.push({ caption: '', size: 'medium' });
      metas[index] = { ...metas[index], caption };
      return { ...prev, [key]: metas };
    });
  };

  const updatePhotoSize = (key: string, index: number, size: ReportPhotoMeta['size'], widthPercent?: number) => {
    setPhotoMetadata(prev => {
      const metas = [...(prev[key] || [])];
      while (metas.length <= index) metas.push({ caption: '', size: 'medium' });
      metas[index] = { ...metas[index], size, ...(widthPercent !== undefined ? { widthPercent } : {}) };
      return { ...prev, [key]: metas };
    });
  };

  const replacePhotoUrl = (key: string, index: number, newUrl: string,
    photosSetter: React.Dispatch<React.SetStateAction<string[]>> | null,
    goalId?: string
  ) => {
    if (goalId) {
      setGoalPhotos(prev => {
        const photos = [...(prev[goalId] || [])];
        photos[index] = newUrl;
        return { ...prev, [goalId]: photos };
      });
    } else if (photosSetter) {
      photosSetter(prev => {
        const photos = [...prev];
        photos[index] = newUrl;
        return photos;
      });
    } else {
      // section photos
      fileUploader.setSectionPhotos(prev => {
        const photos = [...(prev[key] || [])];
        photos[index] = newUrl;
        return { ...prev, [key]: photos };
      });
    }
  };

  // Document upload for links section
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, linkField: 'attendance' | 'registration' | 'media') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const fileId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'pdf';
        const folderMap = { attendance: 'listas-presenca', registration: 'listas-inscricao', media: 'midias' };
        const filePath = `reports/${project?.id}/documentos/${folderMap[linkField]}/${fileId}.${fileExt}`;
        const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (error) { toast.error(`Erro ao enviar documento: ${file.name}`); return; }
        const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
        setLinks(prev => ({ ...prev, [linkField]: urlData.publicUrl }));
        setLinkFileNames(prev => ({ ...prev, [linkField]: file.name }));
        toast.success(`Documento "${file.name}" enviado com sucesso`);
      } catch { toast.error(`Erro ao processar documento: ${file.name}`); }
      e.target.value = '';
    }
  };

  return {
    project, activities,
    mode, setMode, isExporting, setIsExporting, exportType, setExportType,
    objectText, setObjectText, summary, setSummary,
    goalNarratives, setGoalNarratives, goalPhotos, setGoalPhotos,
    otherActionsNarrative, setOtherActionsNarrative, otherActionsPhotos, setOtherActionsPhotos,
    communicationNarrative, setCommunicationNarrative, communicationPhotos, setCommunicationPhotos,
    satisfaction, setSatisfaction, futureActions, setFutureActions,
    expenses, links, setLinks, linkFileNames, setLinkFileNames,
    sections: sectionManager.sections,
    sectionPhotos: fileUploader.sectionPhotos,
    sectionDocs: fileUploader.sectionDocs,
    photoMetadata, updatePhotoCaption, updatePhotoSize, replacePhotoUrl,
    pageLayouts, setPageLayouts,
    sectionPhotoGroups, setSectionPhotoGroups,
    saveReportData,
    moveSection: sectionManager.moveSection,
    toggleVisibility: sectionManager.toggleVisibility,
    updateSectionTitle: sectionManager.updateSectionTitle,
    updateCustomContent: sectionManager.updateCustomContent,
    addCustomSection: sectionManager.addCustomSection,
    removeSection: sectionManager.removeSection,
    pendingRemoveIndex: sectionManager.pendingRemoveIndex,
    confirmRemoveSection: sectionManager.confirmRemoveSection,
    cancelRemoveSection: sectionManager.cancelRemoveSection,
    addExpense, updateExpense, removeExpense,
    handlePhotoUpload, handleGoalPhotoUpload, removeGoalPhoto, handleExpenseImageUpload,
    handleDocumentUpload,
    handleSectionPhotoUpload: fileUploader.handleSectionPhotoUpload,
    removeSectionPhoto: fileUploader.removeSectionPhoto,
    handleSectionDocUpload: fileUploader.handleSectionDocUpload,
    removeSectionDoc: fileUploader.removeSectionDoc,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
  };
};
