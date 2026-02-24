import jsPDF from 'jspdf';
import { Project, Activity, ActivityType, ExpenseItem, ReportSection } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

// ══════════════════════════════════════════════════════════════
// ABNT NBR 14724 constants (same as teamReportPdfExport.ts)
// ══════════════════════════════════════════════════════════════
const PAGE_W = 210;
const PAGE_H = 297;
const ML = 30;       // margin left  3 cm
const MR = 20;       // margin right 2 cm
const MT = 30;       // margin top   3 cm
const MB = 20;       // margin bottom 2 cm
const CW = PAGE_W - ML - MR;   // content width = 160 mm
const MAX_Y = PAGE_H - MB;
const LINE_H = 7.2;  // ~1.5 × 12pt ≈ 7.2 mm
const INDENT = 12.5;  // 1.25 cm paragraph indent
const FONT_BODY = 12;
const FONT_CAPTION = 10;

// ── Image loader ──
const loadImage = async (url: string): Promise<{ data: string; width: number; height: number } | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => resolve({ data: dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

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
  } = data;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let currentY = MT;
  let pageCount = 1;

  // ── helpers ──
  const addPage = () => { pdf.addPage(); pageCount++; currentY = MT; };
  const ensureSpace = (h: number) => { if (currentY + h > MAX_Y) addPage(); };

  // Justified paragraph with 1.25 cm first-line indent and 1.5 line spacing
  const addParagraph = (text: string) => {
    if (!text || text.trim() === '') return;
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'normal');
    const paragraphs = text.split('\n').filter(p => p.trim() !== '');
    for (const para of paragraphs) {
      const lines: string[] = pdf.splitTextToSize(para, CW - INDENT);
      for (let i = 0; i < lines.length; i++) {
        ensureSpace(LINE_H);
        const x = i === 0 ? ML + INDENT : ML;
        const w = i === 0 ? CW - INDENT : CW;
        pdf.text(lines[i], x, currentY, { maxWidth: w, align: 'justify' });
        currentY += LINE_H;
      }
      currentY += 2; // small gap after paragraph
    }
  };

  // Section title (bold, left-aligned)
  const addSectionTitle = (title: string) => {
    ensureSpace(LINE_H * 2);
    currentY += 4;
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(title.toUpperCase(), ML, currentY);
    currentY += LINE_H + 2;
  };

  // Sub-section title (bold, normal case)
  const addSubSectionTitle = (title: string) => {
    ensureSpace(LINE_H * 2);
    currentY += 2;
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(title, ML, currentY);
    currentY += LINE_H + 2;
  };

  // Bullet item
  const addBulletItem = (text: string) => {
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'normal');
    const bulletX = ML + 8;
    const textX = ML + 12;
    const textW = CW - 12;

    ensureSpace(LINE_H);
    pdf.text('•', bulletX, currentY);
    const lines: string[] = pdf.splitTextToSize(text, textW);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) ensureSpace(LINE_H);
      pdf.text(lines[i], textX, currentY, { maxWidth: textW, align: 'justify' });
      currentY += LINE_H;
    }
    currentY += 1;
  };

  // Activity entry with date, location, attendees, description
  const addActivityEntry = (act: Activity) => {
    const datePart = formatActivityDate(act.date, act.endDate);
    const locationPart = act.location ? ` – ${act.location}` : '';
    const attendeesPart = act.attendeesCount > 0 ? ` – ${act.attendeesCount} participantes` : '';
    addBulletItem(`${datePart}${locationPart}${attendeesPart}`);

    if (act.description) {
      pdf.setFontSize(FONT_BODY);
      pdf.setFont('times', 'normal');
      const descLines: string[] = pdf.splitTextToSize(act.description, CW - 12);
      for (const line of descLines) {
        ensureSpace(LINE_H);
        pdf.text(line, ML + 12, currentY, { maxWidth: CW - 12, align: 'justify' });
        currentY += LINE_H;
      }
      currentY += 1;
    }
  };

  // Photo grid (2 columns)
  const addPhotoGrid = async (photoUrls: string[], sectionLabel: string) => {
    if (photoUrls.length === 0) return;

    addPage();
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    const titleText = `REGISTROS FOTOGRÁFICOS – ${sectionLabel.toUpperCase()}`;
    pdf.text(titleText, ML, currentY);
    currentY += LINE_H + 4;

    const photoW = (CW - 10) / 2;
    const photoH = photoW * 0.75;
    const COL_GAP = 10;

    let idx = 0;
    while (idx < photoUrls.length) {
      if (currentY + photoH + 15 > MAX_Y) addPage();
      const rowY = currentY;

      for (let col = 0; col < 2 && idx < photoUrls.length; col++) {
        const x = col === 0 ? ML : ML + photoW + COL_GAP;
        const imgData = await loadImage(photoUrls[idx]);
        if (imgData) {
          try { pdf.addImage(imgData.data, 'JPEG', x, rowY, photoW, photoH); }
          catch (e) { console.warn('Image error:', e); }
        }

        // Caption
        pdf.setFontSize(FONT_CAPTION);
        pdf.setFont('times', 'italic');
        pdf.text(`Foto ${idx + 1}`, x + photoW / 2, rowY + photoH + 4, { align: 'center' });

        idx++;
      }

      currentY = rowY + photoH + 10;
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
  currentY = PAGE_H / 2 - 40;

  pdf.setFontSize(16);
  pdf.setFont('times', 'bold');
  const coverTitle = 'RELATÓRIO PARCIAL DE CUMPRIMENTO DO OBJETO';
  const ctw = pdf.getTextWidth(coverTitle);
  pdf.text(coverTitle, (PAGE_W - ctw) / 2, currentY);
  currentY += LINE_H * 2;

  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const nameLines: string[] = pdf.splitTextToSize(project.name.toUpperCase(), CW);
  for (const line of nameLines) {
    const lw = pdf.getTextWidth(line);
    pdf.text(line, (PAGE_W - lw) / 2, currentY);
    currentY += LINE_H + 2;
  }
  currentY += LINE_H;

  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'normal');
  const fomentoText = `Termo de Fomento nº ${project.fomentoNumber}`;
  const ftw = pdf.getTextWidth(fomentoText);
  pdf.text(fomentoText, (PAGE_W - ftw) / 2, currentY);
  currentY += LINE_H * 3;

  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const orgw = pdf.getTextWidth(project.organizationName);
  pdf.text(project.organizationName, (PAGE_W - orgw) / 2, currentY);

  // ══════════════════════════════════════════════════════════════
  // CONTENT PAGES
  // ══════════════════════════════════════════════════════════════
  addPage(); // start content on page 2

  for (const section of sections) {
    if (!section.isVisible) continue;

    addSectionTitle(section.title);

    switch (section.key) {
      case 'object':
        addParagraph(objectText || '[Descrição do objeto]');
        break;

      case 'summary':
        addParagraph(summary || '[Resumo das atividades]');
        break;

      case 'goals':
        for (const goal of project.goals) {
          const goalActs = getActivitiesByGoal(goal.id);
          addSubSectionTitle(goal.title);
          addParagraph(goalNarratives[goal.id] || '[Descreva as realizações da meta]');

          if (goalActs.length > 0) {
            currentY += 2;
            pdf.setFontSize(FONT_BODY);
            pdf.setFont('times', 'bold');
            ensureSpace(LINE_H);
            pdf.text('Atividades realizadas:', ML, currentY);
            currentY += LINE_H;
            pdf.setFont('times', 'normal');

            for (const act of goalActs) {
              addActivityEntry(act);
            }
          }

          // Goal photos
          const gPhotos = goalPhotos[goal.id] || [];
          const actPhotos = goalActs.flatMap(a => a.photos || []);
          const allGoalPhotos = [...gPhotos, ...actPhotos];
          if (allGoalPhotos.length > 0) {
            await addPhotoGrid(allGoalPhotos, goal.title);
          }
        }
        break;

      case 'other': {
        const otherActs = getOtherActivities();
        addParagraph(otherActionsNarrative || '[Outras informações sobre as ações desenvolvidas]');

        if (otherActs.length > 0) {
          currentY += 2;
          pdf.setFontSize(FONT_BODY);
          pdf.setFont('times', 'bold');
          ensureSpace(LINE_H);
          pdf.text('Atividades relacionadas:', ML, currentY);
          currentY += LINE_H;
          pdf.setFont('times', 'normal');

          for (const act of otherActs) {
            addBulletItem(`${formatActivityDate(act.date)}: ${act.description}`);
          }
        }

        // Other actions photos
        const otherPhotosAll = [...otherActionsPhotos, ...otherActs.flatMap(a => a.photos || [])];
        if (otherPhotosAll.length > 0) {
          await addPhotoGrid(otherPhotosAll, 'OUTRAS AÇÕES');
        }
        break;
      }

      case 'communication': {
        const commActs = getCommunicationActivities();
        addParagraph(communicationNarrative || '[Publicações e ações de divulgação]');

        if (commActs.length > 0) {
          currentY += 2;
          pdf.setFontSize(FONT_BODY);
          pdf.setFont('times', 'bold');
          ensureSpace(LINE_H);
          pdf.text('Atividades de divulgação:', ML, currentY);
          currentY += LINE_H;
          pdf.setFont('times', 'normal');

          for (const act of commActs) {
            addBulletItem(`${formatActivityDate(act.date)}: ${act.description}`);
          }
        }

        // Communication photos
        const commPhotosAll = [...communicationPhotos, ...commActs.flatMap(a => a.photos || [])];
        if (commPhotosAll.length > 0) {
          await addPhotoGrid(commPhotosAll, 'PUBLICAÇÕES E DIVULGAÇÃO');
        }
        break;
      }

      case 'satisfaction':
        addParagraph(satisfaction || '[Grau de satisfação do público-alvo]');
        break;

      case 'future':
        addParagraph(futureActions || '[Sobre as ações futuras]');
        break;

      case 'expenses':
        if (expenses.length > 0) {
          // Table header
          const colW1 = CW * 0.4;
          const colW2 = CW * 0.6;
          const rowH = LINE_H + 2;

          ensureSpace(rowH * 2);

          // Header row
          pdf.setFillColor(224, 224, 224);
          pdf.rect(ML, currentY - 5, colW1, rowH, 'F');
          pdf.rect(ML + colW1, currentY - 5, colW2, rowH, 'F');
          pdf.setDrawColor(0);
          pdf.rect(ML, currentY - 5, colW1, rowH, 'S');
          pdf.rect(ML + colW1, currentY - 5, colW2, rowH, 'S');

          pdf.setFontSize(FONT_BODY);
          pdf.setFont('times', 'bold');
          pdf.text('Item de Despesa', ML + 3, currentY);
          pdf.text('Descrição de Uso', ML + colW1 + 3, currentY);
          currentY += rowH;

          // Data rows
          pdf.setFont('times', 'normal');
          for (const exp of expenses) {
            const item = exp.itemName || '-';
            const desc = exp.description || '-';

            // Calculate row height based on content
            const itemLines: string[] = pdf.splitTextToSize(item, colW1 - 6);
            const descLines: string[] = pdf.splitTextToSize(desc, colW2 - 6);
            const maxLines = Math.max(itemLines.length, descLines.length);
            const cellH = maxLines * LINE_H + 4;

            ensureSpace(cellH);

            pdf.rect(ML, currentY - 5, colW1, cellH, 'S');
            pdf.rect(ML + colW1, currentY - 5, colW2, cellH, 'S');

            for (let i = 0; i < itemLines.length; i++) {
              pdf.text(itemLines[i], ML + 3, currentY + i * LINE_H);
            }
            for (let i = 0; i < descLines.length; i++) {
              pdf.text(descLines[i], ML + colW1 + 3, currentY + i * LINE_H);
            }

            currentY += cellH;
          }
        } else {
          addParagraph('[Nenhum item de despesa cadastrado]');
        }
        break;

      case 'links':
        pdf.setFontSize(FONT_BODY);
        pdf.setFont('times', 'normal');

        ensureSpace(LINE_H * 3);

        pdf.setFont('times', 'bold');
        pdf.text('Lista de Presença: ', ML, currentY);
        const lpw = pdf.getTextWidth('Lista de Presença: ');
        pdf.setFont('times', 'normal');
        pdf.text(links.attendance || '[não informado]', ML + lpw, currentY);
        currentY += LINE_H;

        pdf.setFont('times', 'bold');
        pdf.text('Lista de Inscrição: ', ML, currentY);
        const liw = pdf.getTextWidth('Lista de Inscrição: ');
        pdf.setFont('times', 'normal');
        pdf.text(links.registration || '[não informado]', ML + liw, currentY);
        currentY += LINE_H;

        pdf.setFont('times', 'bold');
        pdf.text('Mídias (Fotos/Vídeos): ', ML, currentY);
        const mw = pdf.getTextWidth('Mídias (Fotos/Vídeos): ');
        pdf.setFont('times', 'normal');
        pdf.text(links.media || '[não informado]', ML + mw, currentY);
        currentY += LINE_H;
        break;

      default:
        if (section.type === 'custom' && section.content) {
          addParagraph(section.content);
        }
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ══════════════════════════════════════════════════════════════
  currentY += LINE_H * 2;
  ensureSpace(55);

  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'normal');
  const currentDate = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;
  const cdw = pdf.getTextWidth(currentDate);
  pdf.text(currentDate, (PAGE_W - cdw) / 2, currentY);
  currentY += LINE_H * 4;

  ensureSpace(35);
  const cx = PAGE_W / 2;
  const sigW = 80;
  pdf.setDrawColor(0);
  pdf.line(cx - sigW / 2, currentY, cx + sigW / 2, currentY);
  currentY += 5;

  pdf.setFont('times', 'bold');
  const sigLabel = 'Assinatura do Responsável';
  pdf.text(sigLabel, cx - pdf.getTextWidth(sigLabel) / 2, currentY);
  currentY += LINE_H;

  pdf.setFont('times', 'normal');
  const orgLabel = project.organizationName;
  pdf.text(orgLabel, cx - pdf.getTextWidth(orgLabel) / 2, currentY);

  // ══════════════════════════════════════════════════════════════
  // FOOTERS + PAGE NUMBERS (top-right, skip cover)
  // ══════════════════════════════════════════════════════════════
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);

    // Page number – top right, skip cover page (page 1)
    if (p >= 2) {
      pdf.setFontSize(FONT_BODY);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(0);
      pdf.text(String(p), PAGE_W - MR, 15, { align: 'right' });
    }

    // Footer line + org name
    pdf.setDrawColor(180, 180, 180);
    pdf.line(ML, PAGE_H - 15, PAGE_W - MR, PAGE_H - 15);
    pdf.setFontSize(FONT_CAPTION);
    pdf.setTextColor(80, 80, 80);
    const footerText = project.organizationName;
    const fw = pdf.getTextWidth(footerText);
    pdf.text(footerText, (PAGE_W - fw) / 2, PAGE_H - 10);
    pdf.setTextColor(0, 0, 0);
  }

  // Save
  const filename = `Relatorio_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};
