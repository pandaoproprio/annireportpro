import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileEdit } from 'lucide-react';
import { exportReportToPdf } from '@/lib/reportPdfExport';
import { exportToDocx } from '@/lib/docxExport';
import { useReportState } from '@/hooks/useReportState';
import { useReportVisualConfig } from '@/hooks/useReportVisualConfig';
import { ReportToolbar } from '@/components/report/ReportToolbar';
import { ReportStructureEditor } from '@/components/report/ReportStructureEditor';
import { ReportVisualConfigEditor } from '@/components/report/ReportVisualConfigEditor';
import { ReportEditSection } from '@/components/report/ReportEditSection';
import { ReportPreviewSection } from '@/components/report/ReportPreviewSection';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { mmToPx, a4PageStyle, MR, ML, MB } from '@/lib/previewConstants';

export const ReportGenerator: React.FC = () => {
  const state = useReportState();
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const {
    project, activities, mode, setMode, isExporting, setIsExporting, exportType, setExportType,
    objectText, setObjectText, summary, setSummary,
    goalNarratives, setGoalNarratives, goalPhotos,
    otherActionsNarrative, setOtherActionsNarrative, otherActionsPhotos, setOtherActionsPhotos,
    communicationNarrative, setCommunicationNarrative, communicationPhotos, setCommunicationPhotos,
    satisfaction, setSatisfaction, futureActions, setFutureActions,
    expenses, links, setLinks, linkFileNames, setLinkFileNames, sections,
    sectionPhotos, sectionDocs,
    photoMetadata, updatePhotoCaption, updatePhotoSize, replacePhotoUrl,
    pageLayouts, setPageLayouts,
    sectionPhotoGroups, setSectionPhotoGroups,
    saveReportData, moveSection, toggleVisibility, updateSectionTitle, updateCustomContent,
    addCustomSection, removeSection, pendingRemoveIndex, confirmRemoveSection, cancelRemoveSection,
    addExpense, updateExpense, removeExpense,
    handlePhotoUpload, handleGoalPhotoUpload, removeGoalPhoto, handleExpenseImageUpload,
    handleDocumentUpload,
    handleSectionPhotoUpload, removeSectionPhoto,
    handleSectionDocUpload, removeSectionDoc,
    insertDiaryPhotos,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
  } = state;

  // Visual config scoped to this project + report_object
  const vc = useReportVisualConfig(project?.id, 'report_object');

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
        sectionPhotos, photoMetadata,
        visualConfig: vc.config,
        pageLayouts,
        sectionPhotoGroups,
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
        goalNarratives, otherActionsNarrative,
        communicationNarrative, satisfaction, futureActions, expenses, links,
        visualConfig: vc.config,
      });
    } catch (error) {
      console.error('Erro ao exportar DOCX:', error);
      toast.error('Erro ao exportar DOCX. Tente novamente.');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const { config } = vc;

  // Build justify-content from alignment
  const logoJustify = config.headerLogoAlignment === 'left' ? 'flex-start'
    : config.headerLogoAlignment === 'right' ? 'flex-end'
    : config.headerLogoAlignment === 'center' ? 'center'
    : config.headerLogoAlignment; // space-between, space-around

  // Dynamic header height: use banner height when banner is active, else headerHeight
  const effectiveHeaderHeightPx = config.headerBannerUrl && config.headerBannerVisible
    ? mmToPx(config.headerBannerHeightMm)
    : mmToPx(config.headerHeight);

  const headerContentGapPx = mmToPx(config.headerContentSpacing ?? 8);

  const ReportHeader = () => (
    <div className="pb-4 border-b print:border-b-0" style={{ paddingTop: `${config.headerTopPadding}px`, minHeight: `${effectiveHeaderHeightPx}px`, marginBottom: `${headerContentGapPx}px` }}>
      {config.headerBannerUrl && config.headerBannerVisible ? (
        <img src={config.headerBannerUrl} alt="Cabeçalho" className="w-full" style={{ height: `${mmToPx(config.headerBannerHeightMm)}px`, objectFit: config.headerBannerFit }} />
      ) : (
        <div className="flex items-center" style={{ justifyContent: logoJustify, gap: `${mmToPx(config.headerLogoGap)}px` }}>
          <div className="flex items-center gap-3">
            {config.logo && config.logoConfig.visible && (
              <img src={config.logo} alt="Logo" className="object-contain" style={{ width: `${mmToPx(config.logoConfig.widthMm)}px` }} />
            )}
            {config.headerLeftText && <span className="text-xs text-muted-foreground">{config.headerLeftText}</span>}
          </div>
          <div className="flex items-center justify-center">
            {config.logoCenter && config.logoCenterConfig.visible && (
              <img src={config.logoCenter} alt="Logo Centro" className="object-contain" style={{ width: `${mmToPx(config.logoCenterConfig.widthMm)}px` }} />
            )}
          </div>
          <div className="flex items-center gap-3">
            {config.headerRightText && <span className="text-xs text-muted-foreground">{config.headerRightText}</span>}
            {config.logoSecondary && config.logoSecondaryConfig.visible && (
              <img src={config.logoSecondary} alt="Logo Secundário" className="object-contain" style={{ width: `${mmToPx(config.logoSecondaryConfig.widthMm)}px` }} />
            )}
          </div>
        </div>
      )}
    </div>
  );

  const coverTitleAlign = config.coverTitleAlignment || 'center';
  const coverSubAlign = config.coverSubtitleAlignment || 'center';
  const coverOrgAlign = config.coverOrgAlignment || 'center';
  const coverFomentoAlign = config.coverFomentoAlignment || 'center';
  // Cover logo: dedicated coverLogo or fallback to primary header logo
  const coverLogoSrc = config.coverLogo || config.logo;

  const ReportFooter = React.forwardRef<HTMLDivElement>((_, ref) => {
    const instEnabled = config.footerInstitutionalEnabled !== false;
    const footerAlign = config.footerAlignment || 'center';
    return (
      <div ref={ref} className="mt-8 pt-4 border-t print:fixed print:bottom-0 print:left-0 print:right-0 print:bg-card print:py-2" style={{ paddingTop: `${config.footerTopSpacing || 4}px`, textAlign: footerAlign }}>
        {instEnabled && (
          <div className="space-y-0">
            <p className="font-bold" style={{ fontSize: `${config.footerLine1FontSize || 9}pt`, marginBottom: `${config.footerLineSpacing || 3}px` }}>
              {config.footerLine1Text || project.organizationName}
            </p>
            {config.footerLine2Text && (
              <p style={{ fontSize: `${config.footerLine2FontSize || 7}pt`, marginBottom: `${config.footerLineSpacing || 3}px` }}>
                {config.footerLine2Text}
              </p>
            )}
            {config.footerLine3Text && (
              <p style={{ fontSize: `${config.footerLine3FontSize || 7}pt`, marginBottom: `${config.footerLineSpacing || 3}px` }}>
                {config.footerLine3Text}
              </p>
            )}
          </div>
        )}
        {config.footerText && <p className="italic mt-1 text-xs text-muted-foreground">{config.footerText}</p>}
      </div>
    );
  });
  ReportFooter.displayName = 'ReportFooter';

  const editSectionProps = {
    objectText, setObjectText, summary, setSummary,
    goalNarratives, setGoalNarratives, goalPhotos,
    otherActionsNarrative, setOtherActionsNarrative, otherActionsPhotos, setOtherActionsPhotos,
    communicationNarrative, setCommunicationNarrative, communicationPhotos, setCommunicationPhotos,
    satisfaction, setSatisfaction, futureActions, setFutureActions,
    expenses, links, setLinks, linkFileNames, setLinkFileNames,
    sectionPhotos, sectionDocs,
    photoMetadata, updatePhotoCaption, updatePhotoSize, replacePhotoUrl,
    pageLayouts, setPageLayouts,
    sectionPhotoGroups, setSectionPhotoGroups,
    goals: project.goals, projectName: project.name, projectObject: project.object, activities,
    projectId: project.id,
    updateSectionTitle, updateCustomContent, removeSection,
    addExpense, updateExpense, removeExpense,
    handlePhotoUpload, handleGoalPhotoUpload, removeGoalPhoto, handleExpenseImageUpload,
    handleDocumentUpload,
    handleSectionPhotoUpload, removeSectionPhoto,
    handleSectionDocUpload, removeSectionDoc,
    insertDiaryPhotos,
    getActivitiesByGoal, getCommunicationActivities, getOtherActivities, formatActivityDate,
  };

  const previewSectionProps = {
    objectText, summary, goalNarratives, goalPhotos,
    otherActionsNarrative, otherActionsPhotos, communicationNarrative, communicationPhotos,
    satisfaction, futureActions, expenses, links,
    sectionPhotos, photoMetadata, sectionPhotoGroups,
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
      <ReportToolbar mode={mode} setMode={setMode} isExporting={isExporting} exportType={exportType} onExportPdf={exportToPdf} onExportDocx={handleExportDocx} onOpenWysiwyg={() => navigate('/wysiwyg')} />

      {mode === 'edit' && (
        <div className="space-y-8 max-w-4xl mx-auto animate-slideUp pb-12">
          <ReportStructureEditor
            sections={sections} moveSection={moveSection} toggleVisibility={toggleVisibility}
            updateSectionTitle={updateSectionTitle} removeSection={removeSection} addCustomSection={addCustomSection}
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
            showCoverConfig={true}
          />
          <div className="space-y-6">
            <h3 className="font-bold text-muted-foreground uppercase text-sm tracking-wide ml-1">Preenchimento do Conteúdo</h3>
            {sections.map((section, index) => (
              <ReportEditSection key={section.id} section={section} index={index} {...editSectionProps} />
            ))}
          </div>
          <div className="fixed bottom-4 right-4 md:right-8 z-20">
            <Button onClick={async () => { await saveReportData(); await vc.saveConfig(false); }} className="shadow-xl bg-success hover:bg-success/90 text-success-foreground rounded-full px-6 py-3 h-auto text-base">
              <FileEdit className="w-5 h-5 mr-2" /> Salvar Rascunho
            </Button>
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div className="bg-muted p-4 md:p-8 rounded-lg overflow-auto no-print animate-fadeIn">
          {/* ── Cover Page (separate A4 container) ── */}
          <div className="bg-card shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] mb-8 print:shadow-none print:w-full print:max-w-none print:p-0 text-foreground animate-slideUp" style={a4PageStyle}>
            <div className="flex flex-col items-center min-h-[800px] pb-10 page-break" style={{ justifyContent: config.coverLogoCenterV ? 'center' : 'flex-start' }}>
              {/* Cover-specific logo */}
              {coverLogoSrc && config.coverLogoVisible !== false && (
                <div style={{ marginTop: config.coverLogoCenterV ? 0 : `${mmToPx(config.coverLogoTopMm)}px` }}>
                  <img src={coverLogoSrc} alt="Logo Capa" className="object-contain mx-auto" style={{ width: `${mmToPx(config.coverLogoWidthMm)}px` }} />
                </div>
              )}
              <div className="flex flex-col items-center w-full" style={{ gap: `${config.coverSpacingLogoTitle}px`, lineHeight: config.coverLineSpacing, marginTop: `${config.coverSpacingLogoTitle}px` }}>
                <h2
                  className="uppercase mb-2 w-full"
                  style={{
                    textAlign: coverTitleAlign,
                    fontSize: `${config.coverTitleFontSize}pt`,
                    fontWeight: config.coverTitleBold ? 'bold' : 'normal',
                    fontStyle: config.coverTitleItalic ? 'italic' : 'normal',
                  }}
                >
                  {config.coverTitle || 'Relatório Parcial de Cumprimento do Objeto'}
                </h2>
                {!config.coverHideSubtitle && config.coverSubtitle && (
                  <p className="w-full" style={{ textAlign: coverSubAlign, fontSize: `${config.coverSubtitleFontSize}pt`, marginBottom: `${config.coverSpacingTitleSubtitle}px` }}>
                    {config.coverSubtitle}
                  </p>
                )}
                <h1 className="text-2xl font-bold uppercase mb-4 w-full" style={{ textAlign: coverTitleAlign }}>{project.name}</h1>
                {!config.coverHideFomento && (
                  <h3 className="text-lg w-full" style={{ textAlign: coverFomentoAlign, marginBottom: `${config.coverSpacingSubtitleBottom}px` }}>
                    Termo de Fomento nº {project.fomentoNumber}
                  </h3>
                )}
                {!config.coverHideOrg && (
                  <p className="text-lg font-semibold w-full" style={{ textAlign: coverOrgAlign }}>{project.organizationName}</p>
                )}
              </div>
              <div className="mt-auto">
                <ReportFooter />
              </div>
            </div>
          </div>

          {/* ── Content Pages (each visible section as a separate A4 page) ── */}
          {sections.filter(s => s.isVisible).map((section, idx) => (
            <div key={section.id} className="bg-card shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] mb-8 print:shadow-none print:w-full print:max-w-none print:p-0 text-foreground animate-slideUp relative" style={a4PageStyle}>
              <ReportHeader />
              <ReportPreviewSection section={section} {...previewSectionProps} />
              <div className="absolute bottom-0 left-0 right-0" style={{ padding: `0 ${MR}mm ${MB / 2}mm ${ML}mm` }}>
                <ReportFooter />
              </div>
              {/* Page number */}
              <span className="absolute text-xs text-muted-foreground" style={{ bottom: `${MB / 2}mm`, right: `${MR}mm` }}>{idx + 2}</span>
            </div>
          ))}

          {/* ── Signature Page ── */}
          <div ref={reportRef} className="bg-card shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] mb-8 print:shadow-none print:w-full print:max-w-none print:p-0 text-foreground animate-slideUp relative" style={a4PageStyle}>
            <ReportHeader />
            <div className="mt-16 pt-10 flex flex-col items-center break-inside-avoid">
              <p className="mb-8">Rio de Janeiro, {new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <div className="w-80 border-t border-foreground mb-2 mt-16"></div>
              <p className="font-bold uppercase">Assinatura do Responsável</p>
              <p className="text-sm">{project.organizationName}</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0" style={{ padding: `0 ${MR}mm ${MB / 2}mm ${ML}mm` }}>
              <ReportFooter />
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
