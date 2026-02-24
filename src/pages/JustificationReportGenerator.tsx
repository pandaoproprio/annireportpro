import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportJustificationToDocx } from '@/lib/justificationDocxExport';
import { exportJustificationToPdf } from '@/lib/justificationPdfExport';
import { useJustificationReportState } from '@/hooks/useJustificationReportState';
import { useReportVisualConfig } from '@/hooks/useReportVisualConfig';
import { ReportToolbar } from '@/components/report/ReportToolbar';
import { ReportStructureEditor } from '@/components/report/ReportStructureEditor';
import { ReportVisualConfigEditor } from '@/components/report/ReportVisualConfigEditor';
import { JustificationEditSection } from '@/components/justification/JustificationEditSection';
import { JustificationPreviewSection } from '@/components/justification/JustificationPreviewSection';
import { JustificationDraftsList } from '@/components/justification/JustificationDraftsList';

export const JustificationReportGenerator: React.FC = () => {
  const state = useJustificationReportState();
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const vc = useReportVisualConfig(state.project?.id, 'justification');

  const {
    project, mode, setMode, isExporting, setIsExporting, exportType, setExportType,
    showDraftsList, setShowDraftsList, currentDraftId,
    drafts, isLoading, isSaving,
    sections, sectionContents, attachmentFiles, sectionPhotos, sectionDocs, SECTION_PLACEHOLDERS, hasContent,
    resetForm, loadDraft, updateSectionContent,
    moveSection, toggleVisibility, updateSectionTitle, updateCustomContent,
    addCustomSection, removeSection,
    pendingRemoveIndex, confirmRemoveSection, cancelRemoveSection,
    saveDraft, deleteDraft, buildReportData,
    handleDocumentUpload, removeAttachmentFile,
    handleSectionPhotoUpload, removeSectionPhoto,
    handleSectionDocUpload, removeSectionDoc,
  } = state;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Nenhum projeto selecionado</h2>
        <p className="text-muted-foreground">Selecione ou crie um projeto para gerar justificativas.</p>
      </div>
    );
  }

  // Drafts list view
  if (showDraftsList) {
    return (
      <JustificationDraftsList
        drafts={drafts}
        isLoading={isLoading}
        onNewDraft={() => { resetForm(); setShowDraftsList(false); }}
        onEditDraft={loadDraft}
        onDeleteDraft={deleteDraft}
      />
    );
  }

  const handleExportPdf = async () => {
    if (!hasContent) { toast.error('Preencha ao menos uma seção'); return; }
    setIsExporting(true);
    setExportType('pdf');
    try {
      await exportJustificationToPdf({ project, report: buildReportData(), visualConfig: vc.config });
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportDocx = async () => {
    if (!hasContent) { toast.error('Preencha ao menos uma seção'); return; }
    setIsExporting(true);
    setExportType('docx');
    try {
      await exportJustificationToDocx({ project, report: buildReportData(), sections, attachmentFiles, visualConfig: vc.config });
      toast.success('DOCX exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error);
      toast.error('Erro ao exportar DOCX');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  // Visible sections with numbering
  const visibleSections = sections.filter(s => s.isVisible);

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="ghost" size="sm" onClick={() => setShowDraftsList(true)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <div>
          <h2 className="text-lg font-bold">
            {currentDraftId ? 'Editar Justificativa' : 'Nova Justificativa'}
          </h2>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
      </div>

      <ReportToolbar
        mode={mode}
        setMode={setMode}
        isExporting={isExporting}
        exportType={exportType}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
        onOpenWysiwyg={() => navigate('/wysiwyg')}
      />

      {mode === 'edit' && (
        <div className="space-y-8 max-w-4xl mx-auto animate-slideUp pb-12">
          <ReportStructureEditor
            sections={sections}
            moveSection={moveSection}
            toggleVisibility={toggleVisibility}
            updateSectionTitle={updateSectionTitle}
            removeSection={removeSection}
            addCustomSection={addCustomSection}
          />

          <ReportVisualConfigEditor
            config={vc.config}
            updateConfig={vc.updateConfig}
            onSave={() => vc.saveConfig()}
            onLogoUpload={vc.handleLogoUpload}
            onBannerUpload={vc.handleBannerUpload}
            organizationName={project.organizationName}
            organizationAddress={project.organizationAddress}
            organizationEmail={project.organizationEmail}
            organizationPhone={project.organizationPhone}
            organizationWebsite={project.organizationWebsite}
          />

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

          {/* Section Editors */}
          <div className="space-y-6">
            <h3 className="font-bold text-muted-foreground uppercase text-sm tracking-wide ml-1">Preenchimento do Conteúdo</h3>
            {sections.map((section, index) => (
              <JustificationEditSection
                key={section.id}
                section={section}
                index={index}
                sectionContents={sectionContents}
                placeholders={SECTION_PLACEHOLDERS}
                attachmentFiles={attachmentFiles}
                sectionPhotos={sectionPhotos}
                sectionDocs={sectionDocs}
                updateSectionContent={updateSectionContent}
                updateSectionTitle={updateSectionTitle}
                updateCustomContent={updateCustomContent}
                removeSection={removeSection}
                handleDocumentUpload={handleDocumentUpload}
                removeAttachmentFile={removeAttachmentFile}
                handleSectionPhotoUpload={handleSectionPhotoUpload}
                removeSectionPhoto={removeSectionPhoto}
                handleSectionDocUpload={handleSectionDocUpload}
                removeSectionDoc={removeSectionDoc}
              />
            ))}
          </div>

          <div className="fixed bottom-4 right-4 md:right-8 z-20">
            <Button onClick={saveDraft} disabled={isSaving} className="shadow-xl bg-success hover:bg-success/90 text-success-foreground rounded-full px-6 py-3 h-auto text-base">
              {isSaving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
              Salvar Rascunho
            </Button>
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div className="bg-muted p-4 md:p-8 rounded-lg overflow-auto no-print animate-fadeIn">
          <div
            ref={reportRef}
            className="bg-card shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] print:shadow-none print:w-full print:max-w-none print:p-0 text-foreground animate-slideUp"
            style={{ fontFamily: 'Times New Roman, serif', fontSize: '12pt', lineHeight: '1.5', padding: '30mm 20mm 20mm 30mm', textAlign: 'justify' }}
          >
            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-xl font-bold uppercase mb-6" style={{ textAlign: 'center' }}>
                Justificativa para Prorrogação de Prazo do Projeto
              </h1>
              <div className="text-left space-y-1 mb-6">
                <p><strong>Projeto:</strong> {project.name}</p>
                <p><strong>Termo de Fomento nº:</strong> {project.fomentoNumber}</p>
                <p><strong>Organização:</strong> {project.organizationName}</p>
              </div>
              <p className="text-left mt-6">Ao {project.funder},</p>
            </div>

            {/* Sections */}
            {visibleSections.map((section, idx) => (
              <JustificationPreviewSection
                key={section.id}
                section={section}
                index={idx}
                sectionContents={sectionContents}
                attachmentFiles={attachmentFiles}
                sectionPhotos={sectionPhotos}
              />
            ))}

            {/* Signature */}
            <div className="mt-16 pt-10 flex flex-col items-center break-inside-avoid">
              <p className="mb-8">
                Rio de Janeiro, {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <div className="w-80 border-t border-foreground mb-2 mt-16"></div>
              <p className="font-bold uppercase">Assinatura do Responsável Legal</p>
              <p className="text-sm">{project.organizationName}</p>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingRemoveIndex !== null}
        onOpenChange={(open) => { if (!open) cancelRemoveSection(); }}
        title="Remover seção"
        description="Tem certeza que deseja remover esta seção?"
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={confirmRemoveSection}
      />
    </div>
  );
};
