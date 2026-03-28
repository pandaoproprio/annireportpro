import { Project, Activity, ActivityType, ExpenseItem, ReportSection, ReportPhotoMeta, PhotoGroup } from '@/types';
import { PageLayout } from '@/types/imageLayout';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  createPdfContext, addPage, ensureSpace, addParagraph, addBulletItem, addRichParagraph,
  addSectionTitle, addFooterAndPageNumbers, addSignatureBlock, FooterInfo,
  loadImage, addPhotoGrid, addPhotoLayout, parseHtmlToBlocks, addInlineImage, addGalleryGrid, PdfContext,
  preloadHeaderImages, buildHeaderConfig,
  PAGE_W, PAGE_H, ML, MR, CW, MAX_Y, LINE_H, FONT_BODY, FONT_CAPTION, MT,
} from '@/lib/pdfHelpers';
import {
  getActiveActivities,
  hasAttachmentLinks,
  normalizeLinkTargets,
  resolveLinkDisplayName,
} from './reportPdfExportUtils';

export interface ReportPdfExportData {
  project: Project;
  activities: Activity[];
  sections: ReportSection[];
  objectText: string;
  summary: string;
  goalNarratives: Record<string, string>;
  goalPhotos: Record<string, string[]>;
  otherActionsNarrative: string;
  otherActionsPhotos: string[];
  communicationNarrative: string;
  communicationPhotos: string[];
  satisfaction: string;
  futureActions: string;
  expenses: ExpenseItem[];
  links: { attendance: string; registration: string; media: string };
  linkDisplayNames?: { attendance: string; registration: string; media: string };
  sectionPhotos?: Record<string, string[]>;
  photoMetadata?: Record<string, ReportPhotoMeta[]>;
  visualConfig?: ReportVisualConfig;
  pageLayouts?: Record<string, PageLayout>;
  sectionPhotoGroups?: Record<string, PhotoGroup[]>;
  selectedVideoUrls?: string[];
}

const formatActivityDate = (date: string, endDate?: string) => {
  const start = new Date(date).toLocaleDateString('pt-BR');
  if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
  return start;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeExpensePhotoUrl = (value: unknown): string | null => {
  if (isNonEmptyString(value)) return value.trim();

  if (!value || typeof value !== 'object') return null;

  const media = value as Record<string, unknown>;
  const mediaType = typeof media.type === 'string'
    ? media.type.toLowerCase()
    : typeof media.mimeType === 'string'
      ? media.mimeType.toLowerCase()
      : '';

  const candidate = [media.url, media.src, media.publicUrl, media.fileUrl, media.path].find(isNonEmptyString);
  if (!candidate) return null;

  if (!mediaType || mediaType === 'image' || mediaType.startsWith('image/')) {
    return candidate.trim();
  }

  return null;
};

const extractExpensePhotoUrls = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap(extractExpensePhotoUrls);
  }

  const directUrl = normalizeExpensePhotoUrl(value);
  if (directUrl) return [directUrl];

  if (typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  return [
    ...extractExpensePhotoUrls(record.fotos),
    ...extractExpensePhotoUrls(record.photos),
    ...extractExpensePhotoUrls(record.images),
    ...extractExpensePhotoUrls(record.midias),
    ...extractExpensePhotoUrls(record.registroFotografico),
    ...extractExpensePhotoUrls(record.registro_fotografico),
    ...extractExpensePhotoUrls(record.itens),
    ...extractExpensePhotoUrls(record.items),
  ];
};

const collectExpensePhotos = (expense: ExpenseItem): string[] => {
  const rawExpense = expense as ExpenseItem & Record<string, unknown>;
  return Array.from(new Set([
    ...extractExpensePhotoUrls(rawExpense.image),
    ...extractExpensePhotoUrls(rawExpense.images),
    ...extractExpensePhotoUrls(rawExpense.fotos),
    ...extractExpensePhotoUrls(rawExpense.photos),
    ...extractExpensePhotoUrls(rawExpense.midias),
    ...extractExpensePhotoUrls(rawExpense.registroFotografico),
    ...extractExpensePhotoUrls(rawExpense.registro_fotografico),
  ]));
};

// addHeader removed — headers are now rendered in the post-pass via addFooterAndPageNumbers

export const exportReportToPdf = async (data: ReportPdfExportData): Promise<void> => {
  const {
    project, activities, sections, objectText, summary,
    goalNarratives, goalPhotos,
    otherActionsNarrative, otherActionsPhotos,
    communicationNarrative, communicationPhotos,
    satisfaction, futureActions, expenses, links,
    sectionPhotos = {},
    photoMetadata = {},
    visualConfig: vc,
    pageLayouts = {},
    sectionPhotoGroups = {},
    selectedVideoUrls = [],
  } = data;

  const activeActivities = getActiveActivities(activities);
  const attachmentTargets = {
    attendance: normalizeLinkTargets(links.attendance),
    registration: normalizeLinkTargets(links.registration),
    media: normalizeLinkTargets(links.media, selectedVideoUrls),
  };

  // Extract visual config values with defaults
  const customCoverTitle = vc?.coverTitle;
  const coverSubtitle = vc?.coverHideSubtitle ? undefined : vc?.coverSubtitle;
  const headerBannerUrl = vc?.headerBannerUrl;
  const headerLeftText = vc?.headerLeftText;
  const headerRightText = vc?.headerRightText;
  const logo = vc?.logo;
  const logoSecondary = vc?.logoSecondary;
  const logoCenter = vc?.logoCenter;
  const footerText = vc?.footerText;
  const footerShowAddress = vc?.footerShowAddress ?? true;
  const footerShowContact = vc?.footerShowContact ?? true;
  const footerAlignment = vc?.footerAlignment;

  // ── Preload header images once for reuse on ALL pages ──
  const { bannerImg, logoImg, logoSecondaryImg, logoCenterImg } = await preloadHeaderImages(
    headerBannerUrl, logo, logoSecondary, logoCenter,
  );

  const ctx = createPdfContext();
  // Store header config in context so the post-pass renders it on every page (except cover)
  // NOTE: Do NOT set headerConfig yet — the cover page calculates its own Y position.
  // We set it AFTER the cover page so addPage() uses correct content start Y.
  const { pdf } = ctx;

  // Helper to render HTML content from rich-text editor (preserves bold/italic)
  const writeHtmlContent = async (html: string, fallback: string) => {
    const blocks = parseHtmlToBlocks(html || fallback);
    for (const block of blocks) {
      if (block.type === 'image' && block.imageSrc) await addInlineImage(ctx, block.imageSrc, block.imageCaption, block.imageWidthPct);
      else if (block.type === 'gallery' && block.galleryImages) await addGalleryGrid(ctx, block.galleryImages, block.galleryColumns);
      else if (block.type === 'bullet') addBulletItem(ctx, block.content);
      else if (block.segments && block.segments.some(s => s.bold || s.italic || s.underline)) {
        addRichParagraph(ctx, block.segments);
      } else {
        addParagraph(ctx, block.content);
      }
    }
  };

  // Sub-section title (bold, normal case) — specific to this report
  const addSubSectionTitle = (title: string) => {
    ensureSpace(ctx, LINE_H * 2);
    ctx.currentY += 2;
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(title, ML, ctx.currentY);
    ctx.currentY += LINE_H + 2;
  };

  // Helper: render photos using layout if available, otherwise fallback to grid
  const renderPhotos = async (photos: string[], sectionKey: string, label: string, captions?: string[], groups?: PhotoGroup[]) => {
    if (photos.length === 0) return;
    const layout = pageLayouts[sectionKey];
    if (layout && layout.images && layout.images.length > 0) {
      await addPhotoLayout(ctx, layout, label);
      return;
    }

    addSectionTitle(ctx, `REGISTROS FOTOGRÁFICOS – ${label.toUpperCase()}`);
    await addPhotoGrid(ctx, photos, '', captions, groups);
  };

  const renderExpensePhotoDocumentation = async (
    groupedPhotoUrls: string[],
    groupedCaptions: string[],
    groups: PhotoGroup[],
    extraSectionPhotoUrls: string[],
    extraSectionCaptions: string[],
  ) => {
    if (groupedPhotoUrls.length === 0 && extraSectionPhotoUrls.length === 0) return;

    addSectionTitle(ctx, 'REGISTROS FOTOGRÁFICOS – COMPROVAÇÃO DA EXECUÇÃO DOS ITENS DE DESPESA');

    const renderGalleryItems = async (items: { src: string; caption: string }[]) => {
      if (items.length === 0) return;
      await addGalleryGrid(ctx, items, 2);
    };

    if (groups.length > 0) {
      const groupedIndices = new Set(groups.flatMap((group) => group.photoIds.map(Number)));

      for (const group of groups) {
        const items = group.photoIds
          .map(Number)
          .filter((index) => index >= 0 && index < groupedPhotoUrls.length)
          .map((index) => ({
            src: groupedPhotoUrls[index],
            caption: groupedCaptions[index] || `Foto ${index + 1}`,
          }));

        if (items.length === 0) continue;
        addSubSectionTitle(group.caption);
        await renderGalleryItems(items);
      }

      const ungroupedItems = groupedPhotoUrls
        .map((src, index) => ({ src, caption: groupedCaptions[index] || `Foto ${index + 1}`, index }))
        .filter((item) => !groupedIndices.has(item.index))
        .map(({ src, caption }) => ({ src, caption }));

      await renderGalleryItems(ungroupedItems);
    } else {
      await renderGalleryItems(
        groupedPhotoUrls.map((src, index) => ({
          src,
          caption: groupedCaptions[index] || `Foto ${index + 1}`,
        })),
      );
    }

    if (extraSectionPhotoUrls.length > 0) {
      if (groupedPhotoUrls.length > 0) addSubSectionTitle('Registros complementares');
      await renderGalleryItems(
        extraSectionPhotoUrls.map((src, index) => ({
          src,
          caption: extraSectionCaptions[index] || `Foto complementar ${index + 1}`,
        })),
      );
    }
  };

  // Activity entry
  const addActivityEntry = (act: Activity) => {
    const datePart = formatActivityDate(act.date, act.endDate);
    const locationPart = act.location ? ` – ${act.location}` : '';
    const attendeesPart = act.attendeesCount > 0 ? ` – ${act.attendeesCount} participantes` : '';
    addBulletItem(ctx, `${datePart}${locationPart}${attendeesPart}`);

    if (act.description) {
      pdf.setFontSize(FONT_BODY);
      pdf.setFont('times', 'normal');
      const descLines: string[] = pdf.splitTextToSize(act.description, CW - 12);
      for (const line of descLines) {
        ensureSpace(ctx, LINE_H);
        pdf.text(line, ML + 12, ctx.currentY, { maxWidth: CW - 12, align: 'justify' });
        ctx.currentY += LINE_H;
      }
      ctx.currentY += 1;
    }
  };

  // ── Activity filter helpers ──
  const getActivitiesByGoal = (goalId: string) =>
    activeActivities.filter(a => a.goalId === goalId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCommunicationActivities = () =>
    activeActivities.filter(a => a.type === ActivityType.COMUNICACAO).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOtherActivities = () =>
    activeActivities.filter(a => a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO || a.type === ActivityType.OCORRENCIA)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ══════════════════════════════════════════════════════════════
  // COVER PAGE
  // ══════════════════════════════════════════════════════════════

  const coverTitleFontSize = vc?.coverTitleFontSize ?? 16;
  const coverTitleBold = vc?.coverTitleBold ?? true;
  const coverTitleItalic = vc?.coverTitleItalic ?? false;
  const coverTitleAlign = vc?.coverTitleAlignment ?? 'center';
  const coverSubFontSize = vc?.coverSubtitleFontSize ?? 12;
  const coverSubAlign = vc?.coverSubtitleAlignment ?? 'center';
  const coverOrgAlign = vc?.coverOrgAlignment ?? 'center';
  const coverFomentoAlign = vc?.coverFomentoAlignment ?? 'center';
  const coverSpacingLT = vc?.coverSpacingLogoTitle ?? 10;
  const coverSpacingTS = vc?.coverSpacingTitleSubtitle ?? 8;
  const coverSpacingSB = vc?.coverSpacingSubtitleBottom ?? 20;
  const coverLineH = (vc?.coverLineSpacing ?? 1.5) * 4.8; // approximate mm per line

  // Cover logo — dedicated coverLogo or fallback to primary header logo
  const coverLogoWidthMm = vc?.coverLogoWidthMm ?? 40;
  const coverLogoTopMm = vc?.coverLogoTopMm ?? 30;
  const coverLogoCenterV = vc?.coverLogoCenterV ?? false;
  const coverLogoVisible = vc?.coverLogoVisible !== false;

  // Load cover logo if dedicated one exists, otherwise use header logo
  let coverLogoImg = logoImg;
  if (vc?.coverLogo) {
    coverLogoImg = await loadImage(vc.coverLogo);
  }

  if (coverLogoImg && coverLogoVisible) {
    const aspect = coverLogoImg.width / coverLogoImg.height;
    const drawW = coverLogoWidthMm;
    const drawH = drawW / aspect;
    const drawX = (PAGE_W - drawW) / 2;
    const drawY = coverLogoCenterV ? (PAGE_H / 2 - 60) : coverLogoTopMm;
    try { pdf.addImage(coverLogoImg.data, 'JPEG', drawX, drawY, drawW, drawH); } catch (e) { console.warn('Cover logo error:', e); }
    ctx.currentY = drawY + drawH + coverSpacingLT;
  } else {
    ctx.currentY = coverLogoCenterV ? (PAGE_H / 2 - 40) : (coverLogoTopMm + coverSpacingLT);
  }

  const coverTitle = customCoverTitle || 'RELATÓRIO PARCIAL DE CUMPRIMENTO DO OBJETO';
  pdf.setFontSize(coverTitleFontSize);
  pdf.setFont('times', coverTitleBold ? 'bold' : 'normal');
  if (coverTitleItalic) pdf.setFont('times', 'bolditalic');
  const titleLines: string[] = pdf.splitTextToSize(coverTitle.toUpperCase(), CW);
  const getAlignX = (tw: number, align: string) => {
    if (align === 'left') return ML;
    if (align === 'right') return PAGE_W - MR - tw;
    return (PAGE_W - tw) / 2;
  };
  for (const line of titleLines) {
    const tw = pdf.getTextWidth(line);
    pdf.text(line, getAlignX(tw, coverTitleAlign), ctx.currentY);
    ctx.currentY += coverLineH + 2;
  }
  ctx.currentY += coverSpacingLT;

  if (coverSubtitle) {
    pdf.setFontSize(coverSubFontSize);
    pdf.setFont('times', 'normal');
    const subLines: string[] = pdf.splitTextToSize(coverSubtitle, CW);
    for (const line of subLines) {
      const sw = pdf.getTextWidth(line);
      pdf.text(line, getAlignX(sw, coverSubAlign), ctx.currentY);
      ctx.currentY += coverLineH;
    }
    ctx.currentY += coverSpacingTS;
  }

  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const nameLines: string[] = pdf.splitTextToSize(project.name.toUpperCase(), CW);
  for (const line of nameLines) {
    const lw = pdf.getTextWidth(line);
    pdf.text(line, getAlignX(lw, coverTitleAlign), ctx.currentY);
    ctx.currentY += coverLineH + 2;
  }
  ctx.currentY += coverSpacingTS;

  if (!vc?.coverHideFomento) {
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'normal');
    const fomentoText = `Termo de Fomento nº ${project.fomentoNumber}`;
    const ftw = pdf.getTextWidth(fomentoText);
    pdf.text(fomentoText, getAlignX(ftw, coverFomentoAlign), ctx.currentY);
    ctx.currentY += coverSpacingSB;
  }

  if (!vc?.coverHideOrg) {
    pdf.setFontSize(14);
    pdf.setFont('times', 'bold');
    const orgw = pdf.getTextWidth(project.organizationName);
    pdf.text(project.organizationName, getAlignX(orgw, coverOrgAlign), ctx.currentY);
  }

  // ══════════════════════════════════════════════════════════════
  // CONTENT PAGES — now set headerConfig so addPage() adjusts Y
  // ══════════════════════════════════════════════════════════════
  const headerCfg = buildHeaderConfig({ ...vc, headerRenderMode: 'all-pages' }, { bannerImg, logoImg, logoSecondaryImg, logoCenterImg });
  if (headerCfg) ctx.headerConfig = headerCfg;
  addPage(ctx);

  const renderLinkedRow = (label: string, displayText: string, url: string) => {
    const labelText = `${label}: `;
    ensureSpace(ctx, LINE_H * 2);
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(labelText, ML, ctx.currentY);

    const labelWidth = pdf.getTextWidth(labelText);
    pdf.setFont('times', 'normal');
    const lines: string[] = pdf.splitTextToSize(displayText, CW - labelWidth);

    for (const line of lines) {
      ensureSpace(ctx, LINE_H);
      const x = ML + labelWidth;
      pdf.text(line, x, ctx.currentY);
      pdf.link(x, ctx.currentY - LINE_H * 0.7, pdf.getTextWidth(line), LINE_H, { url });
      ctx.currentY += LINE_H;
    }
  };

  const renderLinkBulletList = (label: string, urls: string[], customDisplayName?: string) => {
    ensureSpace(ctx, LINE_H * 2);
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(`${label}:`, ML, ctx.currentY);
    ctx.currentY += LINE_H;

    pdf.setFont('times', 'normal');
    urls.forEach((url, index) => {
      const displayText = resolveLinkDisplayName('media', urls.length === 1 ? customDisplayName : undefined, index);
      const lines: string[] = pdf.splitTextToSize(displayText, CW - 10);

      lines.forEach((line, lineIndex) => {
        ensureSpace(ctx, LINE_H);
        if (lineIndex === 0) pdf.text('•', ML + 4, ctx.currentY);
        const x = ML + 8;
        pdf.text(line, x, ctx.currentY);
        pdf.link(x, ctx.currentY - LINE_H * 0.7, pdf.getTextWidth(line), LINE_H, { url });
        ctx.currentY += LINE_H;
      });
    });
  };

  const renderedPhotoKeys = new Set<string>();

  for (const section of sections) {
    if (!section.isVisible) continue;
    if (section.key === 'links' && !hasAttachmentLinks(attachmentTargets)) continue;

    addSectionTitle(ctx, section.title);

    switch (section.key) {
      case 'object':
        addParagraph(ctx, objectText || '[Descrição do objeto]');
        break;

      case 'summary':
        await writeHtmlContent(summary, '[Resumo das atividades]');
        break;

      case 'goals':
        for (const goal of project.goals) {
          const goalActs = getActivitiesByGoal(goal.id);
          addSubSectionTitle(goal.title);
          await writeHtmlContent(goalNarratives[goal.id], '[Descreva as realizações da meta]');

          if (goalActs.length > 0) {
            ctx.currentY += 2;
            pdf.setFontSize(FONT_BODY);
            pdf.setFont('times', 'bold');
            ensureSpace(ctx, LINE_H);
            pdf.text('Atividades realizadas:', ML, ctx.currentY);
            ctx.currentY += LINE_H;
            pdf.setFont('times', 'normal');

            for (const act of goalActs) {
              addActivityEntry(act);
            }
          }

          const gPhotos = goalPhotos[goal.id] || [];
          const actPhotos = goalActs.flatMap(a => a.photos || []);
          const allGoalPhotos = [...gPhotos, ...actPhotos];
          if (allGoalPhotos.length > 0) {
            const goalMetas = photoMetadata[goal.id] || [];
            const captions = allGoalPhotos.map((_, i) => goalMetas[i]?.caption || `Foto ${i + 1}`);
            await renderPhotos(allGoalPhotos, goal.id, goal.title, captions, sectionPhotoGroups[goal.id]);
            renderedPhotoKeys.add(goal.id);
          }
        }
        break;

      case 'other': {
        const otherActs = getOtherActivities();
        await writeHtmlContent(otherActionsNarrative, '[Outras informações sobre as ações desenvolvidas]');

        const otherPhotosAll = [...otherActionsPhotos, ...otherActs.flatMap(a => a.photos || [])];
        if (otherPhotosAll.length > 0) {
          const otherMetas = photoMetadata['other'] || [];
          const captions = otherPhotosAll.map((_, i) => otherMetas[i]?.caption || `Foto ${i + 1}`);
          await renderPhotos(otherPhotosAll, 'other', 'OUTRAS AÇÕES', captions, sectionPhotoGroups['other']);
          renderedPhotoKeys.add('other');
        }
        break;
      }

      case 'communication': {
        const commActs = getCommunicationActivities();
        await writeHtmlContent(communicationNarrative, '[Publicações e ações de divulgação]');

        if (commActs.length > 0) {
          ctx.currentY += 2;
          pdf.setFontSize(FONT_BODY);
          pdf.setFont('times', 'bold');
          ensureSpace(ctx, LINE_H);
          pdf.text('Atividades de divulgação:', ML, ctx.currentY);
          ctx.currentY += LINE_H;
          pdf.setFont('times', 'normal');

          for (const act of commActs) {
            addBulletItem(ctx, `${formatActivityDate(act.date)}: ${act.description}`);
          }
        }

        const commPhotosAll = [...communicationPhotos, ...commActs.flatMap(a => a.photos || [])];
        if (commPhotosAll.length > 0) {
          const commMetas = photoMetadata['communication'] || [];
          const captions = commPhotosAll.map((_, i) => commMetas[i]?.caption || `Foto ${i + 1}`);
          await renderPhotos(commPhotosAll, 'communication', 'PUBLICAÇÕES E DIVULGAÇÃO', captions, sectionPhotoGroups['communication']);
          renderedPhotoKeys.add('communication');
        }
        break;
      }

      case 'satisfaction':
        await writeHtmlContent(satisfaction, '[Grau de satisfação do público-alvo]');
        break;

      case 'future':
        await writeHtmlContent(futureActions, '[Sobre as ações futuras]');
        break;

      case 'expenses':
        if (expenses.length > 0) {
          const colW1 = CW * 0.22;
          const colW2 = CW * 0.50;
          const colW3 = CW - colW1 - colW2;
          const headerRowH = LINE_H + 3;
          const expensePhotoUrls: string[] = [];
          const expensePhotoCaptions: string[] = [];
          const expensePhotoGroups: PhotoGroup[] = [];
          const expenseSectionKey = sectionPhotos[section.key] ? section.key : section.id;
          const extraExpensePhotos = sectionPhotos[section.key] || sectionPhotos[section.id] || [];
          const extraExpenseMetas = photoMetadata[expenseSectionKey] || [];

          ensureSpace(ctx, headerRowH * 2);

          pdf.setFillColor(224, 224, 224);
          pdf.rect(ML, ctx.currentY - 5, colW1, headerRowH, 'F');
          pdf.rect(ML + colW1, ctx.currentY - 5, colW2, headerRowH, 'F');
          pdf.rect(ML + colW1 + colW2, ctx.currentY - 5, colW3, headerRowH, 'F');
          pdf.setDrawColor(0);
          pdf.rect(ML, ctx.currentY - 5, colW1, headerRowH, 'S');
          pdf.rect(ML + colW1, ctx.currentY - 5, colW2, headerRowH, 'S');
          pdf.rect(ML + colW1 + colW2, ctx.currentY - 5, colW3, headerRowH, 'S');

          pdf.setFontSize(11);
          pdf.setFont('times', 'bold');
          pdf.text('Item de Despesa', ML + 3, ctx.currentY);
          pdf.text('Descrição de Uso', ML + colW1 + 3, ctx.currentY);
          pdf.text('Registro Fotográfico', ML + colW1 + colW2 + 3, ctx.currentY);
          ctx.currentY += headerRowH;

          pdf.setFont('times', 'normal');
          for (const exp of expenses) {
            const item = exp.itemName || '-';
            const desc = exp.description || '-';
            const photos = collectExpensePhotos(exp);
            const itemLines: string[] = pdf.splitTextToSize(item, colW1 - 6);
            const descLines: string[] = pdf.splitTextToSize(desc, colW2 - 6);
            const textHeight = Math.max(itemLines.length, descLines.length) * LINE_H + 4;
            const thumbPadding = 2;
            const thumbMaxW = colW3 - thumbPadding * 2;
            const thumbMaxH = 24;
            const cellH = Math.max(textHeight, photos.length > 0 ? thumbMaxH + thumbPadding * 2 : LINE_H + 4);

            ensureSpace(ctx, cellH);

            pdf.rect(ML, ctx.currentY - 5, colW1, cellH, 'S');
            pdf.rect(ML + colW1, ctx.currentY - 5, colW2, cellH, 'S');
            pdf.rect(ML + colW1 + colW2, ctx.currentY - 5, colW3, cellH, 'S');

            for (let i = 0; i < itemLines.length; i++) {
              pdf.text(itemLines[i], ML + 3, ctx.currentY + i * LINE_H);
            }
            for (let i = 0; i < descLines.length; i++) {
              pdf.text(descLines[i], ML + colW1 + 3, ctx.currentY + i * LINE_H);
            }

            if (photos.length > 0) {
              const thumbImage = await loadImage(photos[0]);
              if (thumbImage) {
                const aspect = thumbImage.width / thumbImage.height;
                let drawW = thumbMaxW;
                let drawH = drawW / aspect;

                if (drawH > thumbMaxH) {
                  drawH = thumbMaxH;
                  drawW = drawH * aspect;
                }

                const thumbX = ML + colW1 + colW2 + (colW3 - drawW) / 2;
                const thumbY = ctx.currentY - 3 + (cellH - drawH) / 2;
                try {
                  pdf.addImage(thumbImage.data, 'JPEG', thumbX, thumbY, drawW, drawH);
                } catch (error) {
                  console.warn('Expense photo thumbnail error:', error);
                }
              }

              const groupStartIndex = expensePhotoUrls.length;
              expensePhotoUrls.push(...photos);
              expensePhotoCaptions.push(...photos.map((_, index) => `${item} — Foto ${index + 1}`));
              expensePhotoGroups.push({
                id: exp.id,
                caption: `Registro fotográfico — ${item}`,
                photoIds: photos.map((_, index) => String(groupStartIndex + index)),
              });
            } else {
              pdf.setFontSize(FONT_CAPTION);
              pdf.setFont('times', 'italic');
              pdf.text('-', ML + colW1 + colW2 + colW3 / 2, ctx.currentY + LINE_H / 2, { align: 'center' });
              pdf.setFontSize(FONT_BODY);
              pdf.setFont('times', 'normal');
            }

            ctx.currentY += cellH;
          }

          await renderExpensePhotoDocumentation(
            expensePhotoUrls,
            expensePhotoCaptions,
            expensePhotoGroups,
            extraExpensePhotos,
            extraExpensePhotos.map((_, index) => extraExpenseMetas[index]?.caption || `Foto complementar ${index + 1}`),
          );
        } else {
          addParagraph(ctx, '[Nenhum item de despesa cadastrado]');
        }
        renderedPhotoKeys.add(section.key);
        renderedPhotoKeys.add(section.id);
        break;

      case 'links':
        if (attachmentTargets.attendance.length > 0) {
          renderLinkedRow(
            'Lista de Presença',
            resolveLinkDisplayName('attendance', data.linkDisplayNames?.attendance),
            attachmentTargets.attendance[0],
          );
        }

        if (attachmentTargets.registration.length > 0) {
          renderLinkedRow(
            'Lista de Inscrição',
            resolveLinkDisplayName('registration', data.linkDisplayNames?.registration),
            attachmentTargets.registration[0],
          );
        }

        if (attachmentTargets.media.length === 1) {
          renderLinkedRow(
            'Mídias (Fotos/Vídeos)',
            resolveLinkDisplayName('media', data.linkDisplayNames?.media, 0),
            attachmentTargets.media[0],
          );
        } else if (attachmentTargets.media.length > 1) {
          renderLinkBulletList('Mídias (Fotos/Vídeos)', attachmentTargets.media, data.linkDisplayNames?.media);
        }
        break;

      default:
        if (section.type === 'custom' && section.content) {
          addParagraph(ctx, section.content);
        }
    }

    // Render per-section photos
    const secPhotos = sectionPhotos[section.key] || sectionPhotos[section.id] || [];
    const secKey = sectionPhotos[section.key] ? section.key : section.id;
    if (secPhotos.length > 0 && !renderedPhotoKeys.has(secKey)) {
      const secMetas = photoMetadata[secKey] || [];
      const captions = secPhotos.map((_, i) => secMetas[i]?.caption || `Foto ${i + 1}`);
      await renderPhotos(secPhotos, secKey, section.title, captions, sectionPhotoGroups[secKey]);
      renderedPhotoKeys.add(secKey);
    }
  }

  // ── Signature ──
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;
  addSignatureBlock(ctx, project.organizationName, dateText, 'Assinatura do Responsável');

  // ── Footer + page numbers ──
  const CEAP_FOOTER_L1 = 'Centro de Articulação de Populações Marginalizadas - CEAP';
  const CEAP_FOOTER_L2 = 'R. Sr. dos Passos, 174 - Sl 701 - Centro, Rio de Janeiro - RJ, 20061-011';
  const CEAP_FOOTER_L3 = 'ceapoficial.org.br | falecom@ceapoficial.org.br | (21) 9 7286-4717';

  const footerInfo: FooterInfo = {
    orgName: project.organizationName,
    address: footerShowAddress ? project.organizationAddress : undefined,
    website: footerShowContact ? project.organizationWebsite : undefined,
    email: footerShowContact ? project.organizationEmail : undefined,
    phone: footerShowContact ? project.organizationPhone : undefined,
    customText: footerText,
    alignment: footerAlignment,
    institutionalEnabled: vc?.footerInstitutionalEnabled !== false,
    line1Text: vc?.footerLine1Text || CEAP_FOOTER_L1,
    line1FontSize: vc?.footerLine1FontSize,
    line2Text: vc?.footerLine2Text || CEAP_FOOTER_L2,
    line2FontSize: vc?.footerLine2FontSize,
    line3Text: vc?.footerLine3Text || CEAP_FOOTER_L3,
    line3FontSize: vc?.footerLine3FontSize,
    lineSpacing: vc?.footerLineSpacing,
    topSpacing: vc?.footerTopSpacing,
  };
  addFooterAndPageNumbers(ctx, project.organizationName, true, footerInfo);

  // Save
  const filename = `Relatorio_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};