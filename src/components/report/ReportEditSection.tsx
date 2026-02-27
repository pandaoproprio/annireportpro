import React, { useState, useRef, useEffect } from 'react';
import { ReportSection, Activity, Goal, ExpenseItem, ReportPhotoMeta, PhotoSize, PhotoLayout, PhotoGroup } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageLayout } from '@/types/imageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, Plus, Image as ImageIcon, Upload, FileText, Pencil, Grid2x2, Grid3x3, LayoutList, GalleryHorizontal, LayoutGrid, FolderPlus, FolderMinus, Check, ClipboardPaste, BookImage, Video, ExternalLink } from 'lucide-react';
import { ActivityCountBadge } from '@/components/report/ActivityCountBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { ImageLayoutEditor } from '@/components/report/ImageLayoutEditor';
import { AiTextToolbar } from '@/components/report/AiTextToolbar';
import { ImageEditorDialog } from '@/components/report/ImageEditorDialog';
import { DiaryImagePickerDialog } from '@/components/report/DiaryImagePickerDialog';
import { SectionDoc } from '@/hooks/useReportState';
import { toast } from 'sonner';
import { ActivitiesByMonthInline, ActivityTypesInline, AttendeesByGoalInline, GoalProgressInline } from '@/components/report/ReportCharts';

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
  // Photo metadata
  photoMetadata: Record<string, ReportPhotoMeta[]>;
  updatePhotoCaption: (key: string, index: number, caption: string) => void;
  updatePhotoSize: (key: string, index: number, size: PhotoSize, widthPercent?: number) => void;
  replacePhotoUrl: (key: string, index: number, newUrl: string, setter: React.Dispatch<React.SetStateAction<string[]>> | null, goalId?: string) => void;
  pageLayouts: Record<string, PageLayout>;
  setPageLayouts: React.Dispatch<React.SetStateAction<Record<string, PageLayout>>>;
  sectionPhotoGroups: Record<string, PhotoGroup[]>;
  setSectionPhotoGroups: React.Dispatch<React.SetStateAction<Record<string, PhotoGroup[]>>>;
  selectedVideoUrls: string[];
  setSelectedVideoUrls: React.Dispatch<React.SetStateAction<string[]>>;
  // Project data
  goals: Goal[];
  projectName: string;
  projectObject: string;
  projectId: string;
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
  insertDiaryPhotos: (sectionKey: string, urls: string[], captions: Record<string, string>) => void;
}

// ── Photo card with caption, width slider, and edit button ──
const PhotoCard: React.FC<{
  photo: string;
  index: number;
  metaKey: string;
  meta?: ReportPhotoMeta;
  projectId: string;
  updatePhotoCaption: Props['updatePhotoCaption'];
  updatePhotoSize: Props['updatePhotoSize'];
  onReplace: (newUrl: string) => void;
  onRemove: () => void;
}> = ({ photo, index, metaKey, meta, projectId, updatePhotoCaption, updatePhotoSize, onReplace, onRemove }) => {
  const [editOpen, setEditOpen] = useState(false);
  const caption = meta?.caption || '';
  const widthPercent = meta?.widthPercent || 100;

  return (
    <div className="border rounded-lg p-2 bg-card space-y-2">
      <div className="relative group">
        <img src={photo} alt={caption || `Foto ${index + 1}`} className="w-full h-40 object-contain rounded bg-muted" />
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={() => setEditOpen(true)}
            className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-md" title="Editar imagem">
            <Pencil className="w-3 h-3" />
          </button>
          <button type="button" onClick={onRemove}
            className="bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-md" title="Remover">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <Input
        value={caption}
        onChange={e => updatePhotoCaption(metaKey, index, e.target.value)}
        placeholder={`Legenda da foto ${index + 1}...`}
        className="text-xs h-8"
      />
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Largura: {widthPercent}%</Label>
        <Slider
          value={[widthPercent]}
          onValueChange={([v]) => updatePhotoSize(metaKey, index, 'medium', v)}
          min={20}
          max={100}
          step={5}
          className="h-4"
        />
      </div>
      <ImageEditorDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        imageUrl={photo}
        projectId={projectId}
        onSave={onReplace}
      />
    </div>
  );
};

export const ReportEditSection: React.FC<Props> = (props) => {
  const { section, index } = props;
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  if (!section.isVisible) return null;

  const extProps = { ...props, activitiesExpanded, setActivitiesExpanded };

  return (
    <Card className="mb-6 border-l-4 border-l-primary/30">
      <CardContent className="pt-6">
        <SectionHeader {...extProps} />
        <SectionContent {...extProps} />
        {section.key !== 'object' && section.key !== 'expenses' && section.key !== 'links' && (
          <SectionUploads {...props} />
        )}
      </CardContent>
    </Card>
  );
};

const SectionUploads: React.FC<Props> = ({ section, sectionPhotos, sectionDocs, photoMetadata, updatePhotoCaption, updatePhotoSize, replacePhotoUrl, projectId, handleSectionPhotoUpload, removeSectionPhoto, handleSectionDocUpload, removeSectionDoc, pageLayouts, setPageLayouts, sectionPhotoGroups, setSectionPhotoGroups, activities, insertDiaryPhotos }) => {
  const sectionKey = section.type === 'custom' ? section.id : section.key;
  const photos = sectionPhotos[sectionKey] || [];
  const docs = sectionDocs[sectionKey] || [];
  const metas = photoMetadata[sectionKey] || [];
  const groups = sectionPhotoGroups[sectionKey] || [];
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [diaryPickerOpen, setDiaryPickerOpen] = useState(false);

  const handleDiaryInsert = (diaryPhotos: { url: string; caption: string; activityDate: string }[]) => {
    const newUrls = diaryPhotos.map(p => p.url).filter(url => !photos.includes(url));
    if (newUrls.length === 0) {
      toast.info('As imagens selecionadas já estão nesta seção');
      return;
    }
    const captions: Record<string, string> = {};
    diaryPhotos.forEach(p => { if (p.caption) captions[p.url] = p.caption; });
    insertDiaryPhotos(sectionKey, newUrls, captions);
  };

  const toggleSelect = (idx: number) => {
    setSelectedIndices(prev => { const s = new Set(prev); if (s.has(idx)) s.delete(idx); else s.add(idx); return s; });
  };

  const createGroup = () => {
    if (selectedIndices.size < 2) return;
    const indices = Array.from(selectedIndices);
    const cleaned = groups.map(g => ({
      ...g, photoIds: g.photoIds.filter(id => !indices.map(String).includes(id)),
    })).filter(g => g.photoIds.length > 0);
    setSectionPhotoGroups(prev => ({
      ...prev,
      [sectionKey]: [...cleaned, { id: crypto.randomUUID(), caption: 'Registro fotográfico das atividades realizadas', photoIds: indices.map(String) }],
    }));
    setSelectedIndices(new Set());
  };

  const removeGroup = (groupId: string) => {
    setSectionPhotoGroups(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter(g => g.id !== groupId),
    }));
  };

  const updateGroupCaption = (groupId: string, caption: string) => {
    setSectionPhotoGroups(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).map(g => g.id === groupId ? { ...g, caption } : g),
    }));
  };

  const getPhotoGroupId = (idx: number) => groups.find(g => g.photoIds.includes(String(idx)))?.id || null;

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="w-4 h-4" /> Registro Fotográfico
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="file" accept="image/*" multiple onChange={e => handleSectionPhotoUpload(e, sectionKey)} className="text-sm flex-1 min-w-[200px]" />
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setDiaryPickerOpen(true)}>
            <BookImage className="w-4 h-4" />
            Inserir imagem do Diário
          </Button>
        </div>
        <DiaryImagePickerDialog
          open={diaryPickerOpen}
          onOpenChange={setDiaryPickerOpen}
          activities={activities}
          onInsert={handleDiaryInsert}
        />

        {/* Grouping controls */}
        {photos.length >= 2 && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={createGroup} disabled={selectedIndices.size < 2}>
              <FolderPlus className="w-4 h-4 mr-1" /> Agrupar selecionadas ({selectedIndices.size})
            </Button>
            {selectedIndices.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIndices(new Set())}>Limpar seleção</Button>
            )}
          </div>
        )}

        {/* Existing groups */}
        {groups.map(group => {
          const groupPhotos = group.photoIds.map(id => photos[Number(id)]).filter(Boolean);
          if (groupPhotos.length === 0) return null;
          return (
            <div key={group.id} className="p-3 border-2 border-primary/30 rounded-lg bg-primary/5 space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary uppercase">Grupo ({groupPhotos.length} fotos)</span>
                <Button variant="ghost" size="sm" onClick={() => removeGroup(group.id)}>
                  <FolderMinus className="w-4 h-4 mr-1" /> Desagrupar
                </Button>
              </div>
              <Input value={group.caption} onChange={e => updateGroupCaption(group.id, e.target.value)} placeholder="Legenda do grupo..." className="text-sm" />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {groupPhotos.map((photo, i) => (
                  <div key={i} className="relative aspect-square bg-muted rounded overflow-hidden">
                    <img src={photo} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {photos.length > 0 && (
          <>
            <Button variant="outline" size="sm" className="mt-1" onClick={() => setShowLayoutEditor(true)}>
              <LayoutGrid className="w-4 h-4 mr-2" /> Editor de Layout
            </Button>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
              {photos.map((photo, pIdx) => {
                const inGroup = getPhotoGroupId(pIdx);
                return (
                  <div key={pIdx} className="relative">
                    {!inGroup && photos.length >= 2 && (
                      <div className="absolute top-2 right-8 z-10">
                        <Checkbox
                          checked={selectedIndices.has(pIdx)}
                          onCheckedChange={() => toggleSelect(pIdx)}
                          className="bg-background/80 border-2"
                        />
                      </div>
                    )}
                    {inGroup && (
                      <div className="absolute inset-0 bg-primary/10 rounded-lg z-10 pointer-events-none flex items-center justify-center">
                        <span className="text-xs font-medium text-primary bg-background/90 px-2 py-1 rounded">Em grupo</span>
                      </div>
                    )}
                    <PhotoCard
                      photo={photo}
                      index={pIdx}
                      metaKey={sectionKey}
                      meta={metas[pIdx]}
                      projectId={projectId}
                      updatePhotoCaption={updatePhotoCaption}
                      updatePhotoSize={updatePhotoSize}
                      onReplace={(newUrl) => replacePhotoUrl(sectionKey, pIdx, newUrl, null)}
                      onRemove={() => removeSectionPhoto(sectionKey, pIdx)}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
        {showLayoutEditor && (
          <ImageLayoutEditor
            photos={photos}
            layout={pageLayouts[sectionKey] || null}
            onLayoutChange={(layout) => setPageLayouts(prev => ({ ...prev, [sectionKey]: layout }))}
            onClose={() => setShowLayoutEditor(false)}
          />
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

const getActivityCountForSection = (
  sectionKey: string,
  activities: Activity[],
  goals: Goal[],
  getActivitiesByGoal: (goalId: string) => Activity[],
  getCommunicationActivities: () => Activity[],
  getOtherActivities: () => Activity[],
): number | undefined => {
  switch (sectionKey) {
    case 'summary': return activities.length;
    case 'goals': return goals.reduce((sum, g) => sum + getActivitiesByGoal(g.id).length, 0);
    case 'other': return getOtherActivities().length;
    case 'communication': return getCommunicationActivities().length;
    default: return undefined; // object, satisfaction, future, expenses, links, custom
  }
};

type ExtProps = Props & { activitiesExpanded: boolean; setActivitiesExpanded: (v: boolean) => void };

const SectionHeader: React.FC<ExtProps> = ({ section, index, updateSectionTitle, removeSection, activities, goals, getActivitiesByGoal, getCommunicationActivities, getOtherActivities, activitiesExpanded, setActivitiesExpanded }) => {
  const activityCount = getActivityCountForSection(section.key, activities, goals, getActivitiesByGoal, getCommunicationActivities, getOtherActivities);

  return (
    <div className="flex items-center gap-2 mb-4 border-b pb-2">
      <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
      {section.type === 'custom' ? (
        <Input value={section.title} onChange={(e) => updateSectionTitle(index, e.target.value)} className="font-semibold text-lg flex-1" placeholder="Título da Seção" />
      ) : (
        <h3 className="text-lg font-semibold flex-1">{section.title}</h3>
      )}
      <div className="flex items-center gap-2">
        {activityCount !== undefined && (
          <ActivityCountBadge
            count={activityCount}
            onClick={activityCount > 0 ? () => setActivitiesExpanded(!activitiesExpanded) : undefined}
          />
        )}
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
};

const SectionContent: React.FC<ExtProps> = (props) => {
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

/** Reusable collapsible activities panel with insert-on-approval */
const ActivitiesPanel: React.FC<{
  activities: Activity[];
  expanded: boolean;
  formatActivityDate: (d: string, e?: string) => string;
  label: string;
  onInsert?: (text: string) => void;
}> = ({ activities, expanded, formatActivityDate, label, onInsert }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (expanded && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded]);

  if (activities.length === 0) return null;

  const toggle = (id: string) => {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  };

  const selectAll = () => {
    if (selected.size === activities.length) setSelected(new Set());
    else setSelected(new Set(activities.map(a => a.id)));
  };

  const handleInsert = () => {
    if (!onInsert || selected.size === 0) return;
    const selectedActs = activities.filter(a => selected.has(a.id));
    const text = selectedActs.map(act => {
      const date = formatActivityDate(act.date, act.endDate || undefined);
      return `<p><strong>${date}</strong> — ${act.description}</p>` +
        (act.results ? `<p>Resultados: ${act.results}</p>` : '') +
        (act.attendeesCount ? `<p>Participantes: ${act.attendeesCount}</p>` : '');
    }).join('\n');
    onInsert(text);
    setSelected(new Set());
    toast.success(`${selectedActs.length} atividade(s) inserida(s) no texto`);
  };

  return (
    <Collapsible open={expanded}>
      <CollapsibleContent>
        <div ref={panelRef} className="mb-4 p-3 bg-success/5 border border-success/20 rounded animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-success">📋 {activities.length} {label}</p>
            {onInsert && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  {selected.size === activities.length ? 'Desmarcar' : 'Selecionar'} tudo
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={selected.size === 0}
                  onClick={handleInsert}
                >
                  <ClipboardPaste className="w-3 h-3" />
                  Inserir {selected.size > 0 ? `(${selected.size})` : ''}
                </Button>
              </div>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto text-xs space-y-1">
            {activities.map(act => (
              <div
                key={act.id}
                className={`flex items-start gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                  selected.has(act.id) ? 'bg-success/10 border border-success/30' : 'hover:bg-muted/50'
                }`}
                onClick={() => toggle(act.id)}
              >
                <Checkbox
                  checked={selected.has(act.id)}
                  onCheckedChange={() => toggle(act.id)}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <strong>{formatActivityDate(act.date)}</strong>: {act.description.substring(0, 100)}{act.description.length > 100 ? '...' : ''}
                  {act.attendeesCount > 0 && <span className="text-muted-foreground ml-1">({act.attendeesCount} participantes)</span>}
                </div>
                {selected.has(act.id) && <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />}
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const SummarySection: React.FC<ExtProps> = ({ summary, setSummary, activities, projectName, projectObject, activitiesExpanded, formatActivityDate }) => (
  <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <ActivitiesByMonthInline activities={activities} />
      <ActivityTypesInline activities={activities} />
    </div>
    <ActivitiesPanel
      activities={activities}
      expanded={activitiesExpanded}
      formatActivityDate={formatActivityDate}
      label="atividade(s) registradas no Diário de Bordo"
      onInsert={(text) => setSummary(summary ? summary + '\n' + text : text)}
    />
    <div className="flex items-center justify-between">
      <Label>Resumo / Visão Geral</Label>
      <AiTextToolbar text={summary} onResult={setSummary} sectionType="summary" activities={activities} projectName={projectName} projectObject={projectObject} />
    </div>
    <RichTextEditor value={summary} onChange={setSummary} enableImages placeholder="Descreva a visão geral das atividades realizadas, contexto, e principais realizações..." />
  </div>
);

const GoalsSection: React.FC<ExtProps> = ({
  goals, goalNarratives, setGoalNarratives, goalPhotos, projectName, projectObject, projectId,
  handleGoalPhotoUpload, removeGoalPhoto, getActivitiesByGoal, formatActivityDate,
  photoMetadata, updatePhotoCaption, updatePhotoSize, replacePhotoUrl,
  activitiesExpanded, activities,
}) => (
  <div className="space-y-6">
    <div className="flex flex-wrap gap-2">
      <AttendeesByGoalInline activities={activities} goals={goals} getActivitiesByGoal={getActivitiesByGoal} />
      <GoalProgressInline goals={goals} getActivitiesByGoal={getActivitiesByGoal} />
    </div>
    {goals.map((goal, idx) => {
      const goalActs = getActivitiesByGoal(goal.id);
      const photos = goalPhotos[goal.id] || [];
      const metas = photoMetadata[goal.id] || [];
      return (
        <div key={goal.id} className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold text-primary">META {idx + 1}: {goal.title}</h4>
            {goalActs.length > 0 && <ActivityCountBadge count={goalActs.length} label={`atividade(s) vinculadas à meta "${goal.title}"`} />}
          </div>
          <p className="text-sm text-muted-foreground mb-3">Público-alvo: {goal.targetAudience}</p>
          <ActivitiesPanel
            activities={goalActs}
            expanded={activitiesExpanded}
            formatActivityDate={formatActivityDate}
            label="atividade(s) do Diário de Bordo vinculadas"
            onInsert={(text) => setGoalNarratives({ ...goalNarratives, [goal.id]: (goalNarratives[goal.id] || '') + '\n' + text })}
          />
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
            enableImages placeholder="Descreva as realizações, metodologia, resultados alcançados..." />
          <Label className="flex items-center gap-2 mt-4"><ImageIcon className="w-4 h-4" /> Fotos da Meta</Label>
          <Input type="file" accept="image/*" multiple onChange={e => handleGoalPhotoUpload(e, goal.id)} className="mb-2" />
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo, pIdx) => (
                <PhotoCard
                  key={pIdx}
                  photo={photo}
                  index={pIdx}
                  metaKey={goal.id}
                  meta={metas[pIdx]}
                  projectId={projectId}
                  updatePhotoCaption={updatePhotoCaption}
                  updatePhotoSize={updatePhotoSize}
                  onReplace={(newUrl) => replacePhotoUrl(goal.id, pIdx, newUrl, null, goal.id)}
                  onRemove={() => removeGoalPhoto(goal.id, pIdx)}
                />
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
);

const OtherSection: React.FC<ExtProps> = ({
  otherActionsNarrative, setOtherActionsNarrative,
  projectName, projectObject, getOtherActivities, formatActivityDate,
  activitiesExpanded,
}) => {
  const otherActs = getOtherActivities();
  return (
    <div className="space-y-4">
      <ActivitiesPanel
        activities={otherActs}
        expanded={activitiesExpanded}
        formatActivityDate={formatActivityDate}
        label="atividade(s) relacionadas"
        onInsert={(text) => setOtherActionsNarrative(otherActionsNarrative ? otherActionsNarrative + '\n' + text : text)}
      />
      <div className="flex items-center justify-between">
        <Label>Narrativa</Label>
        <AiTextToolbar text={otherActionsNarrative} onResult={setOtherActionsNarrative} sectionType="other" activities={otherActs} projectName={projectName} projectObject={projectObject} />
      </div>
      <RichTextEditor value={otherActionsNarrative} onChange={setOtherActionsNarrative} enableImages placeholder="Descreva outras informações, ações extras, imprevistos, acontecimentos relevantes..." />
    </div>
  );
};

const CommunicationSection: React.FC<ExtProps> = ({
  communicationNarrative, setCommunicationNarrative,
  projectName, projectObject, getCommunicationActivities, formatActivityDate,
  activitiesExpanded,
}) => {
  const commActs = getCommunicationActivities();
  return (
    <div className="space-y-4">
      <ActivitiesPanel
        activities={commActs}
        expanded={activitiesExpanded}
        formatActivityDate={formatActivityDate}
        label="atividade(s) de divulgação"
        onInsert={(text) => setCommunicationNarrative(communicationNarrative ? communicationNarrative + '\n' + text : text)}
      />
      <div className="flex items-center justify-between">
        <Label>Narrativa</Label>
        <AiTextToolbar text={communicationNarrative} onResult={setCommunicationNarrative} sectionType="communication" activities={commActs} projectName={projectName} projectObject={projectObject} />
      </div>
      <RichTextEditor value={communicationNarrative} onChange={setCommunicationNarrative} enableImages placeholder="Descreva as ações de divulgação, publicações, links de matérias..." />
    </div>
  );
};

const SatisfactionSection: React.FC<Props> = ({ satisfaction, setSatisfaction, projectName, projectObject }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Grau de Satisfação</Label>
      <AiTextToolbar text={satisfaction} onResult={setSatisfaction} sectionType="generic" projectName={projectName} projectObject={projectObject} hideGenerate />
    </div>
    <RichTextEditor value={satisfaction} onChange={setSatisfaction} enableImages placeholder="Descreva a visão do público sobre o projeto, feedbacks recebidos, resultados de pesquisas de satisfação..." />
  </div>
);

const FutureSection: React.FC<Props> = ({ futureActions, setFutureActions, projectName, projectObject }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Ações Futuras</Label>
      <AiTextToolbar text={futureActions} onResult={setFutureActions} sectionType="generic" projectName={projectName} projectObject={projectObject} hideGenerate />
    </div>
    <RichTextEditor value={futureActions} onChange={setFutureActions} enableImages placeholder="Descreva as ações futuras do projeto, próximos passos, planejamento..." />
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

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'flv', 'wmv', 'm4v'];

const isVideoUrl = (url: string) => {
  try {
    const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
    return VIDEO_EXTENSIONS.includes(ext);
  } catch { return false; }
};

const extractFileName = (url: string) => {
  try {
    const parts = new URL(url).pathname.split('/');
    return parts[parts.length - 1] || 'video';
  } catch { return 'video'; }
};

const LinksSection = React.forwardRef<HTMLDivElement, Props>(({ links, setLinks, linkFileNames, setLinkFileNames, handleDocumentUpload, activities, selectedVideoUrls, setSelectedVideoUrls }, ref) => {
  const [showVideoPicker, setShowVideoPicker] = React.useState(false);

  // Auto-derive video entries from diary activities
  const diaryVideos = React.useMemo(() => {
    const videos: { url: string; activityDate: string; activityDescription: string }[] = [];
    activities.forEach(a => {
      (a.photos || []).forEach(url => {
        if (isVideoUrl(url)) {
          videos.push({ url, activityDate: a.date, activityDescription: a.description?.substring(0, 80) || '' });
        }
      });
    });
    return videos;
  }, [activities]);

  // Sync selected videos into links.media
  React.useEffect(() => {
    if (selectedVideoUrls.length > 0) {
      setLinks({ ...links, media: selectedVideoUrls.join('\n') });
      setLinkFileNames(prev => ({ ...prev, media: `${selectedVideoUrls.length} vídeo(s) do Diário` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVideoUrls]);

  const toggleVideo = (url: string) => {
    setSelectedVideoUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const clearLink = (field: 'attendance' | 'registration' | 'media') => {
    setLinks({ ...links, [field]: '' });
    setLinkFileNames(prev => ({ ...prev, [field]: '' }));
    if (field === 'media') setSelectedVideoUrls([]);
  };

  const renderLinkField = (label: string, field: 'attendance' | 'registration' | 'media', accept: string) => {
    const url = links[field];
    const fileName = linkFileNames[field];
    const hasFile = !!url;

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {hasFile ? (
          <div className="space-y-1">
            {/* If multiple URLs (videos), show each */}
            {field === 'media' && selectedVideoUrls.length > 0 ? (
              selectedVideoUrls.map((vUrl, vi) => (
                <div key={vi} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Video className="w-4 h-4 text-primary shrink-0" />
                  <a href={vUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1" title={vUrl}>
                    {extractFileName(vUrl)}
                  </a>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 p-2.5 border rounded-md bg-muted/50">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate flex-1" title={url}>
                  {fileName || 'Documento enviado'}
                </a>
              </div>
            )}
            <button onClick={() => clearLink(field)} className="text-xs text-destructive/60 hover:text-destructive flex items-center gap-1 mt-1">
              <Trash2 className="w-3 h-3" /> Limpar
            </button>
          </div>
        ) : (
          <Input placeholder="https://..." value={url} onChange={e => setLinks({ ...links, [field]: e.target.value })} />
        )}
        {!hasFile && (
          <div className="flex items-center gap-2 flex-wrap">
            <Label htmlFor={`upload-${field}`} className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Enviar documento
            </Label>
            <input id={`upload-${field}`} type="file" accept={accept} className="hidden" onChange={e => handleDocumentUpload(e, field)} />
            {field === 'media' && diaryVideos.length > 0 && (
              <button
                type="button"
                onClick={() => setShowVideoPicker(!showVideoPicker)}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 border border-dashed border-primary/30 rounded-md px-3 py-1.5 hover:bg-primary/5 transition-colors"
              >
                <Video className="w-3.5 h-3.5" />
                Inserir vídeo do Diário ({diaryVideos.length})
              </button>
            )}
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

      {/* Video picker (toggled from the media field button) */}
      {showVideoPicker && diaryVideos.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Selecionar vídeos do Diário</h4>
            </div>
            <button onClick={() => setShowVideoPicker(false)} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
          </div>
          <p className="text-xs text-muted-foreground">Marque os vídeos para inserir os links automaticamente no campo Mídias.</p>
          <div className="space-y-2">
            {diaryVideos.map((v, i) => {
              const isSelected = selectedVideoUrls.includes(v.url);
              return (
                <div
                  key={i}
                  className={`border rounded-md transition-colors ${
                    isSelected ? 'bg-primary/5 border-primary/30' : 'bg-background border-border'
                  }`}
                >
                  <div
                    className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleVideo(v.url)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleVideo(v.url)}
                      onClick={e => e.stopPropagation()}
                    />
                    <Video className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate block">
                        {extractFileName(v.url)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(v.activityDate).toLocaleDateString('pt-BR')} — {v.activityDescription}
                      </span>
                    </div>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary shrink-0"
                      title="Abrir vídeo"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  {isSelected && (
                    <div className="px-2.5 pb-2.5">
                      <video
                        src={v.url}
                        controls
                        preload="metadata"
                        className="w-full max-h-48 rounded bg-black/5"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
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
