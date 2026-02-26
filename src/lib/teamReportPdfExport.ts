import { Project, TeamReport } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  createPdfContext, addPage, ensureSpace, addParagraph, addBulletItem, addRichParagraph,
  addSectionTitle, addHeaderLine, addFooterAndPageNumbers, addSignatureBlock, FooterInfo,
  parseHtmlToBlocks, loadImage, preloadHeaderImages, addInlineImage, addGalleryGrid, buildHeaderConfig,
  PAGE_W, ML, CW, MAX_Y, LINE_H, FONT_BODY, FONT_CAPTION,
} from '@/lib/pdfHelpers';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';

interface TeamReportExportData {
  project: Project;
  report: TeamReport;
  visualConfig?: ReportVisualConfig;
  hideInstitutionalFooter?: boolean;
}

const formatPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  return `[${startMonth} à ${endMonth}]`;
};

export const exportTeamReportToPdf = async (data: TeamReportExportData): Promise<void> => {
  const { project, report, visualConfig: vc, hideInstitutionalFooter } = data;

  // Preload header images if visual config exists
  const { bannerImg, logoImg, logoSecondaryImg, logoCenterImg } = await preloadHeaderImages(
    vc?.headerBannerUrl, vc?.logo, vc?.logoSecondary, vc?.logoCenter,
  );

  const ctx = createPdfContext();
  const headerCfg = buildHeaderConfig(vc, { bannerImg, logoImg, logoSecondaryImg, logoCenterImg });
  if (headerCfg) ctx.headerConfig = headerCfg;

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
    if (block.type === 'image' && block.imageSrc) await addInlineImage(ctx, block.imageSrc, block.imageCaption, block.imageWidthPct);
    else if (block.type === 'gallery' && block.galleryImages) await addGalleryGrid(ctx, block.galleryImages, block.galleryColumns);
    else if (block.type === 'bullet') addBulletItem(ctx, block.content);
    else if (block.segments && block.segments.some(s => s.bold || s.italic || s.underline)) addRichParagraph(ctx, block.segments);
    else addParagraph(ctx, block.content);
  }

  // ── Additional Sections ──
  for (const section of (report.additionalSections || [])) {
    addSectionTitle(ctx, section.title);
    const sBlocks = parseHtmlToBlocks(section.content || '<p>[Nenhum conteúdo]</p>');
    for (const b of sBlocks) {
      if (b.type === 'image' && b.imageSrc) await addInlineImage(ctx, b.imageSrc, b.imageCaption, b.imageWidthPct);
      else if (b.type === 'gallery' && b.galleryImages) await addGalleryGrid(ctx, b.galleryImages, b.galleryColumns);
      else if (b.type === 'bullet') addBulletItem(ctx, b.content);
      else if (b.segments && b.segments.some(s => s.bold || s.italic || s.underline)) addRichParagraph(ctx, b.segments);
      else addParagraph(ctx, b.content);
    }
  }

  // ── Photos ──
  const photosRaw = report.photoCaptions && report.photoCaptions.length > 0
    ? report.photoCaptions
    : report.photos?.map((url, i) => ({ url, caption: 'Registro fotográfico das atividades realizadas', id: `photo-${i}` })) || [];

  // Pre-load all images and filter out failures
  const loadedPhotosMap: Map<string, { url: string; caption: string; imgData: { data: string; width: number; height: number } }> = new Map();
  for (const photo of photosRaw) {
    const imgData = await loadImage(photo.url);
    if (imgData) {
      loadedPhotosMap.set(photo.id, { url: photo.url, caption: photo.caption || '', imgData });
    } else {
      console.warn('Skipping photo that failed to load:', photo.url);
    }
  }

  const groups = report.photoGroups || [];
  const groupedIds = new Set(groups.flatMap(g => g.photoIds));
  const ungroupedPhotos = photosRaw.filter(p => !groupedIds.has(p.id));
  const hasPhotos = loadedPhotosMap.size > 0;

  if (hasPhotos) {
    const attTitle = report.attachmentsTitle || 'Registros Fotográficos';
    const COL_GAP = 10;
    const colW = (CW - COL_GAP) / 2;

    // Ensure title + first row stay together
    ctx.currentY += LINE_H;
    const firstH = colW * 0.75;
    ensureSpace(ctx, LINE_H + 6 + firstH + 20);

    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(attTitle, ML, ctx.currentY);
    ctx.currentY += LINE_H + 4;

    const col1X = ML;
    const col2X = ML + colW + COL_GAP;

    // Helper to render a set of photos with optional shared caption
    const renderPhotoSet = (photoIds: string[], sharedCaption?: string) => {
      const photos = photoIds
        .map(id => loadedPhotosMap.get(id))
        .filter(Boolean) as { url: string; caption: string; imgData: { data: string; width: number; height: number } }[];
      
      if (photos.length === 0) return;

      let idx = 0;
      while (idx < photos.length) {
        const remaining = photos.length - idx;
        const isFullWidth = remaining === 1;
        const w = isFullWidth ? CW : colW;
        const h = w * 0.75;

        // Pre-calculate caption height to include in space check
        let estimatedCapH = 0;
        if (!sharedCaption) {
          pdf.setFontSize(FONT_CAPTION);
          if (isFullWidth) {
            const capLines: string[] = pdf.splitTextToSize(photos[idx].caption || '', w);
            estimatedCapH = capLines.length * 4.5 + 4;
          } else {
            // Estimate max caption height from the two photos in this row
            for (let ci = 0; ci < 2 && idx + ci < photos.length; ci++) {
              const capLines: string[] = pdf.splitTextToSize(photos[idx + ci].caption || '', w);
              estimatedCapH = Math.max(estimatedCapH, capLines.length * 4.5 + 4);
            }
          }
        }

        if (ctx.currentY + h + estimatedCapH + 6 > MAX_Y) addPage(ctx);
        const rowY = ctx.currentY;

        if (isFullWidth) {
          const photo = photos[idx];
          try { pdf.addImage(photo.imgData.data, 'JPEG', col1X, rowY, w, h); }
          catch (e) { console.warn('Image error:', e); }

          if (!sharedCaption) {
            pdf.setFontSize(FONT_CAPTION);
            pdf.setFont('times', 'italic');
            const capLines: string[] = pdf.splitTextToSize(photo.caption || '', w);
            const capY = rowY + h + 4;
            for (let j = 0; j < capLines.length; j++) {
              pdf.text(capLines[j], col1X, capY + j * 4.5);
            }
            ctx.currentY = rowY + h + 4 + capLines.length * 4.5 + 6;
          } else {
            ctx.currentY = rowY + h + 6;
          }
          idx++;
        } else {
          let maxCapH = 0;
          for (let col = 0; col < 2 && idx < photos.length; col++) {
            const photo = photos[idx];
            const x = col === 0 ? col1X : col2X;

            try { pdf.addImage(photo.imgData.data, 'JPEG', x, rowY, w, h); }
            catch (e) { console.warn('Image error:', e); }

            if (!sharedCaption) {
              pdf.setFontSize(FONT_CAPTION);
              pdf.setFont('times', 'italic');
              const capLines: string[] = pdf.splitTextToSize(photo.caption || '', w);
              const capY = rowY + h + 4;
              for (let j = 0; j < capLines.length; j++) {
                pdf.text(capLines[j], x, capY + j * 4.5);
              }
              maxCapH = Math.max(maxCapH, capLines.length * 4.5);
            }
            idx++;
          }
          ctx.currentY = rowY + h + 4 + (maxCapH > 0 ? maxCapH + 6 : 6);
        }
      }

      // Render shared caption after the group
      if (sharedCaption) {
        pdf.setFontSize(FONT_CAPTION);
        pdf.setFont('times', 'italic');
        const capLines: string[] = pdf.splitTextToSize(sharedCaption, CW);
        for (let j = 0; j < capLines.length; j++) {
          const lineW = pdf.getTextWidth(capLines[j]);
          const capX = ML + (CW - lineW) / 2;
          pdf.text(capLines[j], capX, ctx.currentY + j * 4.5);
        }
        ctx.currentY += capLines.length * 4.5 + 6;
      }
    };

    // Render grouped photos first
    for (const group of groups) {
      renderPhotoSet(group.photoIds, group.caption);
    }

    // Render ungrouped photos with individual captions
    if (ungroupedPhotos.length > 0) {
      renderPhotoSet(ungroupedPhotos.map(p => p.id));
    }
  }

  // ── Signature ──
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;

  addSignatureBlock(ctx, project.organizationName, dateText, 'Assinatura do responsável legal', [
    { label: 'Nome e cargo: ', value: `${report.responsibleName} - ${report.functionRole}` },
    { label: 'CNPJ: ', value: report.providerDocument || '[Não informado]' },
  ]);

  // ── Footer + page numbers ──
  const footerInfo: FooterInfo = {
    orgName: project.organizationName,
    address: (vc?.footerShowAddress !== false) ? project.organizationAddress : undefined,
    website: (vc?.footerShowContact !== false) ? project.organizationWebsite : undefined,
    email: (vc?.footerShowContact !== false) ? project.organizationEmail : undefined,
    phone: (vc?.footerShowContact !== false) ? project.organizationPhone : undefined,
    customText: vc?.footerText || undefined,
    alignment: (vc?.footerAlignment || 'center') as 'left' | 'center' | 'right',
    institutionalEnabled: hideInstitutionalFooter ? false : (vc?.footerInstitutionalEnabled !== false),
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
