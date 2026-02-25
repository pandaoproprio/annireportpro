import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppData } from '@/contexts/AppDataContext';
import { Goal, TeamMember } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Database, LogOut, Edit, Save, Plus, Trash2, X, Loader2, FolderCog, List 
} from 'lucide-react';
import { toast } from 'sonner';
import { BatchDeleteProjects } from '@/components/BatchDeleteProjects';
import { TrashBin } from '@/components/TrashBin';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export const Settings: React.FC = () => {
  const { signOut } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const { activeProject, updateProject, removeProject, isLoadingProjects } = useAppData();
  
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBatchDelete, setShowBatchDelete] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationAddress: '',
    organizationWebsite: '',
    organizationEmail: '',
    organizationPhone: '',
    name: '',
    fomentoNumber: '',
    funder: '',
    startDate: '',
    endDate: '',
    object: '',
    summary: '',
    goals: [] as Goal[],
    team: [] as TeamMember[],
    locations: [] as string[],
  });
  
  const [tempGoal, setTempGoal] = useState<Partial<Goal>>({ title: '', description: '', targetAudience: '' });
  const [tempMember, setTempMember] = useState<Partial<TeamMember>>({ name: '', role: '' });
  const [tempLocation, setTempLocation] = useState('');
  
  const startEditing = () => {
    if (activeProject) {
      setFormData({
        organizationName: activeProject.organizationName || '',
        organizationAddress: activeProject.organizationAddress || '',
        organizationWebsite: activeProject.organizationWebsite || '',
        organizationEmail: activeProject.organizationEmail || '',
        organizationPhone: activeProject.organizationPhone || '',
        name: activeProject.name || '',
        fomentoNumber: activeProject.fomentoNumber || '',
        funder: activeProject.funder || '',
        startDate: activeProject.startDate || '',
        endDate: activeProject.endDate || '',
        object: activeProject.object || '',
        summary: activeProject.summary || '',
        goals: [...(activeProject.goals || [])],
        team: [...(activeProject.team || [])],
        locations: [...(activeProject.locations || [])],
      });
      setIsEditingProject(true);
    }
  };
  
  const cancelEditing = () => {
    setIsEditingProject(false);
    setTempGoal({ title: '', description: '', targetAudience: '' });
    setTempMember({ name: '', role: '' });
    setTempLocation('');
  };
  
  const handleSaveProject = async () => {
    if (!activeProject) return;
    
    setIsSaving(true);
    try {
      await updateProject({
        ...activeProject,
        ...formData,
      });
      toast.success('Projeto atualizado com sucesso!');
      setIsEditingProject(false);
    } catch (error) {
      toast.error('Erro ao salvar projeto');
    } finally {
      setIsSaving(false);
    }
  };
  
  const addGoal = () => {
    if (tempGoal.title && tempGoal.description) {
      setFormData(prev => ({
        ...prev,
        goals: [...prev.goals, { ...tempGoal, id: Date.now().toString() } as Goal]
      }));
      setTempGoal({ title: '', description: '', targetAudience: '' });
    }
  };
  
  const removeGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index)
    }));
  };
  
  const addTeamMember = () => {
    if (tempMember.name && tempMember.role) {
      setFormData(prev => ({
        ...prev,
        team: [...prev.team, { ...tempMember, id: Date.now().toString() } as TeamMember]
      }));
      setTempMember({ name: '', role: '' });
    }
  };
  
  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      team: prev.team.filter((_, i) => i !== index)
    }));
  };
  
  const addLocation = () => {
    if (tempLocation.trim()) {
      setFormData(prev => ({
        ...prev,
        locations: [...prev.locations, tempLocation.trim()]
      }));
      setTempLocation('');
    }
  };
  
  const removeLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index)
    }));
  };

  const handleDeleteProject = async () => {
    if (!activeProject) return;
    await removeProject(activeProject.id);
    toast.success('Projeto excluído com sucesso!');
    setShowDeleteConfirm(false);
  };

  const handleLogout = async () => {
    await signOut();
    window.location.reload();
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
        <p className="text-muted-foreground">Gerencie sua conta e preferências.</p>
      </div>

      {/* Project Settings */}
      {activeProject && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <FolderCog className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Configurações do Projeto</h3>
                    <p className="text-sm text-muted-foreground">
                      Projeto atual: <strong>{activeProject.name}</strong>
                    </p>
                  </div>
                  {!isEditingProject && (
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={startEditing} variant="outline">
                        <Edit className="w-4 h-4 mr-2" /> Editar Projeto
                      </Button>
                      {hasPermission('project_delete') && (
                        <>
                          <Button onClick={() => setShowDeleteConfirm(true)} variant="outline" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir Projeto
                          </Button>
                          <Button onClick={() => setShowBatchDelete(true)} variant="outline" className="text-destructive hover:bg-destructive/10">
                            <List className="w-4 h-4 mr-2" /> Excluir em Lote
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {isEditingProject && (
                  <div className="space-y-6 border-t pt-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nome da Organização *</Label>
                        <Input 
                          value={formData.organizationName} 
                          onChange={e => setFormData({ ...formData, organizationName: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome do Projeto *</Label>
                        <Input 
                          value={formData.name} 
                          onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Endereço</Label>
                        <Input 
                          value={formData.organizationAddress} 
                          onChange={e => setFormData({ ...formData, organizationAddress: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Website</Label>
                        <Input 
                          value={formData.organizationWebsite} 
                          onChange={e => setFormData({ ...formData, organizationWebsite: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input 
                          value={formData.organizationEmail} 
                          onChange={e => setFormData({ ...formData, organizationEmail: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone</Label>
                        <Input 
                          value={formData.organizationPhone} 
                          onChange={e => setFormData({ ...formData, organizationPhone: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nº Termo/Fomento</Label>
                        <Input 
                          value={formData.fomentoNumber} 
                          onChange={e => setFormData({ ...formData, fomentoNumber: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Órgão Financiador</Label>
                        <Input 
                          value={formData.funder} 
                          onChange={e => setFormData({ ...formData, funder: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Início da Vigência</Label>
                        <Input 
                          type="date" 
                          value={formData.startDate} 
                          onChange={e => setFormData({ ...formData, startDate: e.target.value })} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fim da Vigência</Label>
                        <Input 
                          type="date" 
                          value={formData.endDate} 
                          onChange={e => setFormData({ ...formData, endDate: e.target.value })} 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Objeto do Projeto</Label>
                      <Textarea 
                        value={formData.object} 
                        onChange={e => setFormData({ ...formData, object: e.target.value })} 
                        rows={3}
                      />
                    </div>
                    
                    {/* Goals */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Metas do Projeto</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input 
                          placeholder="Título da Meta" 
                          value={tempGoal.title} 
                          onChange={e => setTempGoal({ ...tempGoal, title: e.target.value })} 
                        />
                        <Input 
                          placeholder="Público Alvo" 
                          value={tempGoal.targetAudience} 
                          onChange={e => setTempGoal({ ...tempGoal, targetAudience: e.target.value })} 
                        />
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Descrição" 
                            value={tempGoal.description} 
                            onChange={e => setTempGoal({ ...tempGoal, description: e.target.value })} 
                          />
                          <Button type="button" variant="secondary" onClick={addGoal} size="icon">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {formData.goals.length > 0 && (
                        <ul className="space-y-2">
                          {formData.goals.map((goal, idx) => (
                            <li key={goal.id || idx} className="flex justify-between items-start p-2 bg-muted rounded">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{goal.title}</span>
                                  {goal.targetAudience && <span className="text-sm text-muted-foreground">({goal.targetAudience})</span>}
                                </div>
                                {goal.description && <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>}
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeGoal(idx)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    
                    {/* Team */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Equipe Técnica (Prestadores de Serviço)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input 
                          placeholder="Nome" 
                          value={tempMember.name} 
                          onChange={e => setTempMember({ ...tempMember, name: e.target.value })} 
                        />
                        <Input 
                          placeholder="Função/Cargo" 
                          value={tempMember.role} 
                          onChange={e => setTempMember({ ...tempMember, role: e.target.value })} 
                        />
                        <Button type="button" variant="secondary" onClick={addTeamMember}>
                          <Plus className="w-4 h-4 mr-2" /> Adicionar
                        </Button>
                      </div>
                      {formData.team.length > 0 && (
                        <ul className="space-y-2">
                          {formData.team.map((member, idx) => (
                            <li key={member.id || idx} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span><strong>{member.name}</strong> - {member.role}</span>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeTeamMember(idx)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    
                    {/* Locations */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <h4 className="font-medium">Locais de Execução</h4>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nome do Local" 
                          value={tempLocation} 
                          onChange={e => setTempLocation(e.target.value)} 
                        />
                        <Button type="button" variant="secondary" onClick={addLocation}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {formData.locations.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                          {formData.locations.map((loc, idx) => (
                            <li key={idx} className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full">
                              <span className="text-sm">{loc}</span>
                              <button type="button" onClick={() => removeLocation(idx)}>
                                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={cancelEditing}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveProject} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar Alterações
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showBatchDelete && hasPermission('project_delete') && (
        <BatchDeleteProjects onClose={() => setShowBatchDelete(false)} />
      )}

      {/* Trash / Recycle Bin - Admin only */}
      {hasPermission('project_delete') && <TrashBin />}

      {/* Storage Info - Admin only */}
      {isAdmin && (
        <Card className="border-l-4 border-l-info">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="bg-info/10 p-3 rounded-full">
                <Database className="w-6 h-6 text-info" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">Armazenamento de Dados</h3>
                <p className="text-sm text-muted-foreground mb-4 mt-1">
                  Seus dados estão armazenados de forma segura no banco de dados. Você pode acessá-los de qualquer dispositivo após fazer login.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-l-4 border-l-warning">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-warning/10 p-3 rounded-full">
              <LogOut className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Sessão</h3>
              <p className="text-sm text-muted-foreground mb-4 mt-1">
                Encerre sua sessão atual. Você precisará fazer login novamente para acessar o sistema.
              </p>
              
              <Button variant="outline" onClick={() => setShowLogoutConfirm(true)}>
                <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground mt-8">
        <p>Os dados são armazenados de forma segura com Lovable Cloud.</p>
        <p>Seus dados estão sincronizados entre todos os dispositivos.</p>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Excluir Projeto"
        description={`Tem certeza que deseja excluir o projeto "${activeProject?.name}"? Esta ação não pode ser desfeita e todas as atividades e relatórios associados serão perdidos.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDeleteProject}
      />

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sair da Conta"
        description="Tem certeza que deseja sair da sua conta?"
        confirmLabel="Sair"
        onConfirm={handleLogout}
      />
    </div>
  );
};
