import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/AppContext';
import { Activity, ActivityType, ReportSection, ExpenseItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { PhotoGallerySection } from '@/components/report/PhotoGallerySection';
import { 
  Edit, Eye, Printer, Save, Trash2, Plus, ArrowUp, ArrowDown, 
  EyeOff, Image as ImageIcon, Upload, Download, Loader2
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

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

export const ReportGenerator: React.FC = () => {
  const { project, activities, updateReportData } = useStore();
  const reportRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isExporting, setIsExporting] = useState(false);
  const [logo, setLogo] = useState<string>('');
  const [logoSecondary, setLogoSecondary] = useState<string>('');
  const [objectText, setObjectText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [goalNarratives, setGoalNarratives] = useState<Record<string, string>>({});
  const [goalPhotos, setGoalPhotos] = useState<Record<string, string[]>>({});
  const [otherActionsNarrative, setOtherActionsNarrative] = useState<string>('');
  const [otherActionsPhotos, setOtherActionsPhotos] = useState<string[]>([]);
  const [communicationNarrative, setCommunicationNarrative] = useState<string>('');
  const [communicationPhotos, setCommunicationPhotos] = useState<string[]>([]);
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
        mediaFolder: links.media
      },
      sections 
    });
    alert('Relatório salvo com sucesso!');
  };

  const exportToPdf = async () => {
    if (!reportRef.current || !project) return;
    
    setIsExporting(true);
    
    try {
      const element = reportRef.current;
      const filename = `Relatorio_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait' 
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isSecondary = false) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isSecondary) {
          setLogoSecondary(reader.result as string);
        } else {
          setLogo(reader.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const base64Promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      const newPhotos = await Promise.all(base64Promises);
      setter(prev => [...prev, ...newPhotos]);
      e.target.value = '';
    }
  };

  const handleGoalPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, goalId: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const base64Promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });
      const newPhotos = await Promise.all(base64Promises);
      setGoalPhotos(prev => ({
        ...prev,
        [goalId]: [...(prev[goalId] || []), ...newPhotos]
      }));
      e.target.value = '';
    }
  };

  const removeGoalPhoto = (goalId: string, index: number) => {
    setGoalPhotos(prev => ({
      ...prev,
      [goalId]: (prev[goalId] || []).filter((_, i) => i !== index)
    }));
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

  const handleExpenseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, expenseId: string) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateExpense(expenseId, 'image', reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // Helpers
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

  if (!project) return <div className="p-8 text-center text-muted-foreground">Projeto não encontrado.</div>;

  // Header/Footer for print
  const ReportHeader = () => (
    <div className="flex justify-between items-center mb-6 pb-4 border-b print:border-b-0">
      <div className="flex items-center gap-4">
        {logo ? <img src={logo} alt="Logo" className="h-12 object-contain" /> : <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs">LOGO</div>}
      </div>
      <div className="flex items-center gap-4">
        {logoSecondary ? <img src={logoSecondary} alt="Logo Secundário" className="h-12 object-contain" /> : <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs">LOGO</div>}
      </div>
    </div>
  );

  const ReportFooter = () => (
    <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground print:fixed print:bottom-0 print:left-0 print:right-0 print:bg-card print:py-2">
      <p className="font-semibold">{project.organizationName}</p>
      {project.organizationAddress && <p>{project.organizationAddress}</p>}
      <p>
        {project.organizationWebsite && <span>{project.organizationWebsite}</span>}
        {project.organizationEmail && <span> | {project.organizationEmail}</span>}
        {project.organizationPhone && <span> | {project.organizationPhone}</span>}
      </p>
    </div>
  );

  const renderEditSection = (section: ReportSection, index: number) => {
    if (!section.isVisible) return null;

    return (
      <Card key={section.id} className="mb-6 border-l-4 border-l-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4 border-b pb-2">
            <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
            
            {section.type === 'custom' ? (
              <Input 
                value={section.title}
                onChange={(e) => updateSectionTitle(index, e.target.value)}
                className="font-semibold text-lg flex-1"
                placeholder="Título da Seção"
              />
            ) : (
              <h3 className="text-lg font-semibold flex-1">{section.title}</h3>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded hidden sm:inline-block">
                {section.type === 'custom' ? 'Personalizada' : 'Padrão'}
              </span>
              {section.type === 'custom' && (
                <button onClick={() => removeSection(index)} className="text-destructive/60 hover:text-destructive p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {section.key === 'object' && (
            <div className="space-y-2">
              <Label>Texto do Objeto</Label>
              <Textarea rows={4} value={objectText} onChange={e => setObjectText(e.target.value)} placeholder="Descrição do objeto do termo de fomento..." />
            </div>
          )}

          {section.key === 'summary' && (
            <div className="space-y-2">
              <Label>Resumo / Visão Geral</Label>
              <Textarea rows={8} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Descreva a visão geral das atividades realizadas, contexto, e principais realizações..." />
            </div>
          )}

          {section.key === 'goals' && (
            <div className="space-y-6">
              {project.goals.map((goal, idx) => {
                const goalActs = getActivitiesByGoal(goal.id);
                const photos = goalPhotos[goal.id] || [];
                return (
                  <div key={goal.id} className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-bold text-primary mb-2">META {idx + 1}: {goal.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">Público-alvo: {goal.targetAudience}</p>
                    
                    {goalActs.length > 0 && (
                      <div className="mb-4 p-3 bg-success/5 border border-success/20 rounded">
                        <p className="text-sm font-medium text-success mb-2">
                          📋 {goalActs.length} atividade(s) do Diário de Bordo vinculadas
                        </p>
                        <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                          {goalActs.map(act => (
                            <div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 80)}...</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Label>Relato Narrativo da Meta</Label>
                    <Textarea 
                      rows={5} 
                      placeholder="Descreva as realizações, metodologia, resultados alcançados..."
                      value={goalNarratives[goal.id] || ''}
                      onChange={e => setGoalNarratives({...goalNarratives, [goal.id]: e.target.value})}
                      className="mb-3"
                    />
                    
                    <Label className="flex items-center gap-2 mt-4">
                      <ImageIcon className="w-4 h-4" /> Fotos da Meta
                    </Label>
                    <Input type="file" accept="image/*" multiple onChange={e => handleGoalPhotoUpload(e, goal.id)} className="mb-2" />
                    {photos.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {photos.map((photo, pIdx) => (
                          <div key={pIdx} className="relative group">
                            <img src={photo} alt="" className="h-20 w-20 object-cover rounded border" />
                            <button 
                              type="button" 
                              onClick={() => removeGoalPhoto(goal.id, pIdx)} 
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {section.key === 'other' && (
            <div className="space-y-4">
              {getOtherActivities().length > 0 && (
                <div className="p-3 bg-muted/50 border rounded">
                  <p className="text-sm font-medium mb-2">📋 Atividades relacionadas ({getOtherActivities().length}):</p>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {getOtherActivities().map(act => (
                      <div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 60)}...</div>
                    ))}
                  </div>
                </div>
              )}
              <Textarea rows={5} value={otherActionsNarrative} onChange={e => setOtherActionsNarrative(e.target.value)} placeholder="Descreva outras informações, ações extras, imprevistos, acontecimentos relevantes..." />
              <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotos</Label>
              <Input type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(e, setOtherActionsPhotos)} />
              {otherActionsPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {otherActionsPhotos.map((p, i) => (
                    <div key={i} className="relative group">
                      <img src={p} alt="" className="h-16 w-16 object-cover rounded border" />
                      <button onClick={() => setOtherActionsPhotos(prev => prev.filter((_, idx) => idx !== i))} 
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section.key === 'communication' && (
            <div className="space-y-4">
              {getCommunicationActivities().length > 0 && (
                <div className="p-3 bg-muted/50 border rounded">
                  <p className="text-sm font-medium mb-2">📋 Atividades de divulgação ({getCommunicationActivities().length}):</p>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                    {getCommunicationActivities().map(act => (
                      <div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 60)}...</div>
                    ))}
                  </div>
                </div>
              )}
              <Textarea rows={5} value={communicationNarrative} onChange={e => setCommunicationNarrative(e.target.value)} placeholder="Descreva as ações de divulgação, publicações, links de matérias..." />
              <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotos e Artes de Divulgação</Label>
              <Input type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(e, setCommunicationPhotos)} />
              {communicationPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {communicationPhotos.map((p, i) => (
                    <div key={i} className="relative group">
                      <img src={p} alt="" className="h-16 w-16 object-cover rounded border" />
                      <button onClick={() => setCommunicationPhotos(prev => prev.filter((_, idx) => idx !== i))} 
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section.key === 'satisfaction' && (
            <Textarea rows={5} value={satisfaction} onChange={e => setSatisfaction(e.target.value)} placeholder="Descreva a visão do público sobre o projeto, feedbacks recebidos, resultados de pesquisas de satisfação..." />
          )}

          {section.key === 'future' && (
            <Textarea rows={4} value={futureActions} onChange={e => setFutureActions(e.target.value)} placeholder="Descreva as ações futuras do projeto, próximos passos, planejamento..." />
          )}

          {section.key === 'expenses' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Insira fotos e descreva sobre o uso e aplicação de cada item de despesa previsto no plano de trabalho.
              </p>
              {expenses.map((item) => (
                <div key={item.id} className="p-4 border rounded bg-card relative shadow-sm">
                  <button onClick={() => removeExpense(item.id)} className="absolute top-2 right-2 text-destructive hover:text-destructive/80">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Item de Despesa</Label>
                      <Input placeholder="Ex: Coordenador Geral" value={item.itemName} onChange={e => updateExpense(item.id, 'itemName', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Relato de Uso no Projeto</Label>
                      <Input placeholder="Descrição..." value={item.description} onChange={e => updateExpense(item.id, 'description', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Registro Fotográfico</Label>
                      <Input type="file" accept="image/*" onChange={e => handleExpenseImageUpload(e, item.id)} />
                      {item.image && <img src={item.image} alt="" className="h-16 w-16 object-cover rounded border mt-1" />}
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addExpense} className="w-full border-dashed">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Item de Despesa
              </Button>
            </div>
          )}

          {section.key === 'links' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Insira os links para os documentos de comprovação.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Link das Listas de Presença</Label>
                  <Input placeholder="https://..." value={links.attendance} onChange={e => setLinks({...links, attendance: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Link das Listas de Inscrição</Label>
                  <Input placeholder="https://..." value={links.registration} onChange={e => setLinks({...links, registration: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Link das Mídias (Fotos, Vídeos)</Label>
                  <Input placeholder="https://..." value={links.media} onChange={e => setLinks({...links, media: e.target.value})} />
                </div>
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
      case 'object':
        return (
          <section key={section.id} className="mb-8 page-break">
            <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
            <p className="text-justify leading-relaxed">{objectText}</p>
          </section>
        );

      case 'summary':
        return (
          <section key={section.id} className="mb-8 page-break">
            <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify leading-relaxed">{summary}</div>
          </section>
        );

      case 'goals':
        return (
          <React.Fragment key={section.id}>
            {/* Narrativas das Metas */}
            <section className="mb-8 page-break">
              <h3 className="text-lg font-bold uppercase mb-6">{section.title}</h3>
              {project.goals.map((goal, idx) => {
                const goalActs = getActivitiesByGoal(goal.id);
                return (
                  <div key={goal.id} className="mb-10">
                    <h4 className="font-bold text-primary mb-3">META {idx + 1} – {goal.title}</h4>
                    
                    <div className="whitespace-pre-line text-justify mb-4 leading-relaxed">
                      {goalNarratives[goal.id] || '[Descreva as realizações da meta e das etapas, tendo como foco o que foi previsto]'}
                    </div>

                    {goalActs.length > 0 && (
                      <div className="mt-4 text-sm">
                        <p className="font-medium mb-2">Atividades realizadas:</p>
                        {goalActs.map(act => (
                          <div key={act.id} className="mb-2 pl-4 border-l-2 border-muted">
                            <p><strong>{formatActivityDate(act.date, act.endDate)}</strong>{act.location && ` – ${act.location}`}{act.attendeesCount > 0 && ` – ${act.attendeesCount} participantes`}</p>
                            <p>{act.description}</p>
                            {act.results && <p className="text-muted-foreground">Resultados: {act.results}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {/* Seções de Registros Fotográficos Separadas por Meta */}
            {project.goals.map((goal, idx) => {
              const goalActs = getActivitiesByGoal(goal.id);
              const allPhotos = [...(goalPhotos[goal.id] || [])];
              
              if (allPhotos.length === 0 && goalActs.every(a => !a.photos || a.photos.length === 0)) {
                return null;
              }

              return (
                <PhotoGallerySection
                  key={`photos-${goal.id}`}
                  title={`META ${idx + 1}: ${goal.title}`}
                  photos={goalPhotos[goal.id] || []}
                  activities={goalActs}
                  organizationName={project.organizationName}
                  organizationAddress={project.organizationAddress}
                  organizationWebsite={project.organizationWebsite}
                  organizationEmail={project.organizationEmail}
                  organizationPhone={project.organizationPhone}
                />
              );
            })}
          </React.Fragment>
        );

      case 'other':
        const otherActs = getOtherActivities();
        const hasOtherPhotos = otherActionsPhotos.length > 0 || otherActs.some(a => a.photos && a.photos.length > 0);
        return (
          <React.Fragment key={section.id}>
            <section className="mb-8 page-break">
              <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
              <div className="whitespace-pre-line text-justify mb-4 leading-relaxed">
                {otherActionsNarrative || '[Descreva outras informações diversas sobre o projeto]'}
              </div>
              {otherActs.length > 0 && (
                <div className="mt-4 text-sm">
                  {otherActs.map(act => (
                    <div key={act.id} className="mb-2 pl-4 border-l-2 border-muted">
                      <p><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Galeria de Fotos de Outras Ações */}
            {hasOtherPhotos && (
              <PhotoGallerySection
                title="OUTRAS AÇÕES"
                photos={otherActionsPhotos}
                activities={otherActs}
                organizationName={project.organizationName}
                organizationAddress={project.organizationAddress}
                organizationWebsite={project.organizationWebsite}
                organizationEmail={project.organizationEmail}
                organizationPhone={project.organizationPhone}
              />
            )}
          </React.Fragment>
        );

      case 'communication':
        const commActs = getCommunicationActivities();
        const hasCommPhotos = communicationPhotos.length > 0 || commActs.some(a => a.photos && a.photos.length > 0);
        return (
          <React.Fragment key={section.id}>
            <section className="mb-8 page-break">
              <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
              <div className="whitespace-pre-line text-justify mb-4 leading-relaxed">
                {communicationNarrative || '[Descreva as ações de divulgação]'}
              </div>
              {commActs.length > 0 && (
                <div className="mt-4 text-sm">
                  {commActs.map(act => (
                    <div key={act.id} className="mb-3">
                      <p><strong>{formatActivityDate(act.date)}</strong>: {act.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Galeria de Fotos de Comunicação */}
            {hasCommPhotos && (
              <PhotoGallerySection
                title="PUBLICAÇÕES E DIVULGAÇÃO"
                photos={communicationPhotos}
                activities={commActs}
                organizationName={project.organizationName}
                organizationAddress={project.organizationAddress}
                organizationWebsite={project.organizationWebsite}
                organizationEmail={project.organizationEmail}
                organizationPhone={project.organizationPhone}
              />
            )}
          </React.Fragment>
        );

      case 'satisfaction':
        return (
          <section key={section.id} className="mb-8 page-break">
            <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify leading-relaxed">
              {satisfaction || '[Descreva a visão do público sobre o projeto e os principais feedbacks]'}
            </div>
          </section>
        );

      case 'future':
        return (
          <section key={section.id} className="mb-8 page-break">
            <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify leading-relaxed">
              {futureActions || '[Descreva as ações futuras do projeto]'}
            </div>
          </section>
        );

      case 'expenses':
        return (
          <section key={section.id} className="mb-8 page-break">
            <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Insira fotos e descreva sobre o uso e aplicação de cada item de despesa previsto no plano de trabalho.
            </p>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground italic">[Nenhum item de despesa registrado]</p>
            ) : (
              <table className="w-full text-sm border-collapse border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left py-2 px-3 border font-semibold">ITEM DE DESPESA</th>
                    <th className="text-left py-2 px-3 border font-semibold">RELATO DE USO NO PROJETO</th>
                    <th className="text-left py-2 px-3 border font-semibold">REGISTRO FOTOGRÁFICO</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} className="border-b">
                      <td className="py-2 px-3 border">{exp.itemName || '-'}</td>
                      <td className="py-2 px-3 border">{exp.description || '-'}</td>
                      <td className="py-2 px-3 border">
                        {exp.image ? <img src={exp.image} alt="" className="h-16 w-16 object-cover rounded" /> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );

      case 'links':
        return (
          <section key={section.id} className="mb-8 page-break">
            <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <strong>Listas de Presença:</strong>{' '}
                {links.attendance ? <a href={links.attendance} className="text-primary underline break-all">{links.attendance}</a> : '[Insira o link]'}
              </li>
              <li>
                <strong>Listas de Inscrição:</strong>{' '}
                {links.registration ? <a href={links.registration} className="text-primary underline break-all">{links.registration}</a> : '[Insira o link]'}
              </li>
              <li>
                <strong>Mídias (Fotos, Vídeos):</strong>{' '}
                {links.media ? <a href={links.media} className="text-primary underline break-all">{links.media}</a> : '[Insira o link]'}
              </li>
            </ul>
          </section>
        );

      case 'custom':
      default:
        return (
          <section key={section.id} className="mb-8 page-break">
            <h3 className="text-lg font-bold uppercase mb-4">{section.title}</h3>
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
          <p className="text-muted-foreground text-sm">Configure e preencha o relatório de prestação de contas.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant={mode === 'edit' ? 'default' : 'outline'} onClick={() => setMode('edit')}>
            <Edit className="w-4 h-4 mr-2" /> Editar
          </Button>
          <Button variant={mode === 'preview' ? 'default' : 'outline'} onClick={() => setMode('preview')}>
            <Eye className="w-4 h-4 mr-2" /> Visualizar
          </Button>
          {mode === 'preview' && (
            <>
              <Button onClick={() => window.print()} className="animate-scaleIn">
                <Printer className="w-4 h-4 mr-2" /> Imprimir
              </Button>
              <Button 
                onClick={exportToPdf} 
                disabled={isExporting}
                className="animate-scaleIn bg-primary"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isExporting ? 'Exportando...' : 'Exportar PDF'}
              </Button>
            </>
          )}
        </div>
      </div>

      {mode === 'edit' && (
        <div className="space-y-8 max-w-4xl mx-auto animate-slideUp pb-12">
          
          {/* Structure Configuration */}
          <Card className="border-l-4 border-l-sidebar">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6 border-b pb-4">
                <span className="bg-sidebar text-sidebar-primary w-8 h-8 rounded-full flex items-center justify-center font-bold">⚙</span>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Estrutura do Relatório</h3>
                  <p className="text-sm text-muted-foreground">Organize e renomeie as seções.</p>
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

          {/* Logos */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4 border-b pb-2">
                <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">C</span>
                <h3 className="text-lg font-semibold">Capa e Logos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    {logo ? <img src={logo} className="h-16 w-16 object-contain border rounded" /> : <div className="h-16 w-16 bg-muted rounded flex items-center justify-center text-xs">LOGO</div>}
                    <div className="flex-1">
                      <Label>Logo Principal (Esquerda)</Label>
                      <Input type="file" accept="image/*" onChange={e => handleLogoUpload(e, false)} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    {logoSecondary ? <img src={logoSecondary} className="h-16 w-16 object-contain border rounded" /> : <div className="h-16 w-16 bg-muted rounded flex items-center justify-center text-xs">LOGO</div>}
                    <div className="flex-1">
                      <Label>Logo Secundário (Direita)</Label>
                      <Input type="file" accept="image/*" onChange={e => handleLogoUpload(e, true)} />
                    </div>
                  </div>
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
          <div ref={reportRef} className="bg-card shadow-2xl p-8 md:p-12 max-w-[210mm] mx-auto min-h-[297mm] print:shadow-none print:w-full print:max-w-none print:p-0 font-serif text-foreground leading-relaxed animate-slideUp">
            
            {/* Cover Page */}
            <div className="flex flex-col items-center justify-center min-h-[800px] pb-10 mb-10 page-break">
              <ReportHeader />
              
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h2 className="text-xl font-bold uppercase mb-4">Relatório Parcial de Cumprimento do Objeto</h2>
                <h1 className="text-2xl font-bold uppercase mb-4">{project.name}</h1>
                <h3 className="text-lg mb-8">Termo de Fomento nº {project.fomentoNumber}</h3>
                <p className="text-lg font-semibold">{project.organizationName}</p>
              </div>

              <ReportFooter />
            </div>

            {/* Dynamic Sections */}
            <ReportHeader />
            {sections.map(section => renderPreviewSection(section))}

            {/* Signature */}
            <div className="mt-16 pt-10 flex flex-col items-center break-inside-avoid">
              <p className="mb-8">Rio de Janeiro, {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <div className="w-80 border-t border-foreground mb-2 mt-16"></div>
              <p className="font-bold uppercase">Assinatura do Responsável</p>
              <p className="text-sm">{project.organizationName}</p>
            </div>

            <ReportFooter />
          </div>
        </div>
      )}
    </div>
  );
};
