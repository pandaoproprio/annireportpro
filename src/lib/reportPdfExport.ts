import { Project, Activity, ActivityType, ExpenseItem, ReportSection, ReportPhotoMeta } from '@/types';
import { PageLayout } from '@/types/imageLayout';
import { ReportVisualConfig } from '@/hooks/useReportVisualConfig';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  createPdfContext, addPage, ensureSpace, addParagraph, addBulletItem, addRichParagraph,
  addSectionTitle, addFooterAndPageNumbers, addSignatureBlock, FooterInfo,
  loadImage, addPhotoGrid, addPhotoLayout, parseHtmlToBlocks, addInlineImage, addGalleryGrid, PdfContext,
  preloadHeaderImages,
  PAGE_W, PAGE_H, ML, MR, CW, MAX_Y, LINE_H, FONT_BODY, FONT_CAPTION, MT,
} from '@/lib/pdfHelpers';

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
  sectionPhotos?: Record<string, string[]>;
  photoMetadata?: Record<string, ReportPhotoMeta[]>;
  visualConfig?: ReportVisualConfig;
  pageLayouts?: Record<string, PageLayout>;
}

const formatActivityDate = (date: string, endDate?: string) => {
  const start = new Date(date).toLocaleDateString('pt-BR');
  if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
  return start;
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
  } = data;

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

  // Helper: render photos using layout if available, otherwise fallback to grid
  const renderPhotos = async (photos: string[], sectionKey: string, label: string, captions?: string[]) => {
    if (photos.length === 0) return;
    const layout = pageLayouts[sectionKey];
    if (layout && layout.images && layout.images.length > 0) {
      await addPhotoLayout(ctx, layout, label);
    } else {
      await addPhotoGrid(ctx, photos, label, captions);
    }
  };

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
    activities.filter(a => a.goalId === goalId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getCommunicationActivities = () =>
    activities.filter(a => a.type === ActivityType.COMUNICACAO).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getOtherActivities = () =>
    activities.filter(a => a.type === ActivityType.OUTROS || a.type === ActivityType.ADMINISTRATIVO || a.type === ActivityType.OCORRENCIA)
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
  ctx.headerConfig = {
    bannerImg,
    bannerHeightMm: vc?.headerBannerHeightMm,
    bannerFit: vc?.headerBannerFit,
    bannerVisible: vc?.headerBannerVisible,
    logoImg,
    logoSecondaryImg,
    logoCenterImg,
    headerLeftText,
    headerRightText,
    logoVisible: vc?.logoConfig?.visible,
    logoCenterVisible: vc?.logoCenterConfig?.visible,
    logoSecondaryVisible: vc?.logoSecondaryConfig?.visible,
    logoWidthMm: vc?.logoConfig?.widthMm,
    logoCenterWidthMm: vc?.logoCenterConfig?.widthMm,
    logoSecondaryWidthMm: vc?.logoSecondaryConfig?.widthMm,
    logoAlignment: vc?.headerLogoAlignment,
    logoGapMm: vc?.headerLogoGap,
    topPaddingMm: vc?.headerTopPadding,
    headerHeightMm: vc?.headerHeight,
    contentSpacingMm: vc?.headerContentSpacing,
  };
  addPage(ctx);

  for (const section of sections) {
    if (!section.isVisible) continue;

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
            await renderPhotos(allGoalPhotos, goal.id, goal.title, captions);
          }
        }
        break;

      case 'other': {
        const otherActs = getOtherActivities();
        await writeHtmlContent(otherActionsNarrative, '[Outras informações sobre as ações desenvolvidas]');

        if (otherActs.length > 0) {
          ctx.currentY += 2;
          pdf.setFontSize(FONT_BODY);
          pdf.setFont('times', 'bold');
          ensureSpace(ctx, LINE_H);
          pdf.text('Atividades relacionadas:', ML, ctx.currentY);
          ctx.currentY += LINE_H;
          pdf.setFont('times', 'normal');

          for (const act of otherActs) {
            addBulletItem(ctx, `${formatActivityDate(act.date)}: ${act.description}`);
          }
        }

        const otherPhotosAll = [...otherActionsPhotos, ...otherActs.flatMap(a => a.photos || [])];
        if (otherPhotosAll.length > 0) {
          const otherMetas = photoMetadata['other'] || [];
          const captions = otherPhotosAll.map((_, i) => otherMetas[i]?.caption || `Foto ${i + 1}`);
          await renderPhotos(otherPhotosAll, 'other', 'OUTRAS AÇÕES', captions);
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
          await renderPhotos(commPhotosAll, 'communication', 'PUBLICAÇÕES E DIVULGAÇÃO', captions);
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
          const colW1 = CW * 0.4;
          const colW2 = CW * 0.6;
          const rowH = LINE_H + 2;

          ensureSpace(ctx, rowH * 2);

          pdf.setFillColor(224, 224, 224);
          pdf.rect(ML, ctx.currentY - 5, colW1, rowH, 'F');
          pdf.rect(ML + colW1, ctx.currentY - 5, colW2, rowH, 'F');
          pdf.setDrawColor(0);
          pdf.rect(ML, ctx.currentY - 5, colW1, rowH, 'S');
          pdf.rect(ML + colW1, ctx.currentY - 5, colW2, rowH, 'S');

          pdf.setFontSize(FONT_BODY);
          pdf.setFont('times', 'bold');
          pdf.text('Item de Despesa', ML + 3, ctx.currentY);
          pdf.text('Descrição de Uso', ML + colW1 + 3, ctx.currentY);
          ctx.currentY += rowH;

          pdf.setFont('times', 'normal');
          for (const exp of expenses) {
            const item = exp.itemName || '-';
            const desc = exp.description || '-';

            const itemLines: string[] = pdf.splitTextToSize(item, colW1 - 6);
            const descLines: string[] = pdf.splitTextToSize(desc, colW2 - 6);
            const maxLines = Math.max(itemLines.length, descLines.length);
            const cellH = maxLines * LINE_H + 4;

            ensureSpace(ctx, cellH);

            pdf.rect(ML, ctx.currentY - 5, colW1, cellH, 'S');
            pdf.rect(ML + colW1, ctx.currentY - 5, colW2, cellH, 'S');

            for (let i = 0; i < itemLines.length; i++) {
              pdf.text(itemLines[i], ML + 3, ctx.currentY + i * LINE_H);
            }
            for (let i = 0; i < descLines.length; i++) {
              pdf.text(descLines[i], ML + colW1 + 3, ctx.currentY + i * LINE_H);
            }

            ctx.currentY += cellH;
          }
        } else {
          addParagraph(ctx, '[Nenhum item de despesa cadastrado]');
        }
        break;

      case 'links':
        pdf.setFontSize(FONT_BODY);
        pdf.setFont('times', 'normal');

        ensureSpace(ctx, LINE_H * 3);

        pdf.setFont('times', 'bold');
        pdf.text('Lista de Presença: ', ML, ctx.currentY);
        const lpw = pdf.getTextWidth('Lista de Presença: ');
        pdf.setFont('times', 'normal');
        pdf.text(links.attendance || '[não informado]', ML + lpw, ctx.currentY);
        ctx.currentY += LINE_H;

        pdf.setFont('times', 'bold');
        pdf.text('Lista de Inscrição: ', ML, ctx.currentY);
        const liw = pdf.getTextWidth('Lista de Inscrição: ');
        pdf.setFont('times', 'normal');
        pdf.text(links.registration || '[não informado]', ML + liw, ctx.currentY);
        ctx.currentY += LINE_H;

        pdf.setFont('times', 'bold');
        pdf.text('Mídias (Fotos/Vídeos): ', ML, ctx.currentY);
        const mw = pdf.getTextWidth('Mídias (Fotos/Vídeos): ');
        pdf.setFont('times', 'normal');
        pdf.text(links.media || '[não informado]', ML + mw, ctx.currentY);
        ctx.currentY += LINE_H;
        break;

      default:
        if (section.type === 'custom' && section.content) {
          addParagraph(ctx, section.content);
        }
    }

    // Render per-section photos
    const secPhotos = sectionPhotos[section.key] || sectionPhotos[section.id] || [];
    if (secPhotos.length > 0) {
      const secKey = sectionPhotos[section.key] ? section.key : section.id;
      const secMetas = photoMetadata[secKey] || [];
      const captions = secPhotos.map((_, i) => secMetas[i]?.caption || `Foto ${i + 1}`);
      await renderPhotos(secPhotos, secKey, section.title, captions);
    }
  }

  // ── Signature ──
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;
  addSignatureBlock(ctx, project.organizationName, dateText, 'Assinatura do Responsável');

  // ── Footer + page numbers ──
  const footerInfo: FooterInfo = {
    orgName: project.organizationName,
    address: footerShowAddress ? project.organizationAddress : undefined,
    website: footerShowContact ? project.organizationWebsite : undefined,
    email: footerShowContact ? project.organizationEmail : undefined,
    phone: footerShowContact ? project.organizationPhone : undefined,
    customText: footerText,
    alignment: footerAlignment,
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
  const filename = `Relatorio_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};