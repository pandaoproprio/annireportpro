import { Project } from '@/types';
import { JustificationReport } from '@/types/justificationReport';
import {
  createPdfContext, ensureSpace, addParagraph, addBulletItem, addRichParagraph,
  addSectionTitle, addHeaderLine, addFooterAndPageNumbers, addSignatureBlock, FooterInfo,
  parseHtmlToBlocks, preloadHeaderImages, addInlineImage,
  PAGE_W, CW, LINE_H,
} from '@/lib/pdfHelpers';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';

interface JustificationExportData {
  project: Project;
  report: JustificationReport;
  visualConfig?: ReportVisualConfig;
}

const sectionDefs = [
  { key: 'objectSection', title: '1. DO OBJETO DO TERMO ADITIVO' },
  { key: 'justificationSection', title: '2. DA JUSTIFICATIVA PARA A PRORROGAÇÃO' },
  { key: 'executedActionsSection', title: '3. DAS AÇÕES JÁ EXECUTADAS (RESULTADOS PARCIAIS)' },
  { key: 'futureActionsSection', title: '4. DAS AÇÕES FUTURAS PREVISTAS NO PERÍODO DE PRORROGAÇÃO' },
  { key: 'requestedDeadlineSection', title: '5. DO PRAZO SOLICITADO' },
  { key: 'attachmentsSection', title: '6. ANEXOS' },
] as const;

export const exportJustificationToPdf = async (data: JustificationExportData) => {
  const { project, report, visualConfig: vc } = data;

  // Preload header images if visual config exists
  const { bannerImg, logoImg, logoSecondaryImg, logoCenterImg } = await preloadHeaderImages(
    vc?.headerBannerUrl, vc?.logo, vc?.logoSecondary, vc?.logoCenter,
  );

  const ctx = createPdfContext();
  
  if (vc && (bannerImg || logoImg || logoCenterImg || logoSecondaryImg)) {
    ctx.headerConfig = {
      bannerImg, bannerHeightMm: vc.headerBannerHeightMm, bannerFit: vc.headerBannerFit, bannerVisible: vc.headerBannerVisible,
      logoImg, logoSecondaryImg, logoCenterImg,
      headerLeftText: vc.headerLeftText, headerRightText: vc.headerRightText,
      logoVisible: vc.logoConfig?.visible,
      logoCenterVisible: vc.logoCenterConfig?.visible,
      logoSecondaryVisible: vc.logoSecondaryConfig?.visible,
      logoWidthMm: vc.logoConfig?.widthMm,
      logoCenterWidthMm: vc.logoCenterConfig?.widthMm,
      logoSecondaryWidthMm: vc.logoSecondaryConfig?.widthMm,
      logoAlignment: vc.headerLogoAlignment,
      logoGapMm: vc.headerLogoGap,
      topPaddingMm: vc.headerTopPadding,
      headerHeightMm: vc.headerHeight,
      contentSpacingMm: vc.headerContentSpacing,
    };
  }

  const { pdf } = ctx;

  // ── Title (centered, 16pt bold) ──
  pdf.setFont('times', 'bold');
  pdf.setFontSize(16);
  const titleLines = pdf.splitTextToSize('JUSTIFICATIVA PARA PRORROGAÇÃO DE PRAZO DO PROJETO', CW);
  for (const line of titleLines) {
    pdf.text(line, PAGE_W / 2, ctx.currentY, { align: 'center' });
    ctx.currentY += 8;
  }
  ctx.currentY += 6;

  // ── Header info ──
  addHeaderLine(ctx, 'Projeto:', project.name);
  addHeaderLine(ctx, 'Termo de Fomento nº:', project.fomentoNumber);
  addHeaderLine(ctx, 'Organização:', project.organizationName);
  ctx.currentY += 6;

  // ── Addressee ──
  addParagraph(ctx, `Ao ${project.funder},`);
  ctx.currentY += 6;

  // ── Sections ──
  for (const section of sectionDefs) {
    ensureSpace(ctx, 20);
    addSectionTitle(ctx, section.title);
    const blocks = parseHtmlToBlocks(report[section.key]);
    for (const block of blocks) {
      if (block.type === 'image' && block.imageSrc) await addInlineImage(ctx, block.imageSrc, block.imageCaption, block.imageWidthPct);
      else if (block.type === 'bullet') addBulletItem(ctx, block.content);
      else if (block.segments && block.segments.some(s => s.bold || s.italic || s.underline)) addRichParagraph(ctx, block.segments);
      else addParagraph(ctx, block.content);
    }
    ctx.currentY += 4;
  }

  // ── Signature ──
  ctx.currentY += 15;
  ensureSpace(ctx, 50);
  const currentDate = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  const dateText = `Rio de Janeiro, ${currentDate}.`;
  addSignatureBlock(ctx, project.organizationName, dateText, 'Assinatura do responsável legal');

  // ── Footer + page numbers (skip page 1) ──
  const footerInfo: FooterInfo = {
    orgName: project.organizationName,
    address: (vc?.footerShowAddress !== false) ? project.organizationAddress : undefined,
    website: (vc?.footerShowContact !== false) ? project.organizationWebsite : undefined,
    email: (vc?.footerShowContact !== false) ? project.organizationEmail : undefined,
    phone: (vc?.footerShowContact !== false) ? project.organizationPhone : undefined,
    customText: vc?.footerText || undefined,
    alignment: (vc?.footerAlignment || 'center') as 'left' | 'center' | 'right',
    institutionalEnabled: vc?.footerInstitutionalEnabled,
    line1Text: vc?.footerLine1Text,
    line1FontSize: vc?.footerLine1FontSize,
    line2Text: vc?.footerLine2Text,
    line2FontSize: vc?.footerLine2FontSize,
    line3Text: vc?.footerLine3Text,
    line3FontSize: vc?.footerLine3FontSize,
    lineSpacing: vc?.footerLineSpacing,
    topSpacing: vc?.footerTopSpacing,
  };
  addFooterAndPageNumbers(ctx, project.organizationName, true, footerInfo);

  // Save
  const filename = `Justificativa_Prorrogacao_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};
