import React, { useState, useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { Activity, ActivityType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  FolderGit2, Search, Users, Loader2
} from 'lucide-react';

export const ActivityManager: React.FC = () => {
  const { activeProject: project, activities, addActivity, deleteActivity, updateActivity, isLoadingActivities: isLoading } = useAppData();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterGoal, setFilterGoal] = useState<string>('all');

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
  });

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchesSearch = act.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            act.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            act.results?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || act.type === filterType;
      const matchesGoal = filterGoal === 'all' || act.goalId === filterGoal;

      return matchesSearch && matchesType && matchesGoal;
    });
  }, [activities, searchTerm, filterType, filterGoal]);

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
    if (window.confirm('Tem certeza que deseja excluir esta atividade permanentemente?')) {
      await deleteActivity(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newActivity.description || !newActivity.date) return;

    if (newActivity.endDate && newActivity.endDate < newActivity.date) {
      alert("A data de término não pode ser anterior à data de início.");
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
      };
      await updateActivity(updatedActivity);
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
        costEvidence: newActivity.costEvidence
      });
    }

    setIsSaving(false);
    resetForm();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      const base64Promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file as Blob);
        });
      });

      const newPhotos = await Promise.all(base64Promises);
      
      setNewActivity(prev => ({ 
        ...prev, 
        photos: [...(prev.photos || []), ...newPhotos] 
      }));
      
      e.target.value = '';
    }
  };

  const removePhoto = (indexToRemove: number) => {
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
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Diário de Bordo</h2>
          <p className="text-muted-foreground">Registre e gerencie todas as atividades do projeto.</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)} variant={isFormOpen ? "destructive" : "default"}>
          {isFormOpen ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {isFormOpen ? 'Cancelar' : 'Nova Atividade'}
        </Button>
      </div>

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

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotos</Label>
                <Input type="file" accept="image/*" multiple onChange={handlePhotoUpload} />
                {newActivity.photos && newActivity.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newActivity.photos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img src={photo} alt={`Foto ${idx + 1}`} className="h-20 w-20 object-cover rounded border" />
                        <button 
                          type="button" 
                          onClick={() => removePhoto(idx)} 
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-2">Ainda não há atividades registradas.</p>
              <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Comece criando sua primeira atividade
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredActivities.map(act => (
            <Card key={act.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
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
                          <img key={idx} src={photo} alt="" className="h-16 w-16 object-cover rounded border" />
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
    </div>
  );
};
