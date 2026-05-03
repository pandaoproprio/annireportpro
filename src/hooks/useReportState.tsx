import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Activity, ActivityType, ReportSection, ExpenseItem, ReportPhotoMeta, PhotoGroup, ActivityOverride } from '@/types';
import { PageLayout } from '@/types/imageLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';
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
  const [linkDisplayNames, setLinkDisplayNames] = useState<{ attendance: string; registration: string; media: string }>({ attendance: '', registration: '', media: '' });
  const [photoMetadata, setPhotoMetadata] = useState<Record<string, ReportPhotoMeta[]>>({});
  const [pageLayouts, setPageLayouts] = useState<Record<string, PageLayout>>({});
  const [sectionPhotoGroups, setSectionPhotoGroups] = useState<Record<string, PhotoGroup[]>>({});
  const [selectedVideoUrls, setSelectedVideoUrls] = useState<string[]>([]);
  const [activityOverrides, setActivityOverrides] = useState<Record<string, ActivityOverride>>({});
  const [hideActivitiesBySection, setHideActivitiesBySection] = useState<Record<string, boolean>>({});

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
        setLinkDisplayNames({
          attendance: rd.links.attendanceDisplayName || '',
          registration: rd.links.registrationDisplayName || '',
          media: rd.links.mediaDisplayName || '',
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
      setSelectedVideoUrls((rd as any).selectedVideoUrls || []);
      setActivityOverrides((rd as any).activityOverrides || {});
      setHideActivitiesBySection((rd as any).hideActivitiesBySection || {});
    }
  }, [project]);

  // ── Auto-save debounce ──
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);
  const autoSaveGeneration = useRef(0);

  const buildReportPayload = useCallback(() => ({
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
      attendanceDisplayName: linkDisplayNames.attendance,
      registrationDisplayName: linkDisplayNames.registration,
      mediaDisplayName: linkDisplayNames.media,
    },
    sections: sectionManager.sections,
    sectionPhotos: fileUploader.sectionPhotos,
    sectionDocs: fileUploader.sectionDocs,
    photoMetadata,
    pageLayouts,
    sectionPhotoGroups,
    selectedVideoUrls,
    activityOverrides,
    hideActivitiesBySection,
  }), [objectText, summary, goalNarratives, goalPhotos, otherActionsNarrative, otherActionsPhotos,
    communicationNarrative, communicationPhotos, satisfaction, futureActions, expenses,
    links, linkFileNames, linkDisplayNames, sectionManager.sections, fileUploader.sectionPhotos,
    fileUploader.sectionDocs, photoMetadata, pageLayouts, sectionPhotoGroups, selectedVideoUrls, activityOverrides, hideActivitiesBySection]);

  const saveReportData = async (showToast = true) => {
    try {
      await updateReportData(buildReportPayload() as any);
      if (showToast) toast.success('Rascunho salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar rascunho do relatório:', error);
      toast.error('Erro ao salvar rascunho. Tente novamente.');
    }
  };

  // ── Collaboration broadcast callback ──
  const broadcastRef = useRef<((data: any) => void) | null>(null);
  const setBroadcastCallback = useCallback((fn: ((data: any) => void) | null) => {
    broadcastRef.current = fn;
  }, []);

  /** Apply remote data from another collaborator */
  const applyRemoteData = useCallback((rd: any) => {
    if (!rd) return;
    if (rd.objectOverride !== undefined) setObjectText(rd.objectOverride);
    if (rd.executiveSummary !== undefined) setSummary(rd.executiveSummary);
    if (rd.goalNarratives) setGoalNarratives(rd.goalNarratives);
    if (rd.goalPhotos) setGoalPhotos(rd.goalPhotos);
    if (rd.otherActionsText !== undefined) setOtherActionsNarrative(rd.otherActionsText);
    if (rd.otherActionsPhotos) setOtherActionsPhotos(rd.otherActionsPhotos);
    if (rd.communicationText !== undefined) setCommunicationNarrative(rd.communicationText);
    if (rd.communicationPhotos) setCommunicationPhotos(rd.communicationPhotos);
    if (rd.satisfactionText !== undefined) setSatisfaction(rd.satisfactionText);
    if (rd.futureActionsText !== undefined) setFutureActions(rd.futureActionsText);
    if (rd.expenses) setExpenses(rd.expenses);
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
      setLinkDisplayNames({
        attendance: rd.links.attendanceDisplayName || '',
        registration: rd.links.registrationDisplayName || '',
        media: rd.links.mediaDisplayName || '',
      });
    }
    if (rd.sections) sectionManager.setSections(rd.sections);
    if (rd.sectionPhotos) fileUploader.setSectionPhotos(rd.sectionPhotos);
    if (rd.sectionDocs) fileUploader.setSectionDocs(rd.sectionDocs);
    if (rd.photoMetadata) setPhotoMetadata(rd.photoMetadata);
    if (rd.pageLayouts) setPageLayouts(rd.pageLayouts);
    if (rd.sectionPhotoGroups) setSectionPhotoGroups(rd.sectionPhotoGroups);
    if (rd.selectedVideoUrls) setSelectedVideoUrls(rd.selectedVideoUrls);
    if (rd.activityOverrides) setActivityOverrides(rd.activityOverrides);
    if (rd.hideActivitiesBySection) setHideActivitiesBySection(rd.hideActivitiesBySection);
  }, []);

  // Auto-save: debounce 3s after any content change
  useEffect(() => {
    if (!initializedProjectId.current || initializedProjectId.current !== project?.id) return;
    autoSaveGeneration.current += 1;
    const gen = autoSaveGeneration.current;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (gen !== autoSaveGeneration.current) return; // stale
      if (isSaving.current) return;
      isSaving.current = true;
      try {
        const payload = buildReportPayload();
        await updateReportData(payload as any);
        // Broadcast to collaborators
        broadcastRef.current?.(payload);
      } catch (e) {
        console.error('Auto-save falhou:', e);
      } finally {
        isSaving.current = false;
      }
    }, 3000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [buildReportPayload, project?.id]);

  // Expense management
  const addExpense = () => setExpenses([...expenses, { id: Date.now().toString(), itemName: '', description: '', image: '' }]);
  const updateExpense = (id: string, field: keyof ExpenseItem, value: string) => {
    setExpenses(expenses.map(e => (e.id === id ? { ...e, [field]: value } : e)));
  };
  const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

  // Photo uploads (generic + goal-specific)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (const rawFile of Array.from(e.target.files)) {
        try {
          const file = await compressImage(rawFile, { maxWidth: 1920, maxHeight: 1920, quality: 0.8 });
          const photoId = crypto.randomUUID();
          const fileExt = file.name.split('.').pop() || 'jpg';
          const filePath = `reports/${project?.id}/${photoId}.${fileExt}`;
          const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
          if (error) { toast.error(`Erro ao enviar foto: ${rawFile.name}`); continue; }
          const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
          setter(prev => [...prev, urlData.publicUrl]);
          toast.success(`Foto ${rawFile.name} enviada com sucesso`);
        } catch { toast.error(`Erro ao processar foto: ${rawFile.name}`); }
      }
      e.target.value = '';
    }
  };

  const handleGoalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, goalId: string) => {
    if (e.target.files && e.target.files.length > 0) {
      for (const rawFile of Array.from(e.target.files)) {
        try {
          const file = await compressImage(rawFile, { maxWidth: 1920, maxHeight: 1920, quality: 0.8 });
          const photoId = crypto.randomUUID();
          const fileExt = file.name.split('.').pop() || 'jpg';
          const filePath = `reports/${project?.id}/goals/${goalId}/${photoId}.${fileExt}`;
          const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
          if (error) { toast.error(`Erro ao enviar foto: ${rawFile.name}`); continue; }
          const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
          setGoalPhotos(prev => ({ ...prev, [goalId]: [...(prev[goalId] || []), urlData.publicUrl] }));
          toast.success(`Foto ${rawFile.name} enviada com sucesso`);
        } catch { toast.error(`Erro ao processar foto: ${rawFile.name}`); }
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

  const reorderGoalPhotos = (goalId: string, oldIndex: number, newIndex: number) => {
    setGoalPhotos(prev => {
      const photos = [...(prev[goalId] || [])];
      const [moved] = photos.splice(oldIndex, 1);
      photos.splice(newIndex, 0, moved);
      return { ...prev, [goalId]: photos };
    });
    setPhotoMetadata(prev => {
      const metas = [...(prev[goalId] || [])];
      const [moved] = metas.splice(oldIndex, 1);
      metas.splice(newIndex, 0, moved);
      return { ...prev, [goalId]: metas };
    });
  };

  const handleExpenseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, expenseId: string) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      try {
        const file = await compressImage(rawFile, { maxWidth: 1920, maxHeight: 1920, quality: 0.8 });
        const photoId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `reports/${project?.id}/expenses/${photoId}.${fileExt}`;
        const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (error) { toast.error(`Erro ao enviar imagem: ${rawFile.name}`); return; }
        const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
        updateExpense(expenseId, 'image', urlData.publicUrl);
        toast.success(`Imagem ${rawFile.name} enviada com sucesso`);
      } catch { toast.error(`Erro ao processar imagem: ${rawFile.name}`); }
    }
  };

  // Activity helpers — apply per-report overrides without touching diary data
  const applyOverride = (a: Activity): Activity => {
    const ov = activityOverrides[a.id];
    if (!ov) return a;
    return {
      ...a,
      description: ov.description !== undefined ? ov.description : a.description,
      results: ov.results !== undefined ? ov.results : a.results,
      photos: ov.photos !== undefined ? ov.photos : a.photos,
      photoCaptions: ov.photoCaptions !== undefined ? { ...(a.photoCaptions || {}), ...ov.photoCaptions } : a.photoCaptions,
    };
  };
  const isHidden = (a: Activity) => !!activityOverrides[a.id]?.hidden;

  const getActivitiesByGoal = (goalId: string) =>
    activities.filter(a => a.goalId === goalId && !isHidden(a))
      .map(applyOverride)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCommunicationActivities = () =>
    activities.filter(a => a.type === ActivityType.COMUNICACAO && !isHidden(a))
      .map(applyOverride)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOtherActivities = () =>
    activities.filter(a => (a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO || a.type === ActivityType.OCORRENCIA) && !isHidden(a))
      .map(applyOverride)
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
    if (!e.target.files || !e.target.files.length) return;
    const files = linkField === 'media' ? Array.from(e.target.files) : [e.target.files[0]];
    for (const file of files) {
      try {
        const fileId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'pdf';
        const folderMap = { attendance: 'listas-presenca', registration: 'listas-inscricao', media: 'midias' };
        const filePath = `reports/${project?.id}/documentos/${folderMap[linkField]}/${fileId}.${fileExt}`;
        const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (error) { toast.error(`Erro ao enviar documento: ${file.name}`); return; }
        const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
        if (linkField === 'media') {
          // Append to existing media URLs (newline-separated)
          setLinks(prev => {
            const existing = prev.media ? prev.media.split('\n').filter(l => l.trim()) : [];
            existing.push(urlData.publicUrl);
            return { ...prev, media: existing.join('\n') };
          });
          setLinkFileNames(prev => {
            const existing = prev.media ? prev.media.split('\n').filter(l => l.trim()) : [];
            existing.push(file.name);
            return { ...prev, media: existing.join('\n') };
          });
        } else {
          setLinks(prev => ({ ...prev, [linkField]: urlData.publicUrl }));
          setLinkFileNames(prev => ({ ...prev, [linkField]: file.name }));
        }
        toast.success(`Documento "${file.name}" enviado com sucesso`);
      } catch { toast.error(`Erro ao processar documento: ${file.name}`); }
    }
    e.target.value = '';
  };

  // Insert diary photos by reference (no duplication)
  const insertDiaryPhotos = (sectionKey: string, urls: string[], captions: Record<string, string>) => {
    fileUploader.setSectionPhotos(prev => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), ...urls],
    }));
    // Auto-fill captions from diary data
    if (Object.keys(captions).length > 0) {
      setPhotoMetadata(prev => {
        const existing = prev[sectionKey] || [];
        const currentPhotos = fileUploader.sectionPhotos[sectionKey] || [];
        const newMetas = [...existing];
        urls.forEach((url) => {
          const idx = currentPhotos.length + urls.indexOf(url);
          while (newMetas.length <= idx) newMetas.push({ caption: '', size: 'medium' });
          if (captions[url]) newMetas[idx] = { ...newMetas[idx], caption: captions[url] };
        });
        return { ...prev, [sectionKey]: newMetas };
      });
    }
  };

  // Activity overrides (per-report layer; does NOT alter the Diário)
  const upsertActivityOverride = (activityId: string, patch: Partial<ActivityOverride>) => {
    setActivityOverrides(prev => ({ ...prev, [activityId]: { ...(prev[activityId] || {}), ...patch } }));
  };
  const restoreActivityOverride = (activityId: string) => {
    setActivityOverrides(prev => {
      const next = { ...prev };
      delete next[activityId];
      return next;
    });
  };
  const setActivityHidden = (activityId: string, hidden: boolean) => {
    upsertActivityOverride(activityId, { hidden });
  };

  const uploadActivityOverridePhoto = async (activityId: string, rawFile: File): Promise<string | null> => {
    try {
      const file = await compressImage(rawFile, { maxWidth: 1920, maxHeight: 1920, quality: 0.8 });
      const photoId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `reports/${project?.id}/activity-overrides/${activityId}/${photoId}.${fileExt}`;
      const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) { toast.error(`Erro ao enviar foto: ${rawFile.name}`); return null; }
      const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch {
      toast.error(`Erro ao processar foto: ${rawFile.name}`);
      return null;
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
    expenses, links, setLinks, linkFileNames, setLinkFileNames, linkDisplayNames, setLinkDisplayNames,
    sections: sectionManager.sections,
    sectionPhotos: fileUploader.sectionPhotos,
    sectionDocs: fileUploader.sectionDocs,
    photoMetadata, updatePhotoCaption, updatePhotoSize, replacePhotoUrl,
    pageLayouts, setPageLayouts,
    sectionPhotoGroups, setSectionPhotoGroups,
    selectedVideoUrls, setSelectedVideoUrls,
    saveReportData,
    setBroadcastCallback,
    applyRemoteData,
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
    handlePhotoUpload, handleGoalPhotoUpload, removeGoalPhoto, reorderGoalPhotos, handleExpenseImageUpload,
    handleDocumentUpload,
    handleSectionPhotoUpload: fileUploader.handleSectionPhotoUpload,
    removeSectionPhoto: fileUploader.removeSectionPhoto,
    reorderSectionPhotos: (sectionKey: string, oldIndex: number, newIndex: number) => {
      fileUploader.reorderSectionPhotos(sectionKey, oldIndex, newIndex);
      setPhotoMetadata(prev => {
        const metas = [...(prev[sectionKey] || [])];
        if (metas.length > 0) {
          const [moved] = metas.splice(oldIndex, 1);
          metas.splice(newIndex, 0, moved);
        }
        return { ...prev, [sectionKey]: metas };
      });
    },
    handleSectionDocUpload: fileUploader.handleSectionDocUpload,
    removeSectionDoc: fileUploader.removeSectionDoc,
    insertDiaryPhotos,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
    activityOverrides, upsertActivityOverride, restoreActivityOverride, setActivityHidden, uploadActivityOverridePhoto,
  };
};
