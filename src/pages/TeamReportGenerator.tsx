import React, { useState, useRef, useEffect } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAuth } from '@/hooks/useAuth';
import { useTeamReports, TeamReportDraft } from '@/hooks/useTeamReports';
import { TeamReport, PhotoWithCaption } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Image as ImageIcon, Eye, ArrowLeft, FileDown, Users, Save, Trash2, FileEdit, Loader2 } from 'lucide-react';
import { exportTeamReportToDocx } from '@/lib/teamReportDocxExport';
import { exportTeamReportToPdf } from '@/lib/teamReportPdfExport';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortablePhoto } from '@/components/SortablePhoto';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const TeamReportGenerator: React.FC = () => {
  const { activeProject: project } = useAppData();
  const { user } = useAuth();
  const { drafts, isLoading: isDraftsLoading, isSaving, saveDraft, deleteDraft } = useTeamReports(project?.id);
  
  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [providerName, setProviderName] = useState('');
  const [providerDocument, setProviderDocument] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [functionRole, setFunctionRole] = useState('');
  const [periodStart, setPeriodStart] = useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>();
  const [executionReport, setExecutionReport] = useState('');
  const [photosWithCaptions, setPhotosWithCaptions] = useState<PhotoWithCaption[]>([]);
  const [isPreview, setIsPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDraftsList, setShowDraftsList] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom titles
  const [reportTitle, setReportTitle] = useState('RELATÓRIO DA EQUIPE DE TRABALHO');
  const [executionReportTitle, setExecutionReportTitle] = useState('2. Relato de Execução da Coordenação do Projeto');
  const [attachmentsTitle, setAttachmentsTitle] = useState('3. Anexos de Comprovação');
  const [footerText, setFooterText] = useState('');
  const [additionalSections, setAdditionalSections] = useState<{ id: string; title: string; content: string }[]>([]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset form
  const resetForm = () => {
    setCurrentDraftId(undefined);
    setSelectedMemberId('');
    setProviderName('');
    setProviderDocument('');
    setResponsibleName('');
    setFunctionRole('');
    setPeriodStart(undefined);
    setPeriodEnd(undefined);
    setExecutionReport('');
    setPhotosWithCaptions([]);
    setReportTitle('RELATÓRIO DA EQUIPE DE TRABALHO');
    setExecutionReportTitle('2. Relato de Execução da Coordenação do Projeto');
    setAttachmentsTitle('3. Anexos de Comprovação');
    setFooterText('');
    setAdditionalSections([]);
  };

  // Load draft into form
  const loadDraft = (draft: TeamReportDraft) => {
    setCurrentDraftId(draft.id);
    setSelectedMemberId(draft.teamMemberId);
    setProviderName(draft.providerName);
    setProviderDocument(draft.providerDocument);
    setResponsibleName(draft.responsibleName);
    setFunctionRole(draft.functionRole);
    setPeriodStart(draft.periodStart ? new Date(draft.periodStart) : undefined);
    setPeriodEnd(draft.periodEnd ? new Date(draft.periodEnd) : undefined);
    setExecutionReport(draft.executionReport);
    setPhotosWithCaptions(draft.photoCaptions || []);
    setReportTitle(draft.reportTitle || 'RELATÓRIO DA EQUIPE DE TRABALHO');
    setExecutionReportTitle(draft.executionReportTitle || '2. Relato de Execução da Coordenação do Projeto');
    setAttachmentsTitle(draft.attachmentsTitle || '3. Anexos de Comprovação');
    setFooterText(draft.footerText || '');
    setAdditionalSections(draft.additionalSections || []);
    setShowDraftsList(false);
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Nenhum projeto selecionado</h2>
        <p className="text-muted-foreground">Selecione ou crie um projeto para gerar relatórios de equipe.</p>
      </div>
    );
  }

  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    const member = project.team.find(m => m.id === memberId);
    if (member) {
      setResponsibleName(member.name);
      setFunctionRole(member.role);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      const photoId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${user?.id}/${photoId}.${fileExt}`;

      const { error } = await supabase.storage
        .from('team-report-photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Erro ao enviar foto: ${file.name}`);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('team-report-photos')
        .getPublicUrl(filePath);

      return {
        id: photoId,
        url: urlData.publicUrl,
        caption: 'Registro fotográfico das atividades realizadas',
      } as PhotoWithCaption;
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter((r): r is PhotoWithCaption => r !== null);
    if (successfulUploads.length > 0) {
      setPhotosWithCaptions(prev => [...prev, ...successfulUploads]);
      toast.success(`${successfulUploads.length} foto(s) enviada(s) com sucesso!`);
    }
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotosWithCaptions(prev => prev.filter((_, i) => i !== index));
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    setPhotosWithCaptions(prev => 
      prev.map((photo, i) => i === index ? { ...photo, caption } : photo)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setPhotosWithCaptions((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Preencha o período de referência');
      return;
    }
    if (!responsibleName) {
      toast.error('Preencha o nome do responsável');
      return;
    }

    const draftData = {
      id: currentDraftId,
      projectId: project.id,
      teamMemberId: selectedMemberId,
      providerName,
      providerDocument,
      responsibleName,
      functionRole,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      executionReport,
      photos: photosWithCaptions.map(p => p.url),
      photoCaptions: photosWithCaptions,
      reportTitle,
      executionReportTitle,
      attachmentsTitle,
      additionalSections,
      footerText,
      isDraft: true,
    };

    const savedId = await saveDraft(draftData);
    if (savedId) {
      setCurrentDraftId(savedId);
      toast.success('Rascunho salvo com sucesso!');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDraft(draftId);
    if (currentDraftId === draftId) {
      resetForm();
      setShowDraftsList(true);
    }
  };

  const handleExportDocx = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Preencha o período de referência');
      return;
    }
    if (!responsibleName) {
      toast.error('Preencha o nome do responsável');
      return;
    }
    if (!executionReport) {
      toast.error('Preencha o relato de execução');
      return;
    }

    setIsExporting(true);
    try {
      const reportData: TeamReport = {
        id: currentDraftId || crypto.randomUUID(),
        projectId: project.id,
        teamMemberId: selectedMemberId,
        providerName,
        providerDocument,
        responsibleName,
        functionRole,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        executionReport,
        photos: photosWithCaptions.map(p => p.url),
        photoCaptions: photosWithCaptions,
        reportTitle,
        executionReportTitle,
        attachmentsTitle,
        additionalSections,
        footerText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await exportTeamReportToDocx({ project, report: reportData });
      toast.success('Relatório DOCX exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error);
      toast.error('Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Preencha o período de referência');
      return;
    }
    if (!responsibleName) {
      toast.error('Preencha o nome do responsável');
      return;
    }
    if (!executionReport) {
      toast.error('Preencha o relato de execução');
      return;
    }

    setIsExporting(true);
    try {
      const reportData: TeamReport = {
        id: currentDraftId || crypto.randomUUID(),
        projectId: project.id,
        teamMemberId: selectedMemberId,
        providerName,
        providerDocument,
        responsibleName,
        functionRole,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        executionReport,
        photos: photosWithCaptions.map(p => p.url),
        photoCaptions: photosWithCaptions,
        reportTitle,
        executionReportTitle,
        attachmentsTitle,
        additionalSections,
        footerText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await exportTeamReportToPdf({ project, report: reportData });
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Drafts List View
  if (showDraftsList && !isPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Relatório da Equipe de Trabalho
            </h1>
            <p className="text-muted-foreground mt-1">
              Gere relatórios individuais dos membros da equipe do projeto
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowDraftsList(false); }}>
            <FileEdit className="w-4 h-4 mr-2" />
            Novo Relatório
          </Button>
        </div>

        {/* Saved Drafts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Relatórios Salvos</CardTitle>
            <CardDescription>Continue editando um relatório salvo ou crie um novo</CardDescription>
          </CardHeader>
          <CardContent>
            {isDraftsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileEdit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum relatório salvo ainda.</p>
                <p className="text-sm">Clique em "Novo Relatório" para começar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{draft.responsibleName || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">
                        {draft.functionRole || 'Função não definida'} • 
                        {draft.periodStart && draft.periodEnd ? (
                          ` ${format(new Date(draft.periodStart), 'MM/yyyy')} - ${format(new Date(draft.periodEnd), 'MM/yyyy')}`
                        ) : ' Período não definido'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualizado em {format(new Date(draft.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {draft.isDraft && <span className="ml-2 text-amber-600 font-medium">• Rascunho</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => loadDraft(draft)}>
                        <FileEdit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O relatório de {draft.responsibleName} será excluído permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDraft(draft.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form View
  if (!isPreview) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setShowDraftsList(true)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {currentDraftId ? 'Editar Relatório' : 'Novo Relatório'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {project.name}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSaveDraft} 
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Rascunho
          </Button>
        </div>

        {/* Project Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground text-xs">Projeto</Label>
              <p className="font-medium">{project.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Termo de Fomento</Label>
              <p className="font-medium">{project.fomentoNumber}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Organização</Label>
              <p className="font-medium">{project.organizationName}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Financiador</Label>
              <p className="font-medium">{project.funder}</p>
            </div>
          </CardContent>
        </Card>

        {/* Identification Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Dados de Identificação</CardTitle>
            <CardDescription>Selecione um membro da equipe ou preencha manualmente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.team.length > 0 && (
              <div className="space-y-2">
                <Label>Membro da Equipe (opcional)</Label>
                <Select value={selectedMemberId} onValueChange={handleMemberSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar membro cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {project.team.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="providerName">Prestador (Empresa/PJ)</Label>
                <Input
                  id="providerName"
                  placeholder="Nome da empresa ou prestador"
                  value={providerName}
                  onChange={e => setProviderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerDocument">CNPJ</Label>
                <Input
                  id="providerDocument"
                  placeholder="00.000.000/0000-00"
                  value={providerDocument}
                  onChange={e => setProviderDocument(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsibleName">Responsável Técnico *</Label>
                <Input
                  id="responsibleName"
                  placeholder="Nome completo"
                  value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="functionRole">Função *</Label>
                <Input
                  id="functionRole"
                  placeholder="Ex: Coordenador de Produção"
                  value={functionRole}
                  onChange={e => setFunctionRole(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Período de Referência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !periodStart && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodStart ? format(periodStart, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={periodStart}
                      onSelect={setPeriodStart}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !periodEnd && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodEnd ? format(periodEnd, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={periodEnd}
                      onSelect={setPeriodEnd}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Titles Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personalizar Títulos</CardTitle>
            <CardDescription>
              Personalize os títulos das seções do relatório. Você também pode adicionar seções extras.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reportTitle">Título Principal do Relatório</Label>
              <Input
                id="reportTitle"
                value={reportTitle}
                onChange={e => setReportTitle(e.target.value)}
                placeholder="RELATÓRIO DA EQUIPE DE TRABALHO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="executionReportTitle">Título da Seção de Execução</Label>
              <Input
                id="executionReportTitle"
                value={executionReportTitle}
                onChange={e => setExecutionReportTitle(e.target.value)}
                placeholder="2. Relato de Execução da Coordenação do Projeto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attachmentsTitle">Título da Seção de Anexos</Label>
              <Input
                id="attachmentsTitle"
                value={attachmentsTitle}
                onChange={e => setAttachmentsTitle(e.target.value)}
                placeholder="3. Anexos de Comprovação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footerText">Rodapé Personalizado</Label>
              <Input
                id="footerText"
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                placeholder="Deixe em branco para usar o nome da organização"
              />
              <p className="text-xs text-muted-foreground">
                Se deixar em branco, será usado o nome da organização: "{project.organizationName}"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Execution Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{executionReportTitle.replace(/^\d+\.\s*/, '')}</CardTitle>
            <CardDescription>
              Descreva detalhadamente as atividades realizadas no exercício da função. Use a barra de ferramentas para formatar o texto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={executionReport}
              onChange={setExecutionReport}
              placeholder="No exercício da função de [função], o prestador atuou na viabilização..."
            />
          </CardContent>
        </Card>

        {/* Additional Sections */}
        {additionalSections.map((section, idx) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Input
                  value={section.title}
                  onChange={e => {
                    const updated = [...additionalSections];
                    updated[idx].title = e.target.value;
                    setAdditionalSections(updated);
                  }}
                  placeholder={`Título da Seção ${idx + 4}`}
                  className="font-semibold text-lg border-0 p-0 h-auto focus-visible:ring-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setAdditionalSections(prev => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={section.content}
                onChange={(value) => {
                  const updated = [...additionalSections];
                  updated[idx].content = value;
                  setAdditionalSections(updated);
                }}
                placeholder="Conteúdo da seção adicional..."
              />
            </CardContent>
          </Card>
        ))}

        {/* Add Section Button */}
        <Button
          variant="outline"
          onClick={() => setAdditionalSections(prev => [...prev, { 
            id: crypto.randomUUID(), 
            title: `${additionalSections.length + 4}. Nova Seção`, 
            content: '' 
          }])}
          className="w-full"
        >
          + Adicionar Nova Seção
        </Button>

        {/* Photos Section with Drag and Drop */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">3. Anexos de Comprovação</CardTitle>
            <CardDescription>Adicione fotos e arraste para reordenar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Adicionar Fotos
            </Button>

            {photosWithCaptions.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={photosWithCaptions.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {photosWithCaptions.map((photo, idx) => (
                      <SortablePhoto
                        key={photo.id}
                        photo={photo}
                        index={idx}
                        onRemove={removePhoto}
                        onUpdateCaption={updatePhotoCaption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Rascunho
          </Button>
          <Button variant="outline" onClick={() => setIsPreview(true)}>
            <Eye className="w-4 h-4 mr-2" />
            Pré-visualizar
          </Button>
          <Button onClick={handleExportDocx} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar DOCX'}
          </Button>
        </div>
      </div>
    );
  }

  // Preview View
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => setIsPreview(false)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Formulário
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={handleExportDocx} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar DOCX'}
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <Card className="p-8 bg-white text-black print:shadow-none">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-center mb-8">{reportTitle}</h1>
          
          <div className="space-y-1">
            <p><strong>Termo de Fomento nº:</strong> {project.fomentoNumber}</p>
            <p><strong>Projeto:</strong> {project.name}</p>
            <p><strong>Período de Referência:</strong> [{periodStart ? format(periodStart, 'MM/yyyy') : '--'} à {periodEnd ? format(periodEnd, 'MM/yyyy') : '--'}]</p>
          </div>

          <div>
            <h2 className="text-lg font-bold mt-6 mb-3">1. Dados de Identificação</h2>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Prestador:</strong> {providerName || '[Não informado]'}</li>
              <li><strong>Responsável Técnico:</strong> {responsibleName}</li>
              <li><strong>Função:</strong> {functionRole}</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold mt-6 mb-3">{executionReportTitle}</h2>
            <div 
              className="text-justify prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: executionReport || '<p>[Nenhum relato informado]</p>' }}
            />
          </div>

          {/* Additional Sections in Preview */}
          {additionalSections.map((section) => (
            <div key={section.id}>
              <h2 className="text-lg font-bold mt-6 mb-3">{section.title}</h2>
              <div 
                className="text-justify prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: section.content || '<p>[Nenhum conteúdo]</p>' }}
              />
            </div>
          ))}

          {photosWithCaptions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mt-6 mb-3">{attachmentsTitle}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {photosWithCaptions.map((photo, idx) => (
                  <div key={photo.id} className="space-y-2">
                    <img
                      src={photo.url}
                      alt={`Registro ${idx + 1}`}
                      className="w-full aspect-video object-cover rounded-lg border"
                    />
                    <p className="text-xs text-center italic text-gray-600">
                      Foto {idx + 1}: {photo.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 pt-8">
            <p>Rio de Janeiro, {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.</p>
            
            <div className="mt-12 text-center">
              <p className="border-t border-black inline-block pt-2 px-16">
                Assinatura do responsável legal
              </p>
              <p className="mt-4"><strong>Nome e cargo:</strong> {responsibleName} - {functionRole}</p>
              <p><strong>CNPJ:</strong> {providerDocument || '[Não informado]'}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
