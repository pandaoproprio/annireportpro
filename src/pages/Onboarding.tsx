import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/hooks/useAuth';
import { Project, Goal, TeamMember } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ArrowRight, Save, ArrowLeft, Loader2 } from 'lucide-react';

export const Onboarding: React.FC = () => {
  const { addProject, projects, isLoadingProjects: isLoading } = useAppData();
  const { role } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<Omit<Project, 'id'>>>({
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
    goals: [],
    team: [],
    locations: [],
  });

  const [tempGoal, setTempGoal] = useState<Partial<Goal>>({ title: '', description: '', targetAudience: '' });
  const [tempMember, setTempMember] = useState<Partial<TeamMember>>({ name: '', role: '' });
  const [tempLocation, setTempLocation] = useState('');

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);
  const handleCancel = () => navigate('/');

  const addGoal = () => {
    if (tempGoal.title && tempGoal.description) {
      setFormData(prev => ({
        ...prev,
        goals: [...(prev.goals || []), { ...tempGoal, id: Date.now().toString() } as Goal]
      }));
      setTempGoal({ title: '', description: '', targetAudience: '' });
    }
  };

  const addTeamMember = () => {
    if (tempMember.name && tempMember.role) {
      setFormData(prev => ({
        ...prev,
        team: [...(prev.team || []), { ...tempMember, id: Date.now().toString() } as TeamMember]
      }));
      setTempMember({ name: '', role: '' });
    }
  };

  const addLocation = () => {
    if (tempLocation) {
      setFormData(prev => ({
        ...prev,
        locations: [...(prev.locations || []), tempLocation]
      }));
      setTempLocation('');
    }
  };

  const handleFinish = async () => {
    if (formData.name && formData.organizationName) {
      setIsSaving(true);
      
      const newProject = await addProject({
        organizationName: formData.organizationName,
        organizationAddress: formData.organizationAddress,
        organizationWebsite: formData.organizationWebsite,
        organizationEmail: formData.organizationEmail,
        organizationPhone: formData.organizationPhone,
        name: formData.name,
        fomentoNumber: formData.fomentoNumber || '',
        funder: formData.funder || '',
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        endDate: formData.endDate || new Date().toISOString().split('T')[0],
        object: formData.object || '',
        summary: formData.summary || '',
        goals: formData.goals || [],
        team: formData.team || [],
        locations: formData.locations || [],
        reportData: {}
      });
      
      setIsSaving(false);
      
      if (newProject) {
        navigate('/');
      } else {
        alert("Erro ao criar projeto. Tente novamente.");
      }
    } else {
      alert("Por favor, preencha as informações obrigatórias.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gradient-to-br from-brand-50 via-background to-brand-100 flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-3xl w-full animate-fadeIn">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Novo Projeto</h1>
            <p className="text-muted-foreground mt-2">Vamos configurar os dados para iniciar os relatórios.</p>
          </div>
          {(projects.length > 0 || role === 'SUPER_ADMIN' || role === 'ADMIN') && (
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancelar
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex justify-between mb-6 gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 flex-1 rounded ${step >= i ? 'bg-primary' : 'bg-muted'} transition-colors`} />
          ))}
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="pt-6">
            {step === 1 && (
              <div className="space-y-4">
                <CardTitle className="text-xl mb-4">Dados Básicos</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Organização *</Label>
                    <Input value={formData.organizationName} onChange={e => setFormData({ ...formData, organizationName: e.target.value })} placeholder="ONG Exemplo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Projeto *</Label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Projeto Cultura Viva" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço da Organização</Label>
                    <Input value={formData.organizationAddress} onChange={e => setFormData({ ...formData, organizationAddress: e.target.value })} placeholder="Rua..., nº... - Bairro, Cidade - UF, CEP" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={formData.organizationWebsite} onChange={e => setFormData({ ...formData, organizationWebsite: e.target.value })} placeholder="www.exemplo.org.br" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={formData.organizationEmail} onChange={e => setFormData({ ...formData, organizationEmail: e.target.value })} placeholder="contato@exemplo.org.br" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={formData.organizationPhone} onChange={e => setFormData({ ...formData, organizationPhone: e.target.value })} placeholder="(21) 99999-9999" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº Termo/Fomento</Label>
                    <Input value={formData.fomentoNumber} onChange={e => setFormData({ ...formData, fomentoNumber: e.target.value })} placeholder="001/2024" />
                  </div>
                  <div className="space-y-2">
                    <Label>Órgão Financiador</Label>
                    <Input value={formData.funder} onChange={e => setFormData({ ...formData, funder: e.target.value })} placeholder="Sec. de Cultura" />
                  </div>
                  <div className="space-y-2">
                    <Label>Início da Vigência</Label>
                    <Input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim da Vigência</Label>
                    <Input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Objeto do Projeto (Resumo oficial)</Label>
                  <Textarea 
                    value={formData.object} 
                    onChange={e => setFormData({ ...formData, object: e.target.value })} 
                    placeholder="Descreva o objeto conforme consta no termo de fomento..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleNext}>Próximo <ArrowRight className="ml-2 w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <CardTitle className="text-xl mb-4">Metas e Planejamento</CardTitle>
                
                <div className="bg-accent p-4 rounded-lg border border-border">
                  <h3 className="font-medium text-accent-foreground mb-3">Adicionar Meta</h3>
                  <div className="space-y-3">
                    <Input 
                      placeholder="Título da Meta (ex: Realizar 10 oficinas)" 
                      value={tempGoal.title} 
                      onChange={e => setTempGoal({ ...tempGoal, title: e.target.value })} 
                    />
                    <Input 
                      placeholder="Público Alvo (ex: 200 Jovens)" 
                      value={tempGoal.targetAudience} 
                      onChange={e => setTempGoal({ ...tempGoal, targetAudience: e.target.value })} 
                    />
                    <Textarea 
                      placeholder="Descrição detalhada da meta..." 
                      value={tempGoal.description} 
                      onChange={e => setTempGoal({ ...tempGoal, description: e.target.value })} 
                      rows={2}
                    />
                    <Button variant="secondary" onClick={addGoal} className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Meta
                    </Button>
                  </div>
                </div>

                {formData.goals && formData.goals.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase">Metas Cadastradas</h4>
                    {formData.goals.map((goal, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded border border-border">
                        <div>
                          <p className="font-medium text-foreground">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">{goal.targetAudience}</p>
                        </div>
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, goals: prev.goals?.filter((_, i) => i !== idx) }))}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleBack}>Voltar</Button>
                  <Button onClick={handleNext}>Próximo <ArrowRight className="ml-2 w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <CardTitle className="text-xl mb-4">Equipe e Locais</CardTitle>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team */}
                  <div>
                    <h3 className="font-medium text-foreground mb-3">Equipe Técnica</h3>
                    <div className="space-y-2 mb-3">
                      <Input placeholder="Nome" value={tempMember.name} onChange={e => setTempMember({...tempMember, name: e.target.value})} />
                      <Input placeholder="Função (ex: Coordenador)" value={tempMember.role} onChange={e => setTempMember({...tempMember, role: e.target.value})} />
                      <Button variant="secondary" onClick={addTeamMember} className="w-full">Add Membro</Button>
                    </div>
                    <ul className="space-y-1">
                      {formData.team?.map((m, i) => (
                        <li key={i} className="text-sm bg-muted p-2 rounded flex justify-between">
                          <span><strong>{m.name}</strong> - {m.role}</span>
                          <Trash2 className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-destructive" onClick={() => setFormData(p => ({...p, team: p.team?.filter((_, idx) => idx !== i)}))} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Locations */}
                  <div>
                    <h3 className="font-medium text-foreground mb-3">Locais de Execução</h3>
                    <div className="flex gap-2 mb-3">
                      <Input placeholder="Nome do Local/Bairro" value={tempLocation} onChange={e => setTempLocation(e.target.value)} />
                      <Button variant="secondary" onClick={addLocation}><Plus className="w-4 h-4" /></Button>
                    </div>
                    <ul className="space-y-1">
                      {formData.locations?.map((l, i) => (
                        <li key={i} className="text-sm bg-muted p-2 rounded flex justify-between">
                          <span>{l}</span>
                          <Trash2 className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-destructive" onClick={() => setFormData(p => ({...p, locations: p.locations?.filter((_, idx) => idx !== i)}))} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-between pt-6 border-t mt-4">
                  <Button variant="outline" onClick={handleBack}>Voltar</Button>
                  <Button onClick={handleFinish} className="bg-success hover:bg-success/90 text-success-foreground" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Criar Projeto
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
