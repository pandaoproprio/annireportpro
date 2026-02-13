import React from 'react';
import { ReportSection, Activity, Goal, ExpenseItem } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { AiNarrativeButton } from '@/components/report/AiNarrativeButton';

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
}

export const ReportEditSection: React.FC<Props> = (props) => {
  const { section, index } = props;
  if (!section.isVisible) return null;

  return (
    <Card className="mb-6 border-l-4 border-l-primary/30">
      <CardContent className="pt-6">
        <SectionHeader {...props} />
        <SectionContent {...props} />
      </CardContent>
    </Card>
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

const ObjectSection: React.FC<Props> = ({ objectText, setObjectText }) => (
  <div className="space-y-2">
    <Label>Texto do Objeto</Label>
    <Textarea rows={4} value={objectText} onChange={e => setObjectText(e.target.value)} placeholder="Descrição do objeto do termo de fomento..." />
  </div>
);

const SummarySection: React.FC<Props> = ({ summary, setSummary, activities, projectName, projectObject }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label>Resumo / Visão Geral</Label>
      <AiNarrativeButton sectionType="summary" activities={activities} projectName={projectName} projectObject={projectObject} onGenerated={setSummary} />
    </div>
    <Textarea rows={8} value={summary} onChange={e => setSummary(e.target.value)} placeholder="Descreva a visão geral das atividades realizadas, contexto, e principais realizações..." />
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
            <AiNarrativeButton
              sectionType="goal" activities={goalActs} projectName={projectName} projectObject={projectObject}
              goalTitle={goal.title} goalAudience={goal.targetAudience}
              onGenerated={(text) => setGoalNarratives({ ...goalNarratives, [goal.id]: text })}
            />
          </div>
          <Textarea rows={5} placeholder="Descreva as realizações, metodologia, resultados alcançados..."
            value={goalNarratives[goal.id] || ''} onChange={e => setGoalNarratives({ ...goalNarratives, [goal.id]: e.target.value })} className="mb-3" />
          <Label className="flex items-center gap-2 mt-4"><ImageIcon className="w-4 h-4" /> Fotos da Meta</Label>
          <Input type="file" accept="image/*" multiple onChange={e => handleGoalPhotoUpload(e, goal.id)} className="mb-2" />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, pIdx) => (
                <div key={pIdx} className="relative group">
                  <img src={photo} alt="" className="h-20 w-20 object-cover rounded border" />
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

const PhotoList: React.FC<{ photos: string[]; setter: React.Dispatch<React.SetStateAction<string[]>> }> = ({ photos, setter }) => (
  photos.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {photos.map((p, i) => (
        <div key={i} className="relative group">
          <img src={p} alt="" className="h-16 w-16 object-cover rounded border" />
          <button onClick={() => setter(prev => prev.filter((_, idx) => idx !== i))}
            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  ) : null
);

const OtherSection: React.FC<Props> = ({
  otherActionsNarrative, setOtherActionsNarrative, otherActionsPhotos, setOtherActionsPhotos,
  projectName, projectObject, handlePhotoUpload, getOtherActivities, formatActivityDate,
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
        <AiNarrativeButton sectionType="other" activities={otherActs} projectName={projectName} projectObject={projectObject} onGenerated={setOtherActionsNarrative} />
      </div>
      <Textarea rows={5} value={otherActionsNarrative} onChange={e => setOtherActionsNarrative(e.target.value)} placeholder="Descreva outras informações, ações extras, imprevistos, acontecimentos relevantes..." />
      <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotos</Label>
      <Input type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(e, setOtherActionsPhotos)} />
      <PhotoList photos={otherActionsPhotos} setter={setOtherActionsPhotos} />
    </div>
  );
};

const CommunicationSection: React.FC<Props> = ({
  communicationNarrative, setCommunicationNarrative, communicationPhotos, setCommunicationPhotos,
  projectName, projectObject, handlePhotoUpload, getCommunicationActivities, formatActivityDate,
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
        <AiNarrativeButton sectionType="communication" activities={commActs} projectName={projectName} projectObject={projectObject} onGenerated={setCommunicationNarrative} />
      </div>
      <Textarea rows={5} value={communicationNarrative} onChange={e => setCommunicationNarrative(e.target.value)} placeholder="Descreva as ações de divulgação, publicações, links de matérias..." />
      <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Fotos e Artes de Divulgação</Label>
      <Input type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(e, setCommunicationPhotos)} />
      <PhotoList photos={communicationPhotos} setter={setCommunicationPhotos} />
    </div>
  );
};

const SatisfactionSection: React.FC<Props> = ({ satisfaction, setSatisfaction }) => (
  <Textarea rows={5} value={satisfaction} onChange={e => setSatisfaction(e.target.value)} placeholder="Descreva a visão do público sobre o projeto, feedbacks recebidos, resultados de pesquisas de satisfação..." />
);

const FutureSection: React.FC<Props> = ({ futureActions, setFutureActions }) => (
  <Textarea rows={4} value={futureActions} onChange={e => setFutureActions(e.target.value)} placeholder="Descreva as ações futuras do projeto, próximos passos, planejamento..." />
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
            {item.image && <img src={item.image} alt="" className="h-16 w-16 object-cover rounded border mt-1" />}
          </div>
        </div>
      </div>
    ))}
    <Button variant="outline" onClick={addExpense} className="w-full border-dashed"><Plus className="w-4 h-4 mr-2" /> Adicionar Item de Despesa</Button>
  </div>
);

const LinksSection: React.FC<Props> = ({ links, setLinks }) => (
  <div className="space-y-4">
    <p className="text-sm text-muted-foreground mb-4">Insira os links para os documentos de comprovação.</p>
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label>Link das Listas de Presença</Label>
        <Input placeholder="https://..." value={links.attendance} onChange={e => setLinks({ ...links, attendance: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Link das Listas de Inscrição</Label>
        <Input placeholder="https://..." value={links.registration} onChange={e => setLinks({ ...links, registration: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Link das Mídias (Fotos, Vídeos)</Label>
        <Input placeholder="https://..." value={links.media} onChange={e => setLinks({ ...links, media: e.target.value })} />
      </div>
    </div>
  </div>
);

const CustomSection: React.FC<Props> = ({ section, index, updateCustomContent }) => (
  <div className="space-y-2">
    <Label>Conteúdo</Label>
    <Textarea rows={5} value={section.content || ''} onChange={e => updateCustomContent(index, e.target.value)} placeholder="Escreva o conteúdo desta seção..." />
  </div>
);
