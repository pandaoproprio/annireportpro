import React from 'react';
import { ReportSection, Activity, Goal, ExpenseItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Image as ImageIcon, Upload, FileText } from 'lucide-react';
import { AiTextToolbar } from '@/components/report/AiTextToolbar';
import { SectionDoc } from '@/hooks/useReportState';

interface Props {
  section: ReportSection;
  index: number;
  // Data
  objectText: string;
  setObjectText: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  goalNarratives: Record<string, string>;
  setGoalNarratives: (v: Record<string, string>) => void;
  goalPhotos: Record<string, string[]>;
  otherActionsNarrative: string;
  setOtherActionsNarrative: (v: string) => void;
  otherActionsPhotos: string[];
  setOtherActionsPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  communicationNarrative: string;
  setCommunicationNarrative: (v: string) => void;
  communicationPhotos: string[];
  setCommunicationPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  satisfaction: string;
  setSatisfaction: (v: string) => void;
  futureActions: string;
  setFutureActions: (v: string) => void;
  expenses: ExpenseItem[];
  links: { attendance: string; registration: string; media: string };
  setLinks: (v: { attendance: string; registration: string; media: string }) => void;
  linkFileNames: { attendance: string; registration: string; media: string };
  setLinkFileNames: React.Dispatch<React.SetStateAction<{ attendance: string; registration: string; media: string }>>;
  // Per-section uploads
  sectionPhotos: Record<string, string[]>;
  sectionDocs: Record<string, SectionDoc[]>;
  // Project data
  goals: Goal[];
  projectName: string;
  projectObject: string;
  activities: Activity[];
  // Actions
  updateSectionTitle: (index: number, title: string) => void;
  updateCustomContent: (index: number, content: string) => void;
  removeSection: (index: number) => void;
  addExpense: () => void;
  updateExpense: (id: string, field: keyof ExpenseItem, value: string) => void;
  removeExpense: (id: string) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string[]>>) => void;
  handleGoalPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, goalId: string) => void;
  removeGoalPhoto: (goalId: string, index: number) => void;
  handleExpenseImageUpload: (e: React.ChangeEvent<HTMLInputElement>, expenseId: string) => void;
  getActivitiesByGoal: (goalId: string) => Activity[];
  getCommunicationActivities: () => Activity[];
  getOtherActivities: () => Activity[];
  formatActivityDate: (date: string, endDate?: string) => string;
  handleDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>, linkField: 'attendance' | 'registration' | 'media') => void;
  handleSectionPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => void;
  removeSectionPhoto: (sectionKey: string, index: number) => void;
  handleSectionDocUpload: (e: React.ChangeEvent<HTMLInputElement>, sectionKey: string) => void;
  removeSectionDoc: (sectionKey: string, index: number) => void;
}

export const ReportEditSection: React.FC<Props> = (props) => {
  const { section, index } = props;
  if (!section.isVisible) return null;

  return (
    <Card className="mb-6 border-l-4 border-l-primary/30">
      <CardContent className="pt-6">
        <SectionHeader {...props} />
        <SectionContent {...props} />
        {/* Per-section uploads (except OBJETO) */}
        {section.key !== 'object' && section.key !== 'expenses' && section.key !== 'links' && (
          <SectionUploads {...props} />
        )}
      </CardContent>
    </Card>
  );
};

const SectionUploads: React.FC<Props> = ({ section, sectionPhotos, sectionDocs, handleSectionPhotoUpload, removeSectionPhoto, handleSectionDocUpload, removeSectionDoc }) => {
  const sectionKey = section.type === 'custom' ? section.id : section.key;
  const photos = sectionPhotos[sectionKey] || [];
  const docs = sectionDocs[sectionKey] || [];

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {/* Photos */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="w-4 h-4" /> Registro Fotográfico
        </Label>
        <Input type="file" accept="image/*" multiple onChange={e => handleSectionPhotoUpload(e, sectionKey)} className="text-sm" />
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {photos.map((photo, pIdx) => (
              <div key={pIdx} className="relative group">
                <img src={photo} alt={`Foto ${pIdx + 1}`} className="h-20 w-20 object-contain rounded border bg-muted" />
                <button type="button" onClick={() => removeSectionPhoto(sectionKey, pIdx)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Documents */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <Upload className="w-4 h-4" /> Documentos Comprobatórios
        </Label>
        <div className="flex items-center gap-2">
          <Label htmlFor={`upload-doc-${sectionKey}`} className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Enviar documento
          </Label>
          <input id={`upload-doc-${sectionKey}`} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" className="hidden" onChange={e => handleSectionDocUpload(e, sectionKey)} />
          <span className="text-xs text-muted-foreground">PDF, DOC, XLS, imagens (máx. 20MB)</span>
        </div>
        {docs.length > 0 && (
          <div className="space-y-1 mt-2">
            {docs.map((doc, dIdx) => (
              <div key={dIdx} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1">{doc.name}</a>
                <button onClick={() => removeSectionDoc(sectionKey, dIdx)} className="text-destructive/60 hover:text-destructive shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SectionHeader: React.FC<Props> = ({ section, index, updateSectionTitle, removeSection }) => (
  <div className="flex items-center gap-2 mb-4 border-b pb-2">
    <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
    {section.type === 'custom' ? (
      <Input value={section.title} onChange={(e) => updateSectionTitle(index, e.target.value)} className="font-semibold text-lg flex-1" placeholder="Título da Seção" />
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
);

const SectionContent: React.FC<Props> = (props) => {
  const { section } = props;

  switch (section.key) {
    case 'object': return <ObjectSection {...props} />;
    case 'summary': return <SummarySection {...props} />;
    case 'goals': return <GoalsSection {...props} />;
    case 'other': return <OtherSection {...props} />;
    case 'communication': return <CommunicationSection {...props} />;
    case 'satisfaction': return <SatisfactionSection {...props} />;
    case 'future': return <FutureSection {...props} />;
    case 'expenses': return <ExpensesSection {...props} />;
    case 'links': return <LinksSection {...props} />;
    case 'custom':
    default: return <CustomSection {...props} />;
  }
};

// OBJETO - NO uploads, NO AI
const ObjectSection: React.FC<Props> = ({ objectText, setObjectText }) => (
  <div className="space-y-2">
    <Label>Texto do Objeto</Label>
    <Textarea rows={4} value={objectText} onChange={e => setObjectText(e.target.value)} placeholder="Descrição do objeto do termo de fomento..." />
  </div>
);

const SummarySection: React.FC<Props> = ({ summary, setSummary, activities, projectName, projectObject }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Resumo / Visão Geral</Label>
      <AiTextToolbar text={summary} onResult={setSummary} sectionType="summary" activities={activities} projectName={projectName} projectObject={projectObject} />
    </div>
    <RichTextEditor value={summary} onChange={setSummary} placeholder="Descreva a visão geral das atividades realizadas, contexto, e principais realizações..." />
  </div>
);

const GoalsSection: React.FC<Props> = ({
  goals, goalNarratives, setGoalNarratives, goalPhotos, projectName, projectObject,
  handleGoalPhotoUpload, removeGoalPhoto, getActivitiesByGoal, formatActivityDate,
}) => (
  <div className="space-y-6">
    {goals.map((goal, idx) => {
      const goalActs = getActivitiesByGoal(goal.id);
      const photos = goalPhotos[goal.id] || [];
      return (
        <div key={goal.id} className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-bold text-primary mb-2">META {idx + 1}: {goal.title}</h4>
          <p className="text-sm text-muted-foreground mb-3">Público-alvo: {goal.targetAudience}</p>
          {goalActs.length > 0 && (
            <div className="mb-4 p-3 bg-success/5 border border-success/20 rounded">
              <p className="text-sm font-medium text-success mb-2">📋 {goalActs.length} atividade(s) do Diário de Bordo vinculadas</p>
              <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                {goalActs.map(act => (
                  <div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 80)}...</div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label>Relato Narrativo da Meta</Label>
            <AiTextToolbar
              text={goalNarratives[goal.id] || ''}
              onResult={(text) => setGoalNarratives({ ...goalNarratives, [goal.id]: text })}
              sectionType="goal" activities={goalActs} projectName={projectName} projectObject={projectObject}
              goalTitle={goal.title} goalAudience={goal.targetAudience}
            />
          </div>
          <RichTextEditor value={goalNarratives[goal.id] || ''} onChange={(text) => setGoalNarratives({ ...goalNarratives, [goal.id]: text })}
            placeholder="Descreva as realizações, metodologia, resultados alcançados..." />
          <Label className="flex items-center gap-2 mt-4"><ImageIcon className="w-4 h-4" /> Fotos da Meta</Label>
          <Input type="file" accept="image/*" multiple onChange={e => handleGoalPhotoUpload(e, goal.id)} className="mb-2" />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, pIdx) => (
                <div key={pIdx} className="relative group">
                  <img src={photo} alt="" className="h-20 w-20 object-contain rounded border bg-muted" />
                  <button type="button" onClick={() => removeGoalPhoto(goal.id, pIdx)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100">
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
);

const OtherSection: React.FC<Props> = ({
  otherActionsNarrative, setOtherActionsNarrative,
  projectName, projectObject, getOtherActivities, formatActivityDate,
}) => {
  const otherActs = getOtherActivities();
  return (
    <div className="space-y-4">
      {otherActs.length > 0 && (
        <div className="p-3 bg-muted/50 border rounded">
          <p className="text-sm font-medium mb-2">📋 Atividades relacionadas ({otherActs.length}):</p>
          <div className="max-h-32 overflow-y-auto text-xs space-y-1">
            {otherActs.map(act => (<div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 60)}...</div>))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label>Narrativa</Label>
        <AiTextToolbar text={otherActionsNarrative} onResult={setOtherActionsNarrative} sectionType="other" activities={otherActs} projectName={projectName} projectObject={projectObject} />
      </div>
      <RichTextEditor value={otherActionsNarrative} onChange={setOtherActionsNarrative} placeholder="Descreva outras informações, ações extras, imprevistos, acontecimentos relevantes..." />
    </div>
  );
};

const CommunicationSection: React.FC<Props> = ({
  communicationNarrative, setCommunicationNarrative,
  projectName, projectObject, getCommunicationActivities, formatActivityDate,
}) => {
  const commActs = getCommunicationActivities();
  return (
    <div className="space-y-4">
      {commActs.length > 0 && (
        <div className="p-3 bg-muted/50 border rounded">
          <p className="text-sm font-medium mb-2">📋 Atividades de divulgação ({commActs.length}):</p>
          <div className="max-h-32 overflow-y-auto text-xs space-y-1">
            {commActs.map(act => (<div key={act.id}><strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 60)}...</div>))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Label>Narrativa</Label>
        <AiTextToolbar text={communicationNarrative} onResult={setCommunicationNarrative} sectionType="communication" activities={commActs} projectName={projectName} projectObject={projectObject} />
      </div>
      <RichTextEditor value={communicationNarrative} onChange={setCommunicationNarrative} placeholder="Descreva as ações de divulgação, publicações, links de matérias..." />
    </div>
  );
};

const SatisfactionSection: React.FC<Props> = ({ satisfaction, setSatisfaction, projectName, projectObject }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Grau de Satisfação</Label>
      <AiTextToolbar text={satisfaction} onResult={setSatisfaction} sectionType="generic" projectName={projectName} projectObject={projectObject} hideGenerate />
    </div>
    <RichTextEditor value={satisfaction} onChange={setSatisfaction} placeholder="Descreva a visão do público sobre o projeto, feedbacks recebidos, resultados de pesquisas de satisfação..." />
  </div>
);

const FutureSection: React.FC<Props> = ({ futureActions, setFutureActions, projectName, projectObject }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Ações Futuras</Label>
      <AiTextToolbar text={futureActions} onResult={setFutureActions} sectionType="generic" projectName={projectName} projectObject={projectObject} hideGenerate />
    </div>
    <RichTextEditor value={futureActions} onChange={setFutureActions} placeholder="Descreva as ações futuras do projeto, próximos passos, planejamento..." />
  </div>
);

const ExpensesSection: React.FC<Props> = ({ expenses, addExpense, updateExpense, removeExpense, handleExpenseImageUpload }) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground mb-4">Insira fotos e descreva sobre o uso e aplicação de cada item de despesa previsto no plano de trabalho.</p>
    {expenses.map((item) => (
      <div key={item.id} className="p-4 border rounded bg-card relative shadow-sm">
        <button onClick={() => removeExpense(item.id)} className="absolute top-2 right-2 text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
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
            {item.image && <img src={item.image} alt="" className="h-16 w-16 object-contain rounded border bg-muted mt-1" />}
          </div>
        </div>
      </div>
    ))}
    <Button variant="outline" onClick={addExpense} className="w-full border-dashed"><Plus className="w-4 h-4 mr-2" /> Adicionar Item de Despesa</Button>
  </div>
);

const LinksSection = React.forwardRef<HTMLDivElement, Props>(({ links, setLinks, linkFileNames, setLinkFileNames, handleDocumentUpload }, ref) => {
  const clearLink = (field: 'attendance' | 'registration' | 'media') => {
    setLinks({ ...links, [field]: '' });
    setLinkFileNames(prev => ({ ...prev, [field]: '' }));
  };

  const renderLinkField = (label: string, field: 'attendance' | 'registration' | 'media', accept: string) => {
    const url = links[field];
    const fileName = linkFileNames[field];
    const hasFile = !!url;

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {hasFile ? (
          <div className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/50">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1" title={url}>
              {fileName || 'Documento enviado'}
            </a>
            <button onClick={() => clearLink(field)} className="text-destructive/60 hover:text-destructive shrink-0" title="Remover">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Input placeholder="https://..." value={url} onChange={e => setLinks({ ...links, [field]: e.target.value })} />
        )}
        {!hasFile && (
          <div className="flex items-center gap-2">
            <Label htmlFor={`upload-${field}`} className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Enviar documento
            </Label>
            <input id={`upload-${field}`} type="file" accept={accept} className="hidden" onChange={e => handleDocumentUpload(e, field)} />
            <span className="text-xs text-muted-foreground">PDF, DOC, XLS, imagens...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={ref} className="space-y-4">
      <p className="text-sm text-muted-foreground mb-4">Envie os documentos de comprovação ou insira os links manualmente. Ao enviar um arquivo, o link será gerado automaticamente.</p>
      <div className="grid grid-cols-1 gap-4">
        {renderLinkField('Listas de Presença', 'attendance', '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png')}
        {renderLinkField('Listas de Inscrição', 'registration', '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png')}
        {renderLinkField('Mídias (Fotos, Vídeos)', 'media', '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.zip')}
      </div>
    </div>
  );
});
LinksSection.displayName = 'LinksSection';

const CustomSection: React.FC<Props> = ({ section, index, updateCustomContent, projectName, projectObject }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Conteúdo</Label>
      <AiTextToolbar text={section.content || ''} onResult={(text) => updateCustomContent(index, text)} sectionType="generic" projectName={projectName} projectObject={projectObject} hideGenerate />
    </div>
    <Textarea rows={5} value={section.content || ''} onChange={e => updateCustomContent(index, e.target.value)} placeholder="Escreva o conteúdo desta seção..." />
  </div>
);
