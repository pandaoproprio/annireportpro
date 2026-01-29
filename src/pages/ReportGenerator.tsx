import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/AppContext';
import { Activity, ActivityType, ReportSection, ExpenseItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Edit, Eye, Printer, Save, Trash2, Plus, ArrowUp, ArrowDown, 
  EyeOff, Image as ImageIcon
} from 'lucide-react';

const DEFAULT_SECTIONS: ReportSection[] = [
  { id: 'summary', type: 'fixed', key: 'summary', title: 'RESUMO EXECUTIVO', isVisible: true },
  { id: 'goals', type: 'fixed', key: 'goals', title: 'CUMPRIMENTO DAS METAS', isVisible: true },
  { id: 'diary', type: 'fixed', key: 'diary', title: 'DIÁRIO DE BORDO', isVisible: true },
  { id: 'other', type: 'fixed', key: 'other', title: 'OUTRAS AÇÕES', isVisible: true },
  { id: 'communication', type: 'fixed', key: 'communication', title: 'COMUNICAÇÃO E DIVULGAÇÃO', isVisible: true },
  { id: 'satisfaction', type: 'fixed', key: 'satisfaction', title: 'SATISFAÇÃO DO PÚBLICO', isVisible: true },
  { id: 'future', type: 'fixed', key: 'future', title: 'PERSPECTIVAS FUTURAS', isVisible: true },
  { id: 'expenses', type: 'fixed', key: 'expenses', title: 'EXECUÇÃO FINANCEIRA', isVisible: true },
  { id: 'links', type: 'fixed', key: 'links', title: 'LINKS E ANEXOS', isVisible: true },
];

export const ReportGenerator: React.FC = () => {
  const { project, activities, updateReportData } = useStore();
  const reportRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [logo, setLogo] = useState<string>('');
  const [objectText, setObjectText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [goalNarratives, setGoalNarratives] = useState<Record<string, string>>({});
  const [otherActionsNarrative, setOtherActionsNarrative] = useState<string>('');
  const [communicationNarrative, setCommunicationNarrative] = useState<string>('');
  const [satisfaction, setSatisfaction] = useState<string>('');
  const [futureActions, setFutureActions] = useState<string>('');
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [links, setLinks] = useState({ attendance: '', registration: '', media: '' });
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_SECTIONS);

  // Initialize from project data
  useEffect(() => {
    if (project) {
      const rd = project.reportData || {};
      
      setLogo(rd.logo || '');
      setObjectText(rd.objectOverride || project.object || '');
      setSummary(rd.executiveSummary || project.summary || '');
      setGoalNarratives(rd.goalNarratives || {});
      setOtherActionsNarrative(rd.otherActionsText || '');
      setCommunicationNarrative(rd.communicationText || '');
      setSatisfaction(rd.satisfactionText || '');
      setFutureActions(rd.futureActionsText || '');
      setExpenses(rd.expenses || []);
      
      if (rd.links) {
        setLinks({
          attendance: rd.links.attendanceList || '',
          registration: rd.links.registrationList || '',
          media: rd.links.mediaFolder || ''
        });
      }

      if (rd.sections && rd.sections.length > 0) {
        setSections(rd.sections);
      }
    }
  }, [project]);

  const saveReportData = () => {
    updateReportData({
      logo,
      objectOverride: objectText,
      executiveSummary: summary,
      goalNarratives,
      otherActionsText: otherActionsNarrative,
      communicationText: communicationNarrative,
      satisfactionText: satisfaction,
      futureActionsText: futureActions,
      expenses,
      links: {
        attendanceList: links.attendance,
        registrationList: links.registration,
        mediaFolder: links.media
      },
      sections 
    });
    alert('Relatório salvo com sucesso!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

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
      isVisible: true
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

  const removeSection = (index: number) => {
    if (confirm('Tem certeza que deseja remover esta seção?')) {
      setSections(sections.filter((_, i) => i !== index));
    }
  };

  const addExpense = () => setExpenses([...expenses, { id: Date.now().toString(), itemName: '', description: '', image: '' }]);
  const updateExpense = (id: string, field: keyof ExpenseItem, value: string) => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  const removeExpense = (id: string) => setExpenses(expenses.filter(e => e.id !== id));

  const getActivitiesByGoal = (goalId: string) => activities.filter(a => a.goalId === goalId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const getActivitiesByType = (type: ActivityType) => activities.filter(a => a.type === type).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const getOtherActivities = () => activities.filter(a => a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const getCommunicationActivities = () => activities.filter(a => a.type === ActivityType.COMUNICACAO).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getAllActivitiesSorted = () => [...activities].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const getTotalAttendees = () => activities.reduce((sum, a) => sum + (a.attendeesCount || 0), 0);

  const formatActivityDate = (date: string, endDate?: string) => {
    const start = new Date(date).toLocaleDateString('pt-BR');
    if (endDate) {
      return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
    }
    return start;
  };

  const renderActivityCard = (act: Activity, showType: boolean = true) => (
    <div key={act.id} className="p-3 border rounded-lg bg-muted/30 mb-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-primary">{formatActivityDate(act.date, act.endDate)}</span>
        {showType && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{act.type}</span>}
        {act.location && <span className="text-xs text-muted-foreground">📍 {act.location}</span>}
        {act.attendeesCount > 0 && <span className="text-xs text-muted-foreground">👥 {act.attendeesCount} participantes</span>}
      </div>
      <p className="text-sm mb-2">{act.description}</p>
      {act.results && <p className="text-xs text-muted-foreground"><strong>Resultados:</strong> {act.results}</p>}
      {act.challenges && <p className="text-xs text-muted-foreground"><strong>Desafios:</strong> {act.challenges}</p>}
      {act.photos && act.photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {act.photos.slice(0, 4).map((photo, idx) => (
            <img key={idx} src={photo} alt="" className="h-16 w-16 object-cover rounded border" />
          ))}
          {act.photos.length > 4 && (
            <div className="h-16 w-16 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
              +{act.photos.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEditSection = (section: ReportSection, index: number) => {
    if (!section.isVisible) return null;

    return (
      <Card key={section.id} className="mb-6 border-l-4 border-l-brand-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 2}</span>
            
            {section.type === 'custom' ? (
              <div className="flex-1">
                <Input 
                  value={section.title}
                  onChange={(e) => updateSectionTitle(index, e.target.value)}
                  className="font-semibold text-lg"
                  placeholder="Título da Seção"
                />
              </div>
            ) : (
              <h3 className="text-lg font-semibold flex-1">{section.title}</h3>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded whitespace-nowrap hidden sm:inline-block">
                {section.type === 'custom' ? 'Personalizada' : 'Padrão'}
              </span>
              {section.type === 'custom' && (
                <button onClick={() => removeSection(index)} className="text-destructive/60 hover:text-destructive p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {section.key === 'summary' && (
            <div className="space-y-2">
              <Label>Conteúdo do Resumo</Label>
              <Textarea rows={6} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Descreva a visão geral..." />
            </div>
          )}

          {section.key === 'goals' && (
            <div className="space-y-6">
              {project.goals.map((goal, idx) => {
                const goalActivities = getActivitiesByGoal(goal.id);
                return (
                  <div key={goal.id} className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-bold text-primary mb-2">META {idx + 1}: {goal.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">Público-alvo: {goal.targetAudience}</p>
                    
                    {goalActivities.length > 0 && (
                      <div className="mb-4 p-3 bg-success/5 border border-success/20 rounded">
                        <p className="text-sm font-medium text-success mb-2">
                          📋 {goalActivities.length} atividade(s) vinculada(s) do Diário de Bordo
                        </p>
                        <div className="max-h-40 overflow-y-auto">
                          {goalActivities.map(act => (
                            <div key={act.id} className="text-xs py-1 border-b last:border-0">
                              <strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 80)}...
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Label>Relato Narrativo</Label>
                    <Textarea 
                      rows={4} 
                      placeholder="Descreva as realizações..."
                      value={goalNarratives[goal.id] || ''}
                      onChange={e => setGoalNarratives({...goalNarratives, [goal.id]: e.target.value})}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {section.key === 'diary' && (
            <div className="space-y-4">
              <div className="p-4 bg-info/5 border border-info/20 rounded-lg">
                <p className="text-sm text-info font-medium mb-2">
                  📚 Resumo do Diário de Bordo
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-2 bg-card rounded border">
                    <p className="text-2xl font-bold text-primary">{activities.length}</p>
                    <p className="text-xs text-muted-foreground">Atividades</p>
                  </div>
                  <div className="p-2 bg-card rounded border">
                    <p className="text-2xl font-bold text-success">{getTotalAttendees()}</p>
                    <p className="text-xs text-muted-foreground">Participantes</p>
                  </div>
                  <div className="p-2 bg-card rounded border">
                    <p className="text-2xl font-bold text-warning">{activities.filter(a => a.photos.length > 0).length}</p>
                    <p className="text-xs text-muted-foreground">Com fotos</p>
                  </div>
                  <div className="p-2 bg-card rounded border">
                    <p className="text-2xl font-bold text-info">{activities.filter(a => a.goalId).length}</p>
                    <p className="text-xs text-muted-foreground">Vinc. a metas</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                As atividades registradas no Diário de Bordo serão automaticamente incluídas na visualização do relatório.
              </p>
            </div>
          )}

          {section.key === 'other' && (
            <div className="space-y-4">
              {getOtherActivities().length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 border rounded">
                  <p className="text-sm font-medium mb-2">📋 Atividades do Diário ({getOtherActivities().length}):</p>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {getOtherActivities().map(act => (
                      <div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 60)}...</div>
                    ))}
                  </div>
                </div>
              )}
              <Textarea rows={4} value={otherActionsNarrative} onChange={e => setOtherActionsNarrative(e.target.value)} placeholder="Ações extras, imprevistos..." />
            </div>
          )}

          {section.key === 'communication' && (
            <div className="space-y-4">
              {getCommunicationActivities().length > 0 && (
                <div className="mb-4 p-3 bg-muted/50 border rounded">
                  <p className="text-sm font-medium mb-2">📋 Atividades de Comunicação ({getCommunicationActivities().length}):</p>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {getCommunicationActivities().map(act => (
                      <div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 60)}...</div>
                    ))}
                  </div>
                </div>
              )}
              <Textarea rows={4} value={communicationNarrative} onChange={e => setCommunicationNarrative(e.target.value)} placeholder="Divulgação, links..." />
            </div>
          )}

          {section.key === 'satisfaction' && (
            <Textarea rows={4} value={satisfaction} onChange={e => setSatisfaction(e.target.value)} placeholder="Feedbacks, pesquisas..." />
          )}

          {section.key === 'future' && (
            <Textarea rows={4} value={futureActions} onChange={e => setFutureActions(e.target.value)} placeholder="Próximos passos..." />
          )}

          {section.key === 'expenses' && (
            <div className="space-y-4">
              {expenses.map((item) => (
                <div key={item.id} className="p-4 border rounded bg-card relative shadow-sm">
                  <button onClick={() => removeExpense(item.id)} className="absolute top-2 right-2 text-destructive hover:text-destructive/80">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Item de Despesa</Label>
                      <Input placeholder="Ex: Coordenador" value={item.itemName} onChange={e => updateExpense(item.id, 'itemName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input placeholder="Detalhes..." value={item.description} onChange={e => updateExpense(item.id, 'description', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addExpense} className="w-full border-dashed">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Item
              </Button>
            </div>
          )}

          {section.key === 'links' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Lista de Presença</Label>
                <Input placeholder="https://..." value={links.attendance} onChange={e => setLinks({...links, attendance: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Lista de Inscrição</Label>
                <Input placeholder="https://..." value={links.registration} onChange={e => setLinks({...links, registration: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Pasta de Mídias</Label>
                <Input placeholder="https://..." value={links.media} onChange={e => setLinks({...links, media: e.target.value})} />
              </div>
            </div>
          )}

          {section.type === 'custom' && (
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea 
                rows={5} 
                value={section.content || ''} 
                onChange={e => updateCustomContent(index, e.target.value)} 
                placeholder="Escreva o conteúdo desta seção..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPreviewSection = (section: ReportSection) => {
    if (!section.isVisible) return null;

    switch (section.key) {
      case 'summary':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify">{summary}</div>
          </section>
        );

      case 'goals':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            {project.goals.map((goal, idx) => {
              const goalActivities = getActivitiesByGoal(goal.id);
              const goalAttendees = goalActivities.reduce((sum, a) => sum + (a.attendeesCount || 0), 0);
              return (
                <div key={goal.id} className="mb-8">
                  <h4 className="font-bold text-primary mb-2">Meta {idx + 1}: {goal.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">Público-alvo: {goal.targetAudience}</p>
                  <p className="whitespace-pre-line text-justify mb-4">{goalNarratives[goal.id] || 'Narrativa não preenchida.'}</p>
                  
                  {goalActivities.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/30 rounded border">
                      <p className="text-sm font-bold mb-3">
                        Atividades Realizadas ({goalActivities.length}) - Total de {goalAttendees} participantes
                      </p>
                      {goalActivities.map(act => (
                        <div key={act.id} className="mb-4 pb-4 border-b last:border-0">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="font-semibold">{formatActivityDate(act.date, act.endDate)}</span>
                            {act.location && <span className="text-sm">• {act.location}</span>}
                            {act.attendeesCount > 0 && <span className="text-sm">• {act.attendeesCount} participantes</span>}
                          </div>
                          <p className="text-sm mb-2">{act.description}</p>
                          {act.results && <p className="text-sm text-muted-foreground"><em>Resultados: {act.results}</em></p>}
                          {act.photos && act.photos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {act.photos.map((photo, idx) => (
                                <img key={idx} src={photo} alt="" className="h-20 w-20 object-cover rounded border print:h-16 print:w-16" />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );

      case 'diary':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            
            {/* Summary Stats */}
            <div className="mb-6 p-4 bg-muted/20 rounded border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{activities.length}</p>
                  <p className="text-xs text-muted-foreground">Atividades</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{getTotalAttendees()}</p>
                  <p className="text-xs text-muted-foreground">Participantes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{activities.filter(a => a.photos.length > 0).length}</p>
                  <p className="text-xs text-muted-foreground">Com fotos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{new Set(activities.map(a => a.location).filter(Boolean)).size}</p>
                  <p className="text-xs text-muted-foreground">Locais</p>
                </div>
              </div>
            </div>

            {/* Activities by Type */}
            {Object.values(ActivityType).map(type => {
              const typeActivities = getActivitiesByType(type);
              if (typeActivities.length === 0) return null;
              return (
                <div key={type} className="mb-6">
                  <h4 className="font-semibold text-primary mb-3">{type} ({typeActivities.length})</h4>
                  {typeActivities.map(act => (
                    <div key={act.id} className="mb-3 pb-3 border-b last:border-0 pl-4 border-l-2 border-muted">
                      <div className="flex flex-wrap gap-2 text-sm mb-1">
                        <span className="font-semibold">{formatActivityDate(act.date, act.endDate)}</span>
                        {act.location && <span>• {act.location}</span>}
                        {act.attendeesCount > 0 && <span>• {act.attendeesCount} participantes</span>}
                      </div>
                      <p className="text-sm">{act.description}</p>
                      {act.results && <p className="text-xs text-muted-foreground mt-1">Resultados: {act.results}</p>}
                      {act.photos && act.photos.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {act.photos.slice(0, 3).map((photo, idx) => (
                            <img key={idx} src={photo} alt="" className="h-12 w-12 object-cover rounded print:h-10 print:w-10" />
                          ))}
                          {act.photos.length > 3 && <span className="text-xs text-muted-foreground self-center">+{act.photos.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        );

      case 'other':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            {otherActionsNarrative && <div className="whitespace-pre-line text-justify mb-4">{otherActionsNarrative}</div>}
            {getOtherActivities().length > 0 && (
              <div className="mt-4 pl-4 border-l-2 border-muted">
                {getOtherActivities().map(act => (
                  <div key={act.id} className="mb-3">
                    <p className="text-sm"><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
                    {act.results && <p className="text-xs text-muted-foreground">Resultado: {act.results}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case 'communication':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            {communicationNarrative && <div className="whitespace-pre-line text-justify mb-4">{communicationNarrative}</div>}
            {getCommunicationActivities().length > 0 && (
              <div className="mt-4 pl-4 border-l-2 border-muted">
                {getCommunicationActivities().map(act => (
                  <div key={act.id} className="mb-3">
                    <p className="text-sm"><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
                    {act.results && <p className="text-xs text-muted-foreground">Resultado: {act.results}</p>}
                    {act.photos && act.photos.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {act.photos.slice(0, 3).map((photo, idx) => (
                          <img key={idx} src={photo} alt="" className="h-12 w-12 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        );

      case 'satisfaction':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify">{satisfaction}</div>
          </section>
        );

      case 'future':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify">{futureActions}</div>
          </section>
        );

      case 'expenses':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground">Nenhum item de despesa registrado.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Item</th>
                    <th className="text-left py-2">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} className="border-b">
                      <td className="py-2">{exp.itemName}</td>
                      <td className="py-2">{exp.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );

      case 'links':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            <ul className="space-y-2">
              {links.attendance && <li><strong>Lista de Presença:</strong> <a href={links.attendance} className="text-primary underline">{links.attendance}</a></li>}
              {links.registration && <li><strong>Lista de Inscrição:</strong> <a href={links.registration} className="text-primary underline">{links.registration}</a></li>}
              {links.media && <li><strong>Pasta de Mídias:</strong> <a href={links.media} className="text-primary underline">{links.media}</a></li>}
            </ul>
          </section>
        );

      case 'custom':
      default:
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify">{section.content}</div>
          </section>
        );
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      {/* Toolbar */}
      <div className="flex justify-between items-center no-print bg-card p-4 shadow-sm rounded-lg sticky top-0 z-10 border-b">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gerador de Relatório</h2>
          <p className="text-muted-foreground text-sm">Configure a ordem, os títulos e preencha o conteúdo.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode('edit')}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button variant={mode === 'preview' ? 'default' : 'outline'} onClick={() => setMode('preview')}>
            <Eye className="w-4 h-4 mr-2" /> Visualizar
          </Button>
          {mode === 'preview' && (
            <Button onClick={() => window.print()} className="animate-scaleIn">
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
          )}
        </div>
      </div>

      {mode === 'edit' && (
        <div className="space-y-8 max-w-4xl mx-auto animate-slideUp pb-12">
          
          {/* Structure Configuration */}
          <Card className="border-l-4 border-l-sidebar">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6 border-b pb-4">
                <span className="bg-sidebar text-sidebar-primary w-8 h-8 rounded-full flex items-center justify-center font-bold">1</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Estrutura do Relatório</h3>
                  <p className="text-sm text-muted-foreground">Organize e renomeie as seções conforme seu edital.</p>
                </div>
              </div>

              <div className="space-y-2">
                {sections.map((section, idx) => (
                  <div key={section.id} className={`flex items-center gap-2 p-3 rounded border transition-all ${section.isVisible ? 'bg-card border-border' : 'bg-muted/50 border-muted opacity-60'}`}>
                    <div className="flex flex-col gap-1 text-muted-foreground">
                      <button onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="hover:text-primary disabled:opacity-20"><ArrowUp size={16} /></button>
                      <button onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1} className="hover:text-primary disabled:opacity-20"><ArrowDown size={16} /></button>
                    </div>
                    
                    <div className="flex-1">
                      <Input 
                        value={section.title} 
                        onChange={(e) => updateSectionTitle(idx, e.target.value)} 
                        className={`font-semibold ${!section.isVisible && 'text-muted-foreground line-through'}`}
                        placeholder="Título da Seção"
                      />
                    </div>
                    
                    <div className="hidden md:block">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${section.type === 'custom' ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>
                        {section.key === 'custom' ? 'Personalizado' : section.key}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleVisibility(idx)} className="p-2 text-muted-foreground hover:text-primary" title="Mostrar/Ocultar">
                        {section.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      {section.type === 'custom' && (
                        <button onClick={() => removeSection(idx)} className="p-2 text-destructive/60 hover:text-destructive" title="Remover">
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" onClick={addCustomSection} className="w-full mt-4 border-dashed border-2">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Seção Personalizada
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cover */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4 border-b pb-2">
                <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">C</span>
                <h3 className="text-lg font-semibold">Capa e Metadados</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {logo && <img src={logo} className="h-16 w-16 object-contain border rounded" />}
                  <div className="flex-1 space-y-2">
                    <Label>Upload Logo</Label>
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Texto da Capa (Objeto)</Label>
                  <Textarea rows={3} value={objectText} onChange={e => setObjectText(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Content Editing */}
          <div className="space-y-6">
            <h3 className="font-bold text-muted-foreground uppercase text-sm tracking-wide ml-1">Preenchimento do Conteúdo</h3>
            {sections.map((section, index) => renderEditSection(section, index))}
          </div>

          <div className="fixed bottom-4 right-4 md:right-8 z-20">
            <Button onClick={saveReportData} className="shadow-xl bg-success hover:bg-success/90 text-success-foreground rounded-full px-6 py-3 h-auto text-base">
              <Save className="w-5 h-5 mr-2" /> Salvar Alterações
            </Button>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {mode === 'preview' && (
        <div className="bg-muted p-4 md:p-8 rounded-lg overflow-auto no-print animate-fadeIn">
          <div ref={reportRef} className="bg-card shadow-2xl p-8 md:p-16 max-w-[210mm] mx-auto min-h-[297mm] text-justify print:shadow-none print:w-full print:max-w-none print:p-0 font-serif text-foreground leading-relaxed animate-slideUp">
            
            {/* Cover Page */}
            <div className="flex flex-col items-center justify-center min-h-[900px] border-b-2 border-muted pb-10 mb-10 page-break">
              <div className="mb-10">
                {logo ? (
                  <img src={logo} className="h-32 object-contain" alt="Logo" />
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-bold text-xs border">LOGO</div>
                )}
              </div>
              <h2 className="text-xl font-bold text-center uppercase mb-2">Relatório Parcial de Cumprimento do Objeto</h2>
              <h1 className="text-2xl font-bold text-center uppercase mb-4">{project.organizationName}</h1>
              <h3 className="text-lg text-center mb-12">Termo de Fomento nº {project.fomentoNumber}</h3>
              <div className="w-full border-t border-b border-border py-8 my-8">
                <div className="mb-8">
                  <span className="font-bold uppercase block text-sm text-muted-foreground mb-2">OBJETO:</span>
                  <p className="text-lg leading-relaxed">{objectText}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div>
                    <span className="font-bold uppercase block text-sm text-muted-foreground">Vigência:</span>
                    <p>{project.startDate && new Date(project.startDate).toLocaleDateString('pt-BR')} - {project.endDate && new Date(project.endDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="font-bold uppercase block text-sm text-muted-foreground">Projeto:</span>
                    <p>{project.name}</p>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-20 text-center">
                <p>Rio de Janeiro, {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>

            {/* Dynamic Sections */}
            {sections.map(section => renderPreviewSection(section))}

            {/* Signature */}
            <div className="mt-20 pt-10 flex flex-col items-center break-inside-avoid">
              <div className="w-80 border-t border-foreground mb-2"></div>
              <p className="font-bold uppercase">Assinatura do Responsável</p>
              <p className="text-sm uppercase">{project.organizationName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
