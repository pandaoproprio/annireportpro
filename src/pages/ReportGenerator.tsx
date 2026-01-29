import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/AppContext';
import { ActivityType, ReportSection, ExpenseItem } from '@/types';
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

  if (!project) return <div className="p-8 text-center text-muted-foreground">Projeto não encontrado.</div>;

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
              {project.goals.map((goal, idx) => (
                <div key={goal.id} className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-bold text-primary mb-2">META {idx + 1}: {goal.title}</h4>
                  <Label>Relato Narrativo</Label>
                  <Textarea 
                    rows={4} 
                    placeholder="Descreva as realizações..."
                    value={goalNarratives[goal.id] || ''}
                    onChange={e => setGoalNarratives({...goalNarratives, [goal.id]: e.target.value})}
                  />
                </div>
              ))}
            </div>
          )}

          {section.key === 'other' && (
            <Textarea rows={4} value={otherActionsNarrative} onChange={e => setOtherActionsNarrative(e.target.value)} placeholder="Ações extras, imprevistos..." />
          )}

          {section.key === 'communication' && (
            <Textarea rows={4} value={communicationNarrative} onChange={e => setCommunicationNarrative(e.target.value)} placeholder="Divulgação, links..." />
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
            {project.goals.map((goal, idx) => (
              <div key={goal.id} className="mb-8">
                <h4 className="font-bold text-primary mb-2">Meta {idx + 1}: {goal.title}</h4>
                <p className="text-sm text-muted-foreground mb-2">Público-alvo: {goal.targetAudience}</p>
                <p className="whitespace-pre-line text-justify">{goalNarratives[goal.id] || 'Narrativa não preenchida.'}</p>
                
                {getActivitiesByGoal(goal.id).length > 0 && (
                  <div className="mt-4 pl-4 border-l-2 border-brand-200">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Atividades vinculadas:</p>
                    <ul className="text-sm space-y-1">
                      {getActivitiesByGoal(goal.id).map(act => (
                        <li key={act.id}>
                          <strong>{new Date(act.date).toLocaleDateString('pt-BR')}</strong>: {act.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </section>
        );

      case 'other':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify">{otherActionsNarrative}</div>
          </section>
        );

      case 'communication':
        return (
          <section key={section.id} className="mb-10 page-break">
            <h3 className="text-lg font-bold uppercase border-b border-foreground mb-4">{section.title}</h3>
            <div className="whitespace-pre-line text-justify">{communicationNarrative}</div>
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
