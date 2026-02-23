import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import { exportJustificationToDocx } from '@/lib/justificationDocxExport';
import { useJustificationReportState } from '@/hooks/useJustificationReportState';
import { ReportToolbar } from '@/components/report/ReportToolbar';
import { ReportStructureEditor } from '@/components/report/ReportStructureEditor';
import { JustificationEditSection } from '@/components/justification/JustificationEditSection';
import { JustificationPreviewSection } from '@/components/justification/JustificationPreviewSection';
import { JustificationDraftsList } from '@/components/justification/JustificationDraftsList';

export const JustificationReportGenerator: React.FC = () => {
  const state = useJustificationReportState();
  const reportRef = useRef<HTMLDivElement>(null);

  const {
    project, mode, setMode, isExporting, setIsExporting, exportType, setExportType,
    showDraftsList, setShowDraftsList, currentDraftId,
    drafts, isLoading, isSaving,
    sections, sectionContents, attachmentFiles, SECTION_PLACEHOLDERS, hasContent,
    resetForm, loadDraft, updateSectionContent,
    moveSection, toggleVisibility, updateSectionTitle, updateCustomContent,
    addCustomSection, removeSection,
    saveDraft, deleteDraft, buildReportData,
    handleDocumentUpload, removeAttachmentFile,
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
    if (!reportRef.current) return;
    setIsExporting(true);
    setExportType('pdf');
    try {
      const filename = `Justificativa_Prorrogacao_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const opt = {
        margin: [15, 10, 20, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      const worker = html2pdf().set(opt).from(reportRef.current);
      const pdf = await worker.toPdf().get('pdf');
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const text = `Página ${i} de ${totalPages}`;
        pdf.text(text, (pageWidth - pdf.getTextWidth(text)) / 2, pageHeight - 10);
      }
      pdf.save(filename);
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
      await exportJustificationToDocx({ project, report: buildReportData(), sections, attachmentFiles });
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
                updateSectionContent={updateSectionContent}
                updateSectionTitle={updateSectionTitle}
                updateCustomContent={updateCustomContent}
                removeSection={removeSection}
                handleDocumentUpload={handleDocumentUpload}
                removeAttachmentFile={removeAttachmentFile}
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
            className="bg-card shadow-2xl p-8 md:p-12 max-w-[210mm] mx-auto min-h-[297mm] print:shadow-none print:w-full print:max-w-none print:p-0 font-serif text-foreground leading-relaxed animate-slideUp"
          >
            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-xl font-bold uppercase mb-6">
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
    </div>
  );
};
