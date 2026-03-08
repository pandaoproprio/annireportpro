import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FirstActivityCelebration } from '@/components/FirstActivityCelebration';
import CameraCapture from '@/components/CameraCapture';
import { AiTextToolbar } from '@/components/report/AiTextToolbar';
import { useAppData } from '@/contexts/AppDataContext';
import { Activity, ActivityType, AttendanceFile, ExpenseRecord } from '@/types';
import { canEditActivity, deriveSetor } from '@/lib/diaryEditRules';
import { logUnified } from '@/lib/unifiedLog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Image as ImageIcon, Plus, X, FolderGit2, Loader2, FileEdit, Save,
  FileText, Paperclip, LayoutList, Columns3
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamContributionDashboard } from '@/components/dashboard/TeamContributionDashboard';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SpeechToTextButton } from '@/components/SpeechToTextButton';
import { Sparkles } from 'lucide-react';

// Decomposed components
import { ActivityFilters } from '@/components/activity/ActivityFilters';
import { ActivityList } from '@/components/activity/ActivityList';
import { ActivityDetailDialog } from '@/components/activity/ActivityDetailDialog';
import { ActivityKanbanBoard, type KanbanStatus } from '@/components/activity/ActivityKanbanBoard';
import { KanbanFilters } from '@/components/activity/KanbanFilters';
import { OcrAttendanceButton } from '@/components/activity/OcrAttendanceButton';

export const ActivityManager: React.FC = () => {
  const { activeProject: project, activities, addActivity, deleteActivity, updateActivity, isLoadingActivities: isLoading } = useAppData();
  const { profile, role } = useAuth();
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const prevActivityCount = useRef(activities.length);
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [filterDraft, setFilterDraft] = useState<string>('all');
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [kanbanTypeFilters, setKanbanTypeFilters] = useState<string[]>([]);
  const [kanbanAuthorFilter, setKanbanAuthorFilter] = useState<string | null>(null);

  useEffect(() => {
    if (prevActivityCount.current === 0 && activities.length === 1) {
      setShowCelebration(true);
    }
    prevActivityCount.current = activities.length;
  }, [activities.length]);

  const [isClassifying, setIsClassifying] = useState(false);

  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    date: new Date().toISOString().split('T')[0],
    endDate: '',
    type: ActivityType.EXECUCAO,
    teamInvolved: [],
    photos: [],
    attachments: [],
    location: '',
    description: '',
    results: '',
    challenges: '',
    attendeesCount: 0,
    photoCaptions: {},
    attendanceFiles: [],
    expenseRecords: [],
  });

  const classifyActivity = async () => {
    const desc = newActivity.description?.trim();
    if (!desc || desc.length < 5) {
      toast.info('Digite uma descrição com pelo menos 5 caracteres para classificar.');
      return;
    }
    setIsClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('classify-activity', {
        body: { description: desc },
      });
      if (error) throw error;
      if (data?.type) {
        setNewActivity(prev => ({ ...prev, type: data.type as ActivityType }));
        toast.success(`Tipo sugerido pela IA: ${data.type}`);
      }
    } catch (err: any) {
      console.error('Classify error:', err);
      toast.error('Erro ao classificar atividade.');
    } finally {
      setIsClassifying(false);
    }
  };

  const draftCount = useMemo(() => activities.filter(a => a.isDraft).length, [activities]);

  const uniqueAuthors = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach(a => {
      if (a.authorName) {
        const key = a.authorEmail || a.authorName;
        if (!map.has(key)) map.set(key, a.authorName);
      }
    });
    return Array.from(map.entries()).map(([key, name]) => ({ key, name }));
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchesSearch = act.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            act.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            act.results?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || act.type === filterType;
      const matchesGoal = filterGoal === 'all' || act.goalId === filterGoal;
      const matchesDraft = filterDraft === 'all' || 
                           (filterDraft === 'draft' && act.isDraft) || 
                           (filterDraft === 'final' && !act.isDraft);
      const matchesAuthor = filterAuthor === 'all' || 
                            (act.authorEmail || act.authorName) === filterAuthor;
      const matchesPeriodStart = !filterDateStart || act.date >= filterDateStart;
      const matchesPeriodEnd = !filterDateEnd || act.date <= filterDateEnd;
      return matchesSearch && matchesType && matchesGoal && matchesDraft && matchesAuthor && matchesPeriodStart && matchesPeriodEnd;
    });
  }, [activities, searchTerm, filterType, filterGoal, filterDraft, filterAuthor, filterDateStart, filterDateEnd]);

  // Kanban-specific visual filtering (applied on top of main filters)
  const kanbanActivities = useMemo(() => {
    return filteredActivities.filter(act => {
      const matchesType = kanbanTypeFilters.length === 0 || kanbanTypeFilters.includes(act.type);
      const matchesAuthor = !kanbanAuthorFilter || (act.authorEmail || act.authorName) === kanbanAuthorFilter;
      return matchesType && matchesAuthor;
    });
  }, [filteredActivities, kanbanTypeFilters, kanbanAuthorFilter]);

  const kanbanTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredActivities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return counts;
  }, [filteredActivities]);

  const toggleKanbanType = (type: string) => {
    setKanbanTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const resetForm = () => {
    setNewActivity({
      date: new Date().toISOString().split('T')[0], endDate: '', type: ActivityType.EXECUCAO,
      teamInvolved: [], photos: [], attachments: [], location: '', description: '',
      results: '', challenges: '', attendeesCount: 0, photoCaptions: {},
      attendanceFiles: [], expenseRecords: [],
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (activity: Activity) => {
    const editCheck = canEditActivity(activity.createdAt, isAdmin, activity.isLinkedToReport);
    if (!editCheck.allowed) {
      toast.error(editCheck.reason || 'Edição não permitida');
      if (profile) {
        logUnified({
          userId: profile.user_id,
          action: 'edit_attempt_blocked',
          entityType: 'activity',
          entityId: activity.id,
          newData: { reason: editCheck.reason },
        });
      }
      return;
    }
    setNewActivity({ ...activity });
    setEditingId(activity.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => { setDeletingId(id); };

  const confirmDelete = async () => {
    if (deletingId) {
      setRemovingId(deletingId);
      setTimeout(async () => {
        await deleteActivity(deletingId);
        setDeletingId(null);
        setRemovingId(null);
      }, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();
    if (!project || !newActivity.description || !newActivity.date) return;
    if (newActivity.endDate && newActivity.endDate < newActivity.date) {
      toast.error("A data de término não pode ser anterior à data de início.");
      return;
    }
    setIsSaving(true);
    if (editingId) {
      const updatedActivity: Activity = {
        ...newActivity as Activity, id: editingId, projectId: project.id,
        teamInvolved: newActivity.teamInvolved || [], photos: newActivity.photos || [],
        attachments: newActivity.attachments || [], results: newActivity.results || '',
        challenges: newActivity.challenges || '', attendeesCount: newActivity.attendeesCount || 0,
        location: newActivity.location || '', endDate: newActivity.endDate, isDraft: asDraft,
        photoCaptions: newActivity.photoCaptions || {}, attendanceFiles: newActivity.attendanceFiles || [],
        expenseRecords: newActivity.expenseRecords || [],
      };
      await updateActivity(updatedActivity);
      toast.success(asDraft ? 'Rascunho salvo!' : 'Atividade atualizada!');
    } else {
      await addActivity({
        projectId: project.id, date: newActivity.date || '', endDate: newActivity.endDate,
        location: newActivity.location || '', type: newActivity.type || ActivityType.EXECUCAO,
        description: newActivity.description || '', results: newActivity.results || '',
        challenges: newActivity.challenges || '', attendeesCount: newActivity.attendeesCount || 0,
        teamInvolved: newActivity.teamInvolved || [], photos: newActivity.photos || [],
        attachments: [], goalId: newActivity.goalId, costEvidence: newActivity.costEvidence,
        isDraft: asDraft, photoCaptions: newActivity.photoCaptions || {},
        attendanceFiles: newActivity.attendanceFiles || [], expenseRecords: newActivity.expenseRecords || [],
        setorResponsavel: deriveSetor(role),
      });
      toast.success(asDraft ? 'Rascunho salvo!' : 'Atividade registrada!');
    }
    setIsSaving(false);
    resetForm();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) { toast.error(`Tipo não suportado: ${file.name}`); continue; }
        try {
          const photoId = crypto.randomUUID();
          const fileExt = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
          const filePath = `activities/${project?.id}/${photoId}.${fileExt}`;
          const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
          if (error) { toast.error(`Erro ao enviar: ${file.name}`); continue; }
          const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
          setNewActivity(prev => ({ ...prev, photos: [...(prev.photos || []), urlData.publicUrl] }));
          toast.success(`${isVideo ? 'Vídeo' : 'Foto'} ${file.name} enviado(a)`);
        } catch { toast.error(`Erro ao processar: ${file.name}`); }
      }
      e.target.value = '';
    }
  };

  const removePhoto = async (indexToRemove: number) => {
    const photoUrl = newActivity.photos?.[indexToRemove];
    if (photoUrl && !photoUrl.startsWith('data:')) {
      try {
        const urlParts = new URL(photoUrl).pathname.split('/');
        const filePath = urlParts.slice(-3).join('/');
        await supabase.storage.from('team-report-photos').remove([filePath]);
      } catch { /* still remove from UI */ }
    }
    setNewActivity(prev => ({ ...prev, photos: prev.photos?.filter((_, index) => index !== indexToRemove) }));
  };

  if (!project) return <div className="p-8 text-center text-muted-foreground">Projeto não encontrado.</div>;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <Tabs defaultValue="diario" className="w-full">
        <TabsList>
          <TabsTrigger value="diario">Diário de Bordo</TabsTrigger>
          {isAdmin && <TabsTrigger value="contribuicao">Contribuição da Equipe</TabsTrigger>}
        </TabsList>

        <TabsContent value="contribuicao">
          <TeamContributionDashboard activities={activities} projectName={project?.name} />
        </TabsContent>

        <TabsContent value="diario" className="space-y-6 mt-4">
          {/* New Activity Button */}
          {!isFormOpen && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted/50">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="w-4 h-4 mr-1.5" /> Lista
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => setViewMode('kanban')}
                >
                  <Columns3 className="w-4 h-4 mr-1.5" /> Kanban
                </Button>
              </div>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nova Atividade
              </Button>
            </div>
          )}

          {/* Form */}
          {isFormOpen && (
            <Card className={`border-l-4 animate-slideDown ${editingId ? 'border-l-warning' : 'border-l-primary'}`}>
              <CardContent className="pt-6">
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-foreground">{editingId ? 'Editar Atividade' : 'Nova Atividade'}</h3>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-2 lg:col-span-3">
                      <Label>Projeto Vinculado</Label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FolderGit2 className="h-4 w-4 text-primary" />
                        </div>
                        <Input value={project?.name || 'Projeto não identificado'} disabled className="pl-10 bg-accent text-accent-foreground font-semibold cursor-not-allowed opacity-100" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Data Início</Label>
                      <Input type="date" required value={newActivity.date} onChange={e => setNewActivity({...newActivity, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Término (Opcional)</Label>
                      <Input type="date" min={newActivity.date} value={newActivity.endDate || ''} onChange={e => setNewActivity({...newActivity, endDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Tipo de Atividade</Label>
                        <Button type="button" variant="ghost" size="sm" onClick={classifyActivity} disabled={isClassifying || !newActivity.description?.trim()} className="text-xs gap-1 h-7 text-primary hover:text-primary" title="Classificar automaticamente com IA">
                          {isClassifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          Auto IA
                        </Button>
                      </div>
                      <Select value={newActivity.type} onValueChange={(value) => setNewActivity({...newActivity, type: value as ActivityType})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.values(ActivityType).map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Local</Label>
                      <Input value={newActivity.location} onChange={e => setNewActivity({...newActivity, location: e.target.value})} placeholder="Local da atividade" />
                    </div>
                    <div className="space-y-2">
                      <Label>Vincular a Meta (Opcional)</Label>
                      <Select value={newActivity.goalId || '__none__'} onValueChange={(value) => setNewActivity({...newActivity, goalId: value === '__none__' ? undefined : value})}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma</SelectItem>
                          {project.goals.map(g => (<SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nº Participantes</Label>
                      <Input type="number" min={0} value={newActivity.attendeesCount || ''} onChange={e => setNewActivity({...newActivity, attendeesCount: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Descrição da Atividade</Label>
                      <div className="flex items-center gap-1">
                        <SpeechToTextButton currentText={newActivity.description || ''} onTranscript={(text) => setNewActivity({...newActivity, description: text})} />
                        <AiTextToolbar text={newActivity.description || ''} onResult={(text) => setNewActivity({...newActivity, description: text})} sectionType="generic" projectName={project?.name} projectObject={project?.object} hideGenerate={false} />
                      </div>
                    </div>
                    <Textarea rows={3} required value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} placeholder="Descreva o que foi realizado..." />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Resultados Obtidos</Label>
                        <div className="flex items-center gap-1">
                          <SpeechToTextButton currentText={newActivity.results || ''} onTranscript={(text) => setNewActivity({...newActivity, results: text})} />
                          <AiTextToolbar text={newActivity.results || ''} onResult={(text) => setNewActivity({...newActivity, results: text})} sectionType="generic" projectName={project?.name} hideGenerate />
                        </div>
                      </div>
                      <Textarea rows={2} value={newActivity.results} onChange={e => setNewActivity({...newActivity, results: e.target.value})} placeholder="Quais foram os resultados?" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Desafios/Observações</Label>
                        <div className="flex items-center gap-1">
                          <SpeechToTextButton currentText={newActivity.challenges || ''} onTranscript={(text) => setNewActivity({...newActivity, challenges: text})} />
                          <AiTextToolbar text={newActivity.challenges || ''} onResult={(text) => setNewActivity({...newActivity, challenges: text})} sectionType="generic" projectName={project?.name} hideGenerate />
                        </div>
                      </div>
                      <Textarea rows={2} value={newActivity.challenges} onChange={e => setNewActivity({...newActivity, challenges: e.target.value})} placeholder="Houve algum desafio?" />
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotos e Vídeos</Label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Input type="file" accept="image/*,video/*" multiple onChange={handlePhotoUpload} className="flex-1 min-w-[200px]" />
                      <CameraCapture
                        onCapture={async (file) => {
                          if (!project) return;
                          const isVideo = file.type.startsWith('video/');
                          try {
                            const photoId = crypto.randomUUID();
                            const ext = file.name.split('.').pop() || (isVideo ? 'webm' : 'jpg');
                            const filePath = `activities/${project.id}/${photoId}.${ext}`;
                            const { error } = await supabase.storage.from('team-report-photos').upload(filePath, file, { cacheControl: '3600', upsert: false });
                            if (error) { toast.error('Erro ao enviar mídia'); return; }
                            const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(filePath);
                            setNewActivity(prev => ({ ...prev, photos: [...(prev.photos || []), urlData.publicUrl] }));
                            toast.success(`${isVideo ? 'Vídeo' : 'Foto'} capturado(a) com sucesso!`);
                          } catch { toast.error('Erro ao processar captura'); }
                        }}
                      />
                    </div>
                    {newActivity.photos && newActivity.photos.length > 0 && (
                      <div className="space-y-3 mt-2">
                        {newActivity.photos.map((photo, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-2 border rounded-md bg-muted/30">
                            <div className="relative group shrink-0">
                              {photo.match(/\.(mp4|mov|webm|avi)(\?|$)/i) ? (
                                <video src={photo} className="h-20 w-20 object-cover rounded border" muted />
                              ) : (
                                <img src={photo} alt={`Mídia ${idx + 1}`} className="h-20 w-20 object-cover rounded border" />
                              )}
                              <button type="button" onClick={() => removePhoto(idx)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1">
                              <Input
                                placeholder={`Legenda da foto ${idx + 1}`}
                                value={newActivity.photoCaptions?.[String(idx)] || ''}
                                onChange={(e) => {
                                  const captions = { ...(newActivity.photoCaptions || {}) };
                                  captions[String(idx)] = e.target.value;
                                  setNewActivity({ ...newActivity, photoCaptions: captions });
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Lista de Presença</Label>
                      <OcrAttendanceButton
                        onNamesExtracted={(names) => {
                          setNewActivity(prev => ({
                            ...prev,
                            teamInvolved: [...new Set([...(prev.teamInvolved || []), ...names])],
                            attendeesCount: Math.max(prev.attendeesCount || 0, (prev.teamInvolved || []).length + names.length),
                          }));
                        }}
                      />
                    </div>
                    <Input type="file" accept="image/*,.pdf" onChange={async (e) => {
                      if (!e.target.files?.[0] || !project) return;
                      const file = e.target.files[0];
                      if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 20MB)'); e.target.value = ''; return; }
                      try {
                        const fileId = crypto.randomUUID();
                        const ext = file.name.split('.').pop() || 'pdf';
                        const path = `activities/${project.id}/attendance/${fileId}.${ext}`;
                        const { error } = await supabase.storage.from('team-report-photos').upload(path, file, { cacheControl: '3600', upsert: false });
                        if (error) throw error;
                        const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(path);
                        setNewActivity(prev => ({ ...prev, attendanceFiles: [...(prev.attendanceFiles || []), { name: file.name, url: urlData.publicUrl }] }));
                        toast.success(`"${file.name}" enviado com sucesso`);
                      } catch { toast.error('Erro ao enviar arquivo'); }
                      e.target.value = '';
                    }} />
                    {newActivity.attendanceFiles && newActivity.attendanceFiles.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {newActivity.attendanceFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                            <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">{file.name}</a>
                            <button type="button" onClick={() => { setNewActivity(prev => ({ ...prev, attendanceFiles: (prev.attendanceFiles || []).filter((_, i) => i !== idx) })); }}>
                              <X className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                    <Button type="button" variant="secondary" disabled={isSaving} onClick={(e) => handleSubmit(e as any, true)}>
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <FileEdit className="w-4 h-4 mr-2" /> Salvar Rascunho
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      {editingId ? 'Salvar Alterações' : 'Registrar Atividade'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <ActivityFilters
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            filterType={filterType} setFilterType={setFilterType}
            filterGoal={filterGoal} setFilterGoal={setFilterGoal}
            filterDraft={filterDraft} setFilterDraft={setFilterDraft}
            filterAuthor={filterAuthor} setFilterAuthor={setFilterAuthor}
            filterDateStart={filterDateStart} setFilterDateStart={setFilterDateStart}
            filterDateEnd={filterDateEnd} setFilterDateEnd={setFilterDateEnd}
            draftCount={draftCount} uniqueAuthors={uniqueAuthors} project={project}
          />

          {viewMode === 'list' ? (
            <ActivityList
              activities={filteredActivities}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={setViewingActivity}
              onPhotoClick={setLightboxPhoto}
              removingId={removingId}
            />
          ) : (
            <div className="space-y-4">
              <KanbanFilters
                activeTypes={kanbanTypeFilters}
                onToggleType={toggleKanbanType}
                activeAuthor={kanbanAuthorFilter}
                onSetAuthor={setKanbanAuthorFilter}
                authors={uniqueAuthors}
                typeCounts={kanbanTypeCounts}
              />
              <ActivityKanbanBoard
                activities={kanbanActivities}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={setViewingActivity}
              onStatusChange={async (activity, newStatus) => {
                const updated = { ...activity, isDraft: newStatus === 'draft' };
                await updateActivity(updated);
                toast.success(
                  newStatus === 'draft' ? 'Movido para Rascunho' : 'Publicado com sucesso'
                );
              }}
            />
          )}

          <FirstActivityCelebration
            open={showCelebration}
            onClose={() => setShowCelebration(false)}
            userName={profile?.name || 'Usuário'}
            activityCount={activities.length}
          />

          <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir atividade</AlertDialogTitle>
                <AlertDialogDescription>Tem certeza que deseja excluir esta atividade? Essa ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Detail Dialog */}
          <ActivityDetailDialog activity={viewingActivity} project={project} onClose={() => setViewingActivity(null)} />

          {/* Photo Lightbox */}
          <Dialog open={!!lightboxPhoto} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-2 flex items-center justify-center bg-black/90 border-none">
              {lightboxPhoto && (
                lightboxPhoto.match(/\.(mp4|mov|webm|avi)(\?|$)/i) ? (
                  <video src={lightboxPhoto} controls autoPlay className="max-w-full max-h-[90vh] rounded" />
                ) : (
                  <img src={lightboxPhoto} alt="Foto ampliada" className="max-w-full max-h-[90vh] object-contain rounded" />
                )
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};
