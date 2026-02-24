import { Project, Activity, ActivityType, ExpenseItem, ReportSection } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  createPdfContext, addPage, ensureSpace, addParagraph, addBulletItem,
  addSectionTitle, addFooterAndPageNumbers, addSignatureBlock,
  loadImage, addPhotoGrid, parseHtmlToBlocks, PdfContext,
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
}

const formatActivityDate = (date: string, endDate?: string) => {
  const start = new Date(date).toLocaleDateString('pt-BR');
  if (endDate) return `${start} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
  return start;
};

export const exportReportToPdf = async (data: ReportPdfExportData): Promise<void> => {
  const {
    project, activities, sections, objectText, summary,
    goalNarratives, goalPhotos,
    otherActionsNarrative, otherActionsPhotos,
    communicationNarrative, communicationPhotos,
    satisfaction, futureActions, expenses, links,
    sectionPhotos = {},
  } = data;

  const ctx = createPdfContext();
  const { pdf } = ctx;

  // Helper to render HTML content from rich-text editor
  const writeHtmlContent = (html: string, fallback: string) => {
    const blocks = parseHtmlToBlocks(html || fallback);
    for (const block of blocks) {
      if (block.type === 'bullet') addBulletItem(ctx, block.content);
      else addParagraph(ctx, block.content);
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
  ctx.currentY = PAGE_H / 2 - 40;

  pdf.setFontSize(16);
  pdf.setFont('times', 'bold');
  const coverTitle = 'RELATÓRIO PARCIAL DE CUMPRIMENTO DO OBJETO';
  const ctw = pdf.getTextWidth(coverTitle);
  pdf.text(coverTitle, (PAGE_W - ctw) / 2, ctx.currentY);
  ctx.currentY += LINE_H * 2;

  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const nameLines: string[] = pdf.splitTextToSize(project.name.toUpperCase(), CW);
  for (const line of nameLines) {
    const lw = pdf.getTextWidth(line);
    pdf.text(line, (PAGE_W - lw) / 2, ctx.currentY);
    ctx.currentY += LINE_H + 2;
  }
  ctx.currentY += LINE_H;

  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'normal');
  const fomentoText = `Termo de Fomento nº ${project.fomentoNumber}`;
  const ftw = pdf.getTextWidth(fomentoText);
  pdf.text(fomentoText, (PAGE_W - ftw) / 2, ctx.currentY);
  ctx.currentY += LINE_H * 3;

  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const orgw = pdf.getTextWidth(project.organizationName);
  pdf.text(project.organizationName, (PAGE_W - orgw) / 2, ctx.currentY);

  // ══════════════════════════════════════════════════════════════
  // CONTENT PAGES
  // ══════════════════════════════════════════════════════════════
  addPage(ctx);

  for (const section of sections) {
    if (!section.isVisible) continue;

    // No .toUpperCase() — title comes pre-formatted from section structure
    addSectionTitle(ctx, section.title);

    switch (section.key) {
      case 'object':
        addParagraph(ctx, objectText || '[Descrição do objeto]');
        break;

      case 'summary':
        writeHtmlContent(summary, '[Resumo das atividades]');
        break;

      case 'goals':
        for (const goal of project.goals) {
          const goalActs = getActivitiesByGoal(goal.id);
          addSubSectionTitle(goal.title);
          writeHtmlContent(goalNarratives[goal.id], '[Descreva as realizações da meta]');

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
            await addPhotoGrid(ctx, allGoalPhotos, goal.title);
          }
        }
        break;

      case 'other': {
        const otherActs = getOtherActivities();
        writeHtmlContent(otherActionsNarrative, '[Outras informações sobre as ações desenvolvidas]');

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
          await addPhotoGrid(ctx, otherPhotosAll, 'OUTRAS AÇÕES');
        }
        break;
      }

      case 'communication': {
        const commActs = getCommunicationActivities();
        writeHtmlContent(communicationNarrative, '[Publicações e ações de divulgação]');

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
          await addPhotoGrid(ctx, commPhotosAll, 'PUBLICAÇÕES E DIVULGAÇÃO');
        }
        break;
      }

      case 'satisfaction':
        writeHtmlContent(satisfaction, '[Grau de satisfação do público-alvo]');
        break;

      case 'future':
        writeHtmlContent(futureActions, '[Sobre as ações futuras]');
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

    // Render per-section photos (uploaded via "Registro Fotográfico")
    const secPhotos = sectionPhotos[section.key] || sectionPhotos[section.id] || [];
    if (secPhotos.length > 0) {
      await addPhotoGrid(ctx, secPhotos, section.title);
    }
  }

  // ── Signature ──
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;
  addSignatureBlock(ctx, project.organizationName, dateText, 'Assinatura do Responsável');

  // ── Footer + page numbers (skip cover page) ──
  addFooterAndPageNumbers(ctx, project.organizationName, true);

  // Save
  const filename = `Relatorio_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};
