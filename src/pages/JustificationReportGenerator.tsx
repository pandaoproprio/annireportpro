import React, { useState } from 'react';
import { useAppData } from '@/contexts/AppDataContext';
import { useJustificationReports } from '@/hooks/useJustificationReports';
import { JustificationReport, JustificationReportDraft } from '@/types/justificationReport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, FileDown, Save, Trash2, FileEdit, Loader2, FileText,
} from 'lucide-react';
import { exportJustificationToDocx } from '@/lib/justificationDocxExport';
import { exportJustificationToPdf } from '@/lib/justificationPdfExport';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SECTION_DEFS = [
  { key: 'objectSection' as const, num: '1', title: 'Do Objeto do Termo Aditivo', placeholder: 'Descreva o objeto do termo aditivo, incluindo o prazo de prorrogação solicitado e as finalidades...' },
  { key: 'justificationSection' as const, num: '2', title: 'Da Justificativa para a Prorrogação', placeholder: 'Apresente os aspectos que fundamentam a solicitação de prorrogação...' },
  { key: 'executedActionsSection' as const, num: '3', title: 'Das Ações Já Executadas (Resultados Parciais)', placeholder: 'Descreva os resultados alcançados até o momento...' },
  { key: 'futureActionsSection' as const, num: '4', title: 'Das Ações Futuras Previstas no Período de Prorrogação', placeholder: 'Descreva as ações previstas durante o período de prorrogação...' },
  { key: 'requestedDeadlineSection' as const, num: '5', title: 'Do Prazo Solicitado', placeholder: 'Informe o prazo solicitado e a destinação do período adicional...' },
  { key: 'attachmentsSection' as const, num: '6', title: 'Anexos', placeholder: 'Liste os anexos comprobatórios que acompanham esta justificativa...' },
];

type SectionKey = typeof SECTION_DEFS[number]['key'];

export const JustificationReportGenerator: React.FC = () => {
  const { activeProject: project } = useAppData();
  const { drafts, isLoading, isSaving, saveDraft, deleteDraft } = useJustificationReports(project?.id);

  const [currentDraftId, setCurrentDraftId] = useState<string | undefined>();
  const [showDraftsList, setShowDraftsList] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [sectionContents, setSectionContents] = useState<Record<SectionKey, string>>({
    objectSection: '',
    justificationSection: '',
    executedActionsSection: '',
    futureActionsSection: '',
    requestedDeadlineSection: '',
    attachmentsSection: '',
  });

  const resetForm = () => {
    setCurrentDraftId(undefined);
    setSectionContents({
      objectSection: '', justificationSection: '', executedActionsSection: '',
      futureActionsSection: '', requestedDeadlineSection: '', attachmentsSection: '',
    });
  };

  const loadDraft = (draft: JustificationReport) => {
    setCurrentDraftId(draft.id);
    setSectionContents({
      objectSection: draft.objectSection,
      justificationSection: draft.justificationSection,
      executedActionsSection: draft.executedActionsSection,
      futureActionsSection: draft.futureActionsSection,
      requestedDeadlineSection: draft.requestedDeadlineSection,
      attachmentsSection: draft.attachmentsSection,
    });
    setShowDraftsList(false);
  };

  const updateSection = (key: SectionKey, value: string) => {
    setSectionContents(prev => ({ ...prev, [key]: value }));
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Nenhum projeto selecionado</h2>
        <p className="text-muted-foreground">Selecione ou crie um projeto para gerar justificativas.</p>
      </div>
    );
  }

  const handleSaveDraft = async () => {
    const draftData: JustificationReportDraft = {
      id: currentDraftId,
      projectId: project.id,
      ...sectionContents,
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

  const buildReportData = (): JustificationReport => ({
    id: currentDraftId || crypto.randomUUID(),
    projectId: project.id,
    ...sectionContents,
    isDraft: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const hasContent = Object.values(sectionContents).some(v => v.trim() !== '');

  const handleExportDocx = async () => {
    if (!hasContent) { toast.error('Preencha ao menos uma seção'); return; }
    setIsExporting(true);
    try {
      await exportJustificationToDocx({ project, report: buildReportData() });
      toast.success('DOCX exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error);
      toast.error('Erro ao exportar DOCX');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!hasContent) { toast.error('Preencha ao menos uma seção'); return; }
    setIsExporting(true);
    try {
      await exportJustificationToPdf({ project, report: buildReportData() });
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  // Drafts List View
  if (showDraftsList) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              Justificativa para Prorrogação
            </h1>
            <p className="text-muted-foreground mt-1">
              Elabore justificativas de prorrogação de prazo do projeto
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowDraftsList(false); }}>
            <FileEdit className="w-4 h-4 mr-2" />
            Nova Justificativa
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Justificativas Salvas</CardTitle>
            <CardDescription>Continue editando ou crie uma nova</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma justificativa salva ainda.</p>
                <p className="text-sm">Clique em "Nova Justificativa" para começar.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div key={draft.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">Justificativa de Prorrogação</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Atualizado em {format(new Date(draft.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {draft.isDraft && <span className="ml-2 text-warning font-medium">• Rascunho</span>}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => loadDraft(draft)}>
                        <FileEdit className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir justificativa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteDraft(draft.id)}>Excluir</AlertDialogAction>
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
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setShowDraftsList(true)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {currentDraftId ? 'Editar Justificativa' : 'Nova Justificativa'}
            </h1>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Rascunho
          </Button>
          <Button variant="outline" onClick={handleExportDocx} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" /> DOCX
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      {/* Project Info */}
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
            <Label className="text-muted-foreground text-xs">Termo de Fomento nº</Label>
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

      {/* Sections */}
      {SECTION_DEFS.map((section) => (
        <Card key={section.key}>
          <CardHeader>
            <CardTitle className="text-lg">{section.num}. {section.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={sectionContents[section.key]}
              onChange={(val) => updateSection(section.key, val)}
              placeholder={section.placeholder}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
