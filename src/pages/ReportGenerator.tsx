import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileEdit } from 'lucide-react';
import { exportReportToPdf } from '@/lib/reportPdfExport';
import { exportToDocx } from '@/lib/docxExport';
import { useReportState } from '@/hooks/useReportState';
import { ReportToolbar } from '@/components/report/ReportToolbar';
import { ReportStructureEditor } from '@/components/report/ReportStructureEditor';
import { ReportLogoEditor } from '@/components/report/ReportLogoEditor';
import { ReportEditSection } from '@/components/report/ReportEditSection';
import { ReportPreviewSection } from '@/components/report/ReportPreviewSection';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';

export const ReportGenerator: React.FC = () => {
  const state = useReportState();
  const reportRef = useRef<HTMLDivElement>(null);

  const {
    project, activities, mode, setMode, isExporting, setIsExporting, exportType, setExportType,
    logo, logoSecondary, objectText, setObjectText, summary, setSummary,
    goalNarratives, setGoalNarratives, goalPhotos,
    otherActionsNarrative, setOtherActionsNarrative, otherActionsPhotos, setOtherActionsPhotos,
    communicationNarrative, setCommunicationNarrative, communicationPhotos, setCommunicationPhotos,
    satisfaction, setSatisfaction, futureActions, setFutureActions,
    expenses, links, setLinks, linkFileNames, setLinkFileNames, sections,
    saveReportData, moveSection, toggleVisibility, updateSectionTitle, updateCustomContent,
    addCustomSection, removeSection, pendingRemoveIndex, confirmRemoveSection, cancelRemoveSection,
    addExpense, updateExpense, removeExpense,
    handleLogoUpload, handlePhotoUpload, handleGoalPhotoUpload, removeGoalPhoto, handleExpenseImageUpload,
    handleDocumentUpload,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
  } = state;

  if (!project) return <div className="p-8 text-center text-muted-foreground">Projeto não encontrado.</div>;

  const exportToPdf = async () => {
    setIsExporting(true);
    setExportType('pdf');
    try {
      await exportReportToPdf({
        project, activities, sections, objectText, summary,
        goalNarratives, goalPhotos,
        otherActionsNarrative, otherActionsPhotos,
        communicationNarrative, communicationPhotos,
        satisfaction, futureActions, expenses, links,
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    setExportType('docx');
    try {
      await exportToDocx({
        project, activities, sections, objectText, summary,
        goalNarratives, otherActionsNarrative: otherActionsNarrative,
        communicationNarrative, satisfaction, futureActions, expenses, links,
      });
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error);
      toast.error('Erro ao exportar DOCX. Tente novamente.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const ReportHeader = () => (
    <div className="flex justify-between items-center mb-6 pb-4 border-b print:border-b-0">
      <div className="flex items-center gap-4">
        {logo ? <img src={logo} alt="Logo" className="h-12 object-contain" /> : <div className="w-12 h-12" />}
      </div>
      <div className="flex items-center gap-4">
        {logoSecondary ? <img src={logoSecondary} alt="Logo Secundário" className="h-12 object-contain" /> : <div className="w-12 h-12" />}
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

  const editSectionProps = {
    objectText, setObjectText, summary, setSummary,
    goalNarratives, setGoalNarratives, goalPhotos,
    otherActionsNarrative, setOtherActionsNarrative, otherActionsPhotos, setOtherActionsPhotos,
    communicationNarrative, setCommunicationNarrative, communicationPhotos, setCommunicationPhotos,
    satisfaction, setSatisfaction, futureActions, setFutureActions,
    expenses, links, setLinks, linkFileNames, setLinkFileNames,
    goals: project.goals, projectName: project.name, projectObject: project.object, activities,
    updateSectionTitle, updateCustomContent, removeSection,
    addExpense, updateExpense, removeExpense,
    handlePhotoUpload, handleGoalPhotoUpload, removeGoalPhoto, handleExpenseImageUpload,
    handleDocumentUpload,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
  };

  const previewSectionProps = {
    objectText, summary, goalNarratives, goalPhotos,
    otherActionsNarrative, otherActionsPhotos, communicationNarrative, communicationPhotos,
    satisfaction, futureActions, expenses, links,
    goals: project.goals,
    organizationName: project.organizationName,
    organizationAddress: project.organizationAddress,
    organizationWebsite: project.organizationWebsite,
    organizationEmail: project.organizationEmail,
    organizationPhone: project.organizationPhone,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
  };

  return (
    <div className="space-y-6 pb-20 animate-fadeIn">
      <ReportToolbar mode={mode} setMode={setMode} isExporting={isExporting} exportType={exportType} onExportPdf={exportToPdf} onExportDocx={handleExportDocx} />

      {mode === 'edit' && (
        <div className="space-y-8 max-w-4xl mx-auto animate-slideUp pb-12">
          <ReportStructureEditor
            sections={sections} moveSection={moveSection} toggleVisibility={toggleVisibility}
            updateSectionTitle={updateSectionTitle} removeSection={removeSection} addCustomSection={addCustomSection}
          />
          <ReportLogoEditor logo={logo} logoSecondary={logoSecondary} onLogoUpload={handleLogoUpload} />
          <div className="space-y-6">
            <h3 className="font-bold text-muted-foreground uppercase text-sm tracking-wide ml-1">Preenchimento do Conteúdo</h3>
            {sections.map((section, index) => (
              <ReportEditSection key={section.id} section={section} index={index} {...editSectionProps} />
            ))}
          </div>
          <div className="fixed bottom-4 right-4 md:right-8 z-20">
            <Button onClick={() => saveReportData()} className="shadow-xl bg-success hover:bg-success/90 text-success-foreground rounded-full px-6 py-3 h-auto text-base">
              <FileEdit className="w-5 h-5 mr-2" /> Salvar Rascunho
            </Button>
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div className="bg-muted p-4 md:p-8 rounded-lg overflow-auto no-print animate-fadeIn">
          <div ref={reportRef} className="bg-card shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] print:shadow-none print:w-full print:max-w-none print:p-0 text-foreground animate-slideUp" style={{ fontFamily: 'Times New Roman, serif', fontSize: '12pt', lineHeight: '1.5', padding: '30mm 20mm 20mm 30mm', textAlign: 'justify' }}>
            <div className="flex flex-col items-center justify-center min-h-[800px] pb-10 mb-10 page-break">
              <ReportHeader />
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <h2 className="text-xl font-bold uppercase mb-4" style={{ textAlign: 'center' }}>Relatório Parcial de Cumprimento do Objeto</h2>
                <h1 className="text-2xl font-bold uppercase mb-4" style={{ textAlign: 'center' }}>{project.name}</h1>
                <h3 className="text-lg mb-8" style={{ textAlign: 'center' }}>Termo de Fomento nº {project.fomentoNumber}</h3>
                <p className="text-lg font-semibold" style={{ textAlign: 'center' }}>{project.organizationName}</p>
              </div>
              <ReportFooter />
            </div>
            <ReportHeader />
            {sections.map(section => (
              <ReportPreviewSection key={section.id} section={section} {...previewSectionProps} />
            ))}
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
