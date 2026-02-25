import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { FirstActivityCelebration } from '@/components/FirstActivityCelebration';
import { useAppData } from '@/contexts/AppDataContext';
import { Activity, ActivityType, AttendanceFile, ExpenseRecord } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Calendar, MapPin, Image as ImageIcon, Plus, X, Edit, Trash2, 
  FolderGit2, Search, Users, Loader2, FileEdit, Save, Eye, ChevronDown, ChevronUp,
  FileText, DollarSign, Upload, Paperclip
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ActivityManager: React.FC = () => {
  const { activeProject: project, activities, addActivity, deleteActivity, updateActivity, isLoadingActivities: isLoading } = useAppData();
  const { profile } = useAuth();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const prevActivityCount = useRef(activities.length);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterGoal, setFilterGoal] = useState<string>('all');
  const [filterDraft, setFilterDraft] = useState<string>('all');

  // Detect first activity creation
  useEffect(() => {
    if (prevActivityCount.current === 0 && activities.length === 1) {
      setShowCelebration(true);
    }
    prevActivityCount.current = activities.length;
  }, [activities.length]);

  // Form State
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

  // Filtered Activities
  const draftCount = useMemo(() => activities.filter(a => a.isDraft).length, [activities]);

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

      return matchesSearch && matchesType && matchesGoal && matchesDraft;
    });
  }, [activities, searchTerm, filterType, filterGoal, filterDraft]);

  const resetForm = () => {
    setNewActivity({
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
    setEditingId(null);
    setIsFormOpen(false);
  };

  const handleEdit = (activity: Activity) => {
    setNewActivity({ ...activity });
    setEditingId(activity.id);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      setRemovingId(deletingId);
      // Wait for animation to complete before deleting
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
        ...newActivity as Activity,
        id: editingId,
        projectId: project.id,
        teamInvolved: newActivity.teamInvolved || [],
        photos: newActivity.photos || [],
        attachments: newActivity.attachments || [],
        results: newActivity.results || '',
        challenges: newActivity.challenges || '',
        attendeesCount: newActivity.attendeesCount || 0,
        location: newActivity.location || '',
        endDate: newActivity.endDate,
        isDraft: asDraft,
        photoCaptions: newActivity.photoCaptions || {},
        attendanceFiles: newActivity.attendanceFiles || [],
        expenseRecords: newActivity.expenseRecords || [],
      };
      await updateActivity(updatedActivity);
      toast.success(asDraft ? 'Rascunho salvo!' : 'Atividade atualizada!');
    } else {
      await addActivity({
        projectId: project.id,
        date: newActivity.date || '',
        endDate: newActivity.endDate,
        location: newActivity.location || '',
        type: newActivity.type || ActivityType.EXECUCAO,
        description: newActivity.description || '',
        results: newActivity.results || '',
        challenges: newActivity.challenges || '',
        attendeesCount: newActivity.attendeesCount || 0,
        teamInvolved: newActivity.teamInvolved || [],
        photos: newActivity.photos || [],
        attachments: [],
        goalId: newActivity.goalId,
        costEvidence: newActivity.costEvidence,
        isDraft: asDraft,
        photoCaptions: newActivity.photoCaptions || {},
        attendanceFiles: newActivity.attendanceFiles || [],
        expenseRecords: newActivity.expenseRecords || [],
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
        try {
          // Generate unique file path
          const photoId = crypto.randomUUID();
          const fileExt = file.name.split('.').pop() || 'jpg';
          const filePath = `activities/${project?.id}/${photoId}.${fileExt}`;
          
          // Upload to Storage
          const { error } = await supabase.storage
            .from('team-report-photos')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });
          
          if (error) {
            console.error('Upload error:', error);
            toast.error(`Erro ao enviar foto: ${file.name}`);
            continue;
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('team-report-photos')
            .getPublicUrl(filePath);
          
          // Add URL to photos array (not base64)
          setNewActivity(prev => ({ 
            ...prev, 
            photos: [...(prev.photos || []), urlData.publicUrl] 
          }));
          
          toast.success(`Foto ${file.name} enviada com sucesso`);
        } catch (error) {
          console.error('Photo upload error:', error);
          toast.error(`Erro ao processar foto: ${file.name}`);
        }
      }
      
      e.target.value = '';
    }
  };

  const removePhoto = async (indexToRemove: number) => {
    const photoUrl = newActivity.photos?.[indexToRemove];
    
    // Delete from Storage if it's a URL (not base64)
    if (photoUrl && !photoUrl.startsWith('data:')) {
      try {
        // Extract file path from URL
        const urlParts = new URL(photoUrl).pathname.split('/');
        const filePath = urlParts.slice(-3).join('/'); // Gets 'activities/projectId/photoId.jpg'
        
        await supabase.storage
          .from('team-report-photos')
          .remove([filePath]);
      } catch (error) {
        console.error('Error deleting photo from storage:', error);
        // Still remove from UI even if storage delete fails
      }
    }
    
    setNewActivity(prev => ({
      ...prev,
      photos: prev.photos?.filter((_, index) => index !== indexToRemove)
    }));
  };

  const getTypeColor = (type: ActivityType) => {
    switch (type) {
      case ActivityType.EXECUCAO: return 'bg-success/10 text-success border-success/30';
      case ActivityType.OCORRENCIA: return 'bg-destructive/10 text-destructive border-destructive/30';
      case ActivityType.COMUNICACAO: return 'bg-info/10 text-info border-info/30';
      case ActivityType.REUNIAO: return 'bg-warning/10 text-warning border-warning/30';
      default: return 'bg-muted text-muted-foreground';
    }
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

      {/* Form */}
      {isFormOpen && (
        <Card className={`border-l-4 animate-slideDown ${editingId ? 'border-l-warning' : 'border-l-primary'}`}>
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-foreground">{editingId ? 'Editar Atividade' : 'Nova Atividade'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Project Display */}
                <div className="md:col-span-2 lg:col-span-3">
                  <Label>Projeto Vinculado</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FolderGit2 className="h-4 w-4 text-primary" />
                    </div>
                    <Input 
                      value={project?.name || 'Projeto não identificado'} 
                      disabled 
                      className="pl-10 bg-accent text-accent-foreground font-semibold cursor-not-allowed opacity-100" 
                    />
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
                  <Label>Tipo de Atividade</Label>
                  <Select value={newActivity.type} onValueChange={(value) => setNewActivity({...newActivity, type: value as ActivityType})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ActivityType).map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
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
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma</SelectItem>
                      {project.goals.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nº Participantes</Label>
                  <Input type="number" min={0} value={newActivity.attendeesCount || ''} onChange={e => setNewActivity({...newActivity, attendeesCount: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição da Atividade</Label>
                <Textarea rows={3} required value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} placeholder="Descreva o que foi realizado..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Resultados Obtidos</Label>
                  <Textarea rows={2} value={newActivity.results} onChange={e => setNewActivity({...newActivity, results: e.target.value})} placeholder="Quais foram os resultados?" />
                </div>
                <div className="space-y-2">
                  <Label>Desafios/Observações</Label>
                  <Textarea rows={2} value={newActivity.challenges} onChange={e => setNewActivity({...newActivity, challenges: e.target.value})} placeholder="Houve algum desafio?" />
                </div>
              </div>

              {/* Photo Upload with Captions */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotos</Label>
                <Input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
                {newActivity.photos && newActivity.photos.length > 0 && (
                  <div className="space-y-3 mt-2">
                    {newActivity.photos.map((photo, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2 border rounded-md bg-muted/30">
                        <div className="relative group shrink-0">
                          <img src={photo} alt={`Foto ${idx + 1}`} className="h-20 w-20 object-cover rounded border" />
                          <button 
                            type="button" 
                            onClick={() => removePhoto(idx)} 
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
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

              {/* Attendance List Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><FileText className="w-4 h-4" /> Lista de Presença</Label>
                <Input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={async (e) => {
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
                      setNewActivity(prev => ({
                        ...prev,
                        attendanceFiles: [...(prev.attendanceFiles || []), { name: file.name, url: urlData.publicUrl }]
                      }));
                      toast.success(`"${file.name}" enviado com sucesso`);
                    } catch { toast.error('Erro ao enviar arquivo'); }
                    e.target.value = '';
                  }} 
                />
                {newActivity.attendanceFiles && newActivity.attendanceFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {newActivity.attendanceFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">{file.name}</a>
                        <button type="button" onClick={() => {
                          setNewActivity(prev => ({ ...prev, attendanceFiles: (prev.attendanceFiles || []).filter((_, i) => i !== idx) }));
                        }}>
                          <X className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expense Records */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Despesas</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setNewActivity(prev => ({
                    ...prev,
                    expenseRecords: [...(prev.expenseRecords || []), { id: crypto.randomUUID(), description: '' }]
                  }));
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Despesa
                </Button>
                {newActivity.expenseRecords && newActivity.expenseRecords.length > 0 && (
                  <div className="space-y-3 mt-2">
                    {newActivity.expenseRecords.map((expense, idx) => (
                      <div key={expense.id} className="p-3 border rounded-md bg-muted/30 space-y-2">
                        <div className="flex items-start gap-2">
                          <Textarea
                            rows={2}
                            placeholder="Descreva a despesa (ex: Material de escritório, transporte...)"
                            value={expense.description}
                            onChange={(e) => {
                              const records = [...(newActivity.expenseRecords || [])];
                              records[idx] = { ...records[idx], description: e.target.value };
                              setNewActivity({ ...newActivity, expenseRecords: records });
                            }}
                            className="flex-1 text-sm"
                          />
                          <button type="button" onClick={() => {
                            setNewActivity(prev => ({ ...prev, expenseRecords: (prev.expenseRecords || []).filter((_, i) => i !== idx) }));
                          }}>
                            <X className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Comprovante (foto ou PDF)</Label>
                          {expense.fileUrl ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                              <a href={expense.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">{expense.fileName || 'Comprovante'}</a>
                              <button type="button" onClick={() => {
                                const records = [...(newActivity.expenseRecords || [])];
                                records[idx] = { ...records[idx], fileUrl: undefined, fileName: undefined };
                                setNewActivity({ ...newActivity, expenseRecords: records });
                              }}>
                                <X className="w-3.5 h-3.5 text-destructive" />
                              </button>
                            </div>
                          ) : (
                            <Input
                              type="file"
                              accept="image/*,.pdf"
                              className="mt-1"
                              onChange={async (e) => {
                                if (!e.target.files?.[0] || !project) return;
                                const file = e.target.files[0];
                                if (file.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx. 20MB)'); e.target.value = ''; return; }
                                try {
                                  const fileId = crypto.randomUUID();
                                  const ext = file.name.split('.').pop() || 'pdf';
                                  const path = `activities/${project.id}/expenses/${fileId}.${ext}`;
                                  const { error } = await supabase.storage.from('team-report-photos').upload(path, file, { cacheControl: '3600', upsert: false });
                                  if (error) throw error;
                                  const { data: urlData } = supabase.storage.from('team-report-photos').getPublicUrl(path);
                                  const records = [...(newActivity.expenseRecords || [])];
                                  records[idx] = { ...records[idx], fileUrl: urlData.publicUrl, fileName: file.name };
                                  setNewActivity({ ...newActivity, expenseRecords: records });
                                  toast.success('Comprovante enviado');
                                } catch { toast.error('Erro ao enviar comprovante'); }
                                e.target.value = '';
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  disabled={isSaving}
                  onClick={(e) => handleSubmit(e as any, true)}
                >
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

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Buscar atividades..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {Object.values(ActivityType).map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterGoal} onValueChange={setFilterGoal}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Meta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Metas</SelectItem>
            {project.goals.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDraft} onValueChange={setFilterDraft}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="draft">Rascunhos {draftCount > 0 ? `(${draftCount})` : ''}</SelectItem>
            <SelectItem value="final">Finalizadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-2">Ainda não há atividades registradas.</p>
              <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Criar primeira atividade
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredActivities.map(act => (
            <Card key={act.id} className={`hover:shadow-md transition-shadow ${removingId === act.id ? 'animate-fade-out' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {act.isDraft && (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 animate-pulse">
                          <FileEdit className="w-3 h-3 mr-1" /> Rascunho
                        </Badge>
                      )}
                      <Badge variant="outline" className={getTypeColor(act.type)}>
                        {act.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(act.date).toLocaleDateString('pt-BR')}
                        {act.endDate && ` - ${new Date(act.endDate).toLocaleDateString('pt-BR')}`}
                      </span>
                      {act.location && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {act.location}
                        </span>
                      )}
                      {act.attendeesCount > 0 && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {act.attendeesCount}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground">{act.description}</p>
                    {act.results && (
                      <p className="text-sm text-muted-foreground"><strong>Resultados:</strong> {act.results}</p>
                    )}
                    {act.photos && act.photos.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {act.photos.slice(0, 4).map((photo, idx) => (
                          <img key={idx} src={photo} alt="" className="h-16 w-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setLightboxPhoto(photo); }} />
                        ))}
                        {act.photos.length > 4 && (
                          <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                            +{act.photos.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex md:flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingActivity(act)} title="Ver detalhes">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(act)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(act.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta atividade? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Detail Dialog */}
      <Dialog open={!!viewingActivity} onOpenChange={(open) => !open && setViewingActivity(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Detalhes da Atividade
            </DialogTitle>
          </DialogHeader>
          {viewingActivity && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {viewingActivity.isDraft && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    <FileEdit className="w-3 h-3 mr-1" /> Rascunho
                  </Badge>
                )}
                <Badge variant="outline" className={getTypeColor(viewingActivity.type)}>
                  {viewingActivity.type}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Data</p>
                  <p className="text-sm flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(viewingActivity.date).toLocaleDateString('pt-BR')}
                    {viewingActivity.endDate && ` a ${new Date(viewingActivity.endDate).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Local</p>
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {viewingActivity.location || '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Participantes</p>
                  <p className="text-sm flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {viewingActivity.attendeesCount || 0}
                  </p>
                </div>
                {viewingActivity.goalId && project?.goals && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Meta</p>
                    <p className="text-sm">
                      {project.goals.find(g => g.id === viewingActivity.goalId)?.title || '—'}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">Descrição</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{viewingActivity.description}</p>
              </div>

              {viewingActivity.results && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Resultados</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{viewingActivity.results}</p>
                </div>
              )}

              {viewingActivity.challenges && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Desafios / Observações</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{viewingActivity.challenges}</p>
                </div>
              )}

              {viewingActivity.teamInvolved && viewingActivity.teamInvolved.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Equipe Envolvida</p>
                  <div className="flex flex-wrap gap-1">
                    {viewingActivity.teamInvolved.map((member, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{member}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewingActivity.photos && viewingActivity.photos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Fotos ({viewingActivity.photos.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {viewingActivity.photos.map((photo, idx) => (
                      <div key={idx} className="space-y-1">
                        <a href={photo} target="_blank" rel="noopener noreferrer">
                          <img
                            src={photo}
                            alt={viewingActivity.photoCaptions?.[String(idx)] || `Foto ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-md border hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </a>
                        {viewingActivity.photoCaptions?.[String(idx)] && (
                          <p className="text-xs text-muted-foreground italic text-center">{viewingActivity.photoCaptions[String(idx)]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingActivity.attendanceFiles && viewingActivity.attendanceFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    Lista de Presença
                  </p>
                  <div className="space-y-1">
                    {viewingActivity.attendanceFiles.map((file, idx) => (
                      <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline p-2 border rounded-md bg-muted/30">
                        <Paperclip className="w-3.5 h-3.5" />
                        {file.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {viewingActivity.expenseRecords && viewingActivity.expenseRecords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                    Despesas
                  </p>
                  <div className="space-y-2">
                    {viewingActivity.expenseRecords.map((expense, idx) => (
                      <div key={idx} className="p-2 border rounded-md bg-muted/30">
                        <p className="text-sm text-foreground">{expense.description || 'Sem descrição'}</p>
                        {expense.fileUrl && (
                          <a href={expense.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                            <Paperclip className="w-3 h-3" />
                            {expense.fileName || 'Comprovante'}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox */}
      <Dialog open={!!lightboxPhoto} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-2 flex items-center justify-center bg-black/90 border-none">
          {lightboxPhoto && (
            <img src={lightboxPhoto} alt="Foto ampliada" className="max-w-full max-h-[90vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
