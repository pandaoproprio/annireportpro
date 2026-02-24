import { Project, TeamReport } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  createPdfContext, addPage, ensureSpace, addParagraph, addBulletItem,
  addSectionTitle, addHeaderLine, addFooterAndPageNumbers, addSignatureBlock, FooterInfo,
  parseHtmlToBlocks, loadImage, preloadHeaderImages,
  PAGE_W, ML, CW, MAX_Y, LINE_H, FONT_BODY, FONT_CAPTION,
} from '@/lib/pdfHelpers';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';

interface TeamReportExportData {
  project: Project;
  report: TeamReport;
  visualConfig?: ReportVisualConfig;
}

const formatPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  return `[${startMonth} à ${endMonth}]`;
};

export const exportTeamReportToPdf = async (data: TeamReportExportData): Promise<void> => {
  const { project, report, visualConfig: vc } = data;

  // Preload header images if visual config exists
  const { bannerImg, logoImg, logoSecondaryImg, logoCenterImg } = await preloadHeaderImages(
    vc?.headerBannerUrl, vc?.logo, vc?.logoSecondary, vc?.logoCenter,
  );

  const ctx = createPdfContext();
  
  // Set header config for post-pass rendering
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
    };
  }

  const { pdf } = ctx;

  // Identification bullet (simple label: value)
  const addIdBullet = (label: string, value: string) => {
    ensureSpace(ctx, LINE_H);
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'normal');
    pdf.text('•', ML + 8, ctx.currentY);
    pdf.setFont('times', 'bold');
    pdf.text(label, ML + 14, ctx.currentY);
    const lw = pdf.getTextWidth(label + '  ');
    pdf.setFont('times', 'normal');
    pdf.text(value, ML + 14 + lw, ctx.currentY);
    ctx.currentY += LINE_H;
  };

  // ── Title + Header ──
  const reportTitle = report.reportTitle || 'RELATÓRIO DA EQUIPE DE TRABALHO';
  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const tw = pdf.getTextWidth(reportTitle);
  pdf.text(reportTitle, (PAGE_W - tw) / 2, ctx.currentY);
  ctx.currentY += LINE_H * 2;

  addHeaderLine(ctx, 'Termo de Fomento nº:', project.fomentoNumber);
  addHeaderLine(ctx, 'Projeto:', project.name);
  addHeaderLine(ctx, 'Período de Referência:', formatPeriod(report.periodStart, report.periodEnd));
  ctx.currentY += LINE_H;

  // ── 1. Dados de Identificação ──
  addSectionTitle(ctx, '1. Dados de Identificação');
  addIdBullet('Prestador:', report.providerName || '[Não informado]');
  addIdBullet('Responsável Técnico:', report.responsibleName);
  addIdBullet('Função:', report.functionRole);
  ctx.currentY += LINE_H;

  // ── 2. Relato de Execução ──
  const execTitle = report.executionReportTitle || '2. Relato de Execução da Coordenação do Projeto';
  addSectionTitle(ctx, execTitle);

  const blocks = parseHtmlToBlocks(report.executionReport || '<p>[Nenhum relato informado]</p>');
  for (const block of blocks) {
    if (block.type === 'bullet') addBulletItem(ctx, block.content);
    else addParagraph(ctx, block.content);
  }

  // ── Additional Sections ──
  for (const section of (report.additionalSections || [])) {
    addSectionTitle(ctx, section.title);
    const sBlocks = parseHtmlToBlocks(section.content || '<p>[Nenhum conteúdo]</p>');
    for (const b of sBlocks) {
      if (b.type === 'bullet') addBulletItem(ctx, b.content);
      else addParagraph(ctx, b.content);
    }
  }

  // ── Photos ──
  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0
    ? report.photoCaptions
    : report.photos?.map((url, i) => ({ url, caption: 'Registro fotográfico das atividades realizadas', id: `photo-${i}` })) || [];

  if (photosToExport.length > 0) {
    const isSingle = photosToExport.length === 1;
    const photoW = isSingle ? CW : (CW - 10) / 2;
    const photoH = photoW * 0.75;

    ctx.currentY += LINE_H;
    ensureSpace(ctx, LINE_H + 6 + photoH + 20);
    const attTitle = report.attachmentsTitle || 'Registros Fotográficos';
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(attTitle, ML, ctx.currentY);
    ctx.currentY += LINE_H + 4;

    const COL_GAP = 10;
    const col1X = ML;
    const col2X = ML + photoW + COL_GAP;

    let idx = 0;
    while (idx < photosToExport.length) {
      const rowW = isSingle ? CW : photoW;
      const rowH = rowW * 0.75;

      if (ctx.currentY + rowH + 20 > MAX_Y) addPage(ctx);
      const rowY = ctx.currentY;
      const photosInRow = isSingle ? 1 : 2;

      for (let col = 0; col < photosInRow && idx < photosToExport.length; col++) {
        const photo = photosToExport[idx];
        const x = col === 0 ? col1X : col2X;
        const w = isSingle ? CW : photoW;
        const h = w * 0.75;

        const imgData = await loadImage(photo.url);
        if (imgData) {
          try { pdf.addImage(imgData.data, 'JPEG', x, rowY, w, h); }
          catch (e) { console.warn('Image error:', e); }
        }

        pdf.setFontSize(FONT_CAPTION);
        pdf.setFont('times', 'italic');
        const caption = `Foto ${idx + 1}: ${photo.caption}`;
        const capLines: string[] = pdf.splitTextToSize(caption, w);
        const capY = rowY + h + 4;
        for (let j = 0; j < Math.min(capLines.length, 3); j++) {
          pdf.text(capLines[j], x, capY + j * 4.5);
        }

        idx++;
      }

      ctx.currentY = rowY + rowH + 22;
    }
  }

  // ── Signature ──
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;

  addSignatureBlock(ctx, project.organizationName, dateText, 'Assinatura do responsável legal', [
    { label: 'Nome e cargo: ', value: `${report.responsibleName} - ${report.functionRole}` },
    { label: 'CNPJ: ', value: report.providerDocument || '[Não informado]' },
  ]);

  // ── Footer + page numbers (uses visual config only, no legacy footerText) ──
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
  addFooterAndPageNumbers(ctx, project.organizationName, false, footerInfo);

  // Save
  const memberName = report.responsibleName.replace(/\s+/g, '_');
  pdf.save(`Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
