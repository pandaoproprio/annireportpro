import { useState, useEffect } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Activity, ActivityType, ReportSection, ExpenseItem, ReportPhotoMeta } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SectionDoc {
  name: string;
  url: string;
}

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
  const [logo, setLogo] = useState('');
  const [logoSecondary, setLogoSecondary] = useState('');
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
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);

  // Per-section photos and docs (persisted)
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, string[]>>({});
  const [sectionDocs, setSectionDocs] = useState<Record<string, SectionDoc[]>>({});
  // Photo metadata (captions + sizes) keyed by sectionKey or goalId, indexed by photo position
  const [photoMetadata, setPhotoMetadata] = useState<Record<string, ReportPhotoMeta[]>>({});

  // Initialize from project data
  useEffect(() => {
    if (project) {
      const rd = project.reportData || {};
      setLogo(rd.logo || '');
      setLogoSecondary(rd.logoSecondary || '');
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
        setSections(rd.sections);
      }
      setSectionPhotos((rd as any).sectionPhotos || {});
      setSectionDocs((rd as any).sectionDocs || {});
      setPhotoMetadata((rd as any).photoMetadata || {});
    }
  }, [project]);

  const saveReportData = (showToast = true) => {
    updateReportData({
      logo,
      logoSecondary,
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
      sections,
      sectionPhotos,
      sectionDocs,
      photoMetadata,
    } as any);
    if (showToast) toast.success('Rascunho salvo com sucesso!');
  };

  // Section management
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
    const expenseIndex = sections.findIndex(s => s.key === 'expenses');
    if (expenseIndex !== -1) {
      const newArr = [...sections];
      newArr.splice(expenseIndex, 0, newSection);
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

  // Expense management
  const addExpense = () => setExpenses([...expenses, { id: Date.now().toString(), itemName: '', description: '', image: '' }]);
  const updateExpense = (id: string, field: keyof ExpenseItem, value: string) => {
    setExpenses(expenses.map(e => (e.id === id ? { ...e, [field]: value } : e)));
  };
  const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

  // Photo uploads
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isSecondary = false) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const photoId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'png';
        const filePath = `reports/${project?.id}/logos/${isSecondary ? 'secondary' : 'primary'}_${photoId}.${fileExt}`;
        const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (error) { toast.error('Erro ao enviar logo'); return; }
        const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
        if (isSecondary) setLogoSecondary(urlData.publicUrl);
        else setLogo(urlData.publicUrl);
        toast.success('Logo enviado com sucesso');
      } catch { toast.error('Erro ao processar logo'); }
    }
  };

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

  // Per-section photo upload
  const handleSectionPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => {
    if (!e.target.files || !e.target.files.length || !project?.id) return;
    for (const file of Array.from(e.target.files)) {
      try {
        const photoId = crypto.randomUUID();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `reports/${project.id}/sections/${sectionKey}/${photoId}.${fileExt}`;
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

  // Per-section document upload
  const handleSectionDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => {
    if (!e.target.files || !e.target.files[0] || !project?.id) return;
    const file = e.target.files[0];
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error('Arquivo excede o tamanho máximo de 20MB.');
      e.target.value = '';
      return;
    }
    const allowedTypes = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png', 'image/webp',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|webp)$/i)) {
      toast.error('Tipo de arquivo não permitido.');
      e.target.value = '';
      return;
    }
    try {
      const fileId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'pdf';
      const filePath = `reports/${project.id}/sections/${sectionKey}/docs/${fileId}.${fileExt}`;
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

  const updatePhotoSize = (key: string, index: number, size: ReportPhotoMeta['size']) => {
    setPhotoMetadata(prev => {
      const metas = [...(prev[key] || [])];
      while (metas.length <= index) metas.push({ caption: '', size: 'medium' });
      metas[index] = { ...metas[index], size };
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
      setSectionPhotos(prev => {
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
    logo, setLogo, logoSecondary, setLogoSecondary,
    objectText, setObjectText, summary, setSummary,
    goalNarratives, setGoalNarratives, goalPhotos, setGoalPhotos,
    otherActionsNarrative, setOtherActionsNarrative, otherActionsPhotos, setOtherActionsPhotos,
    communicationNarrative, setCommunicationNarrative, communicationPhotos, setCommunicationPhotos,
    satisfaction, setSatisfaction, futureActions, setFutureActions,
    expenses, links, setLinks, linkFileNames, setLinkFileNames, sections,
    sectionPhotos, sectionDocs,
    photoMetadata, updatePhotoCaption, updatePhotoSize, replacePhotoUrl,
    saveReportData,
    moveSection, toggleVisibility, updateSectionTitle, updateCustomContent, addCustomSection, removeSection,
    pendingRemoveIndex, confirmRemoveSection, cancelRemoveSection,
    addExpense, updateExpense, removeExpense,
    handleLogoUpload, handlePhotoUpload, handleGoalPhotoUpload, removeGoalPhoto, handleExpenseImageUpload,
    handleDocumentUpload,
    handleSectionPhotoUpload, removeSectionPhoto,
    handleSectionDocUpload, removeSectionDoc,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
  };
};
