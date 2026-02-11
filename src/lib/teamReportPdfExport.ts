import jsPDF from 'jspdf';
import { Project, TeamReport } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamReportExportData {
  project: Project;
  report: TeamReport;
}

const formatPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  const endMonth = endDate.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
  return `[${startMonth} à ${endMonth}]`;
};

// ── HTML parser ──
interface TextBlock {
  type: 'paragraph' | 'bullet';
  content: string;
}

const parseHtmlToBlocks = (html: string): TextBlock[] => {
  if (!html) return [];
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const blocks: TextBlock[] = [];

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push({ type: 'paragraph', content: text });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'li') {
        const t = el.textContent?.trim() || '';
        if (t) blocks.push({ type: 'bullet', content: t });
      } else if (tag === 'p') {
        const t = el.textContent?.trim() || '';
        if (t) blocks.push({ type: 'paragraph', content: t });
      } else {
        el.childNodes.forEach(c => processNode(c));
      }
    }
  };

  temp.childNodes.forEach(c => processNode(c));
  return blocks;
};

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

// ══════════════════════════════════════════════════════════════
// ABNT NBR 14724 constants
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

export const exportTeamReportToPdf = async (data: TeamReportExportData): Promise<void> => {
  const { project, report } = data;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let currentY = MT;
  let pageCount = 1;

  // ── helpers ──
  const addPage = () => { pdf.addPage(); pageCount++; currentY = MT; };
  const ensureSpace = (h: number) => { if (currentY + h > MAX_Y) addPage(); };

  // Justified paragraph with 1.25 cm first-line indent and 1.5 line spacing
  const addParagraph = (text: string) => {
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'normal');
    const lines: string[] = pdf.splitTextToSize(text, CW - INDENT);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(LINE_H);
      const x = i === 0 ? ML + INDENT : ML;
      const w = i === 0 ? CW - INDENT : CW;
      pdf.text(lines[i], x, currentY, { maxWidth: w, align: 'justify' });
      currentY += LINE_H;
    }
    currentY += 2; // small gap after paragraph
  };

  // Bullet item with bold label detection
  const addBulletText = (text: string) => {
    pdf.setFontSize(FONT_BODY);
    const bulletIndent = 8;
    const textX = ML + bulletIndent + 4;
    const textW = CW - bulletIndent - 4;

    ensureSpace(LINE_H);
    pdf.setFont('times', 'normal');
    pdf.text('•', ML + bulletIndent, currentY);

    const colonIdx = text.indexOf(':');
    const hasLabel = colonIdx > 0 && colonIdx < 50;

    if (hasLabel) {
      const label = text.substring(0, colonIdx + 1);
      const content = text.substring(colonIdx + 1).trim();
      pdf.setFont('times', 'bold');
      pdf.text(label, textX, currentY);
      const lw = pdf.getTextWidth(label + ' ');
      pdf.setFont('times', 'normal');

      const remaining = textW - lw;
      if (pdf.getTextWidth(content) <= remaining) {
        pdf.text(content, textX + lw, currentY);
        currentY += LINE_H;
      } else {
        const allLines: string[] = pdf.splitTextToSize(label + ' ' + content, textW);
        // first line already printed label
        const firstRest = allLines[0].substring(label.length).trim();
        if (firstRest) pdf.text(firstRest, textX + lw, currentY);
        currentY += LINE_H;
        for (let i = 1; i < allLines.length; i++) {
          ensureSpace(LINE_H);
          pdf.text(allLines[i], textX, currentY, { maxWidth: textW, align: 'justify' });
          currentY += LINE_H;
        }
      }
    } else {
      const lines: string[] = pdf.splitTextToSize(text, textW);
      for (let i = 0; i < lines.length; i++) {
        if (i > 0) ensureSpace(LINE_H);
        pdf.text(lines[i], textX, currentY, { maxWidth: textW, align: 'justify' });
        currentY += LINE_H;
      }
    }
    currentY += 1;
  };

  // Section title (bold, size 12)
  const addSectionTitle = (title: string) => {
    ensureSpace(LINE_H * 2);
    currentY += 4;
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(title, ML, currentY);
    currentY += LINE_H + 2;
  };

  // Header label: value pair
  const addHeaderLine = (label: string, value: string) => {
    ensureSpace(LINE_H);
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(label, ML, currentY);
    const lw = pdf.getTextWidth(label + ' ');
    pdf.setFont('times', 'normal');
    const valLines: string[] = pdf.splitTextToSize(value, CW - lw);
    pdf.text(valLines[0], ML + lw, currentY);
    currentY += LINE_H;
    for (let i = 1; i < valLines.length; i++) {
      ensureSpace(LINE_H);
      pdf.text(valLines[i], ML + lw, currentY, { maxWidth: CW - lw });
      currentY += LINE_H;
    }
  };

  // Identification bullet (simple label: value)
  const addIdBullet = (label: string, value: string) => {
    ensureSpace(LINE_H);
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'normal');
    pdf.text('•', ML + 8, currentY);
    pdf.setFont('times', 'bold');
    pdf.text(label, ML + 14, currentY);
    const lw = pdf.getTextWidth(label + '  ');
    pdf.setFont('times', 'normal');
    pdf.text(value, ML + 14 + lw, currentY);
    currentY += LINE_H;
  };

  // ══════════════════════════════════════════════════════════════
  // PAGE 1: Title + Header
  // ══════════════════════════════════════════════════════════════
  const reportTitle = report.reportTitle || 'RELATÓRIO DA EQUIPE DE TRABALHO';
  pdf.setFontSize(14);
  pdf.setFont('times', 'bold');
  const tw = pdf.getTextWidth(reportTitle);
  pdf.text(reportTitle, (PAGE_W - tw) / 2, currentY);
  currentY += LINE_H * 2;

  addHeaderLine('Termo de Fomento nº:', project.fomentoNumber);
  addHeaderLine('Projeto:', project.name);
  addHeaderLine('Período de Referência:', formatPeriod(report.periodStart, report.periodEnd));
  currentY += LINE_H;

  // ── 1. Dados de Identificação ──
  addSectionTitle('1. Dados de Identificação');
  addIdBullet('Prestador:', report.providerName || '[Não informado]');
  addIdBullet('Responsável Técnico:', report.responsibleName);
  addIdBullet('Função:', report.functionRole);
  currentY += LINE_H;

  // ── 2. Relato de Execução ──
  const execTitle = report.executionReportTitle || '2. Relato de Execução da Coordenação do Projeto';
  addSectionTitle(execTitle);

  const blocks = parseHtmlToBlocks(report.executionReport || '<p>[Nenhum relato informado]</p>');
  for (const block of blocks) {
    if (block.type === 'bullet') addBulletText(block.content);
    else addParagraph(block.content);
  }

  // ── Additional Sections ──
  for (const section of (report.additionalSections || [])) {
    addSectionTitle(section.title);
    const sBlocks = parseHtmlToBlocks(section.content || '<p>[Nenhum conteúdo]</p>');
    for (const b of sBlocks) {
      if (b.type === 'bullet') addBulletText(b.content);
      else addParagraph(b.content);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PHOTOS (inline, after content)
  // ══════════════════════════════════════════════════════════════
  const photosToExport = report.photoCaptions && report.photoCaptions.length > 0
    ? report.photoCaptions
    : report.photos?.map((url, i) => ({ url, caption: 'Registro fotográfico das atividades realizadas', id: `photo-${i}` })) || [];

  if (photosToExport.length > 0) {
    const isSingle = photosToExport.length === 1;
    const photoW = isSingle ? CW : (CW - 10) / 2;
    const photoH = photoW * 0.75;

    // Ensure title + first photo row stay together
    currentY += LINE_H;
    ensureSpace(LINE_H + 6 + photoH + 20);
    const attTitle = report.attachmentsTitle || 'Registros Fotográficos';
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'bold');
    pdf.text(attTitle, ML, currentY);
    currentY += LINE_H + 4;

    const COL_GAP = 10;
    const col1X = ML;
    const col2X = ML + photoW + COL_GAP;

    let idx = 0;
    while (idx < photosToExport.length) {
      const rowW = isSingle ? CW : photoW;
      const rowH = rowW * 0.75;

      if (currentY + rowH + 20 > MAX_Y) addPage();
      const rowY = currentY;
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

        // Caption (font 10, italic)
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

      currentY = rowY + rowH + 22;
    }
  }

  // ══════════════════════════════════════════════════════════════
  // SIGNATURE BLOCK
  // ══════════════════════════════════════════════════════════════
  currentY += LINE_H;
  ensureSpace(55);

  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'normal');
  const dateText = `Rio de Janeiro, ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.`;
  pdf.text(dateText, ML, currentY);
  currentY += LINE_H * 3;

  // Signature line centered
  ensureSpace(35);
  const cx = PAGE_W / 2;
  const sigW = 80;
  pdf.setDrawColor(0);
  pdf.line(cx - sigW / 2, currentY, cx + sigW / 2, currentY);
  currentY += 5;

  pdf.setFont('times', 'normal');
  const sigLabel = 'Assinatura do responsável legal';
  pdf.text(sigLabel, cx - pdf.getTextWidth(sigLabel) / 2, currentY);
  currentY += LINE_H + 2;

  pdf.setFont('times', 'bold');
  const nomeLabel = 'Nome e cargo: ';
  pdf.text(nomeLabel, cx - 60, currentY);
  const nomeLw = pdf.getTextWidth(nomeLabel);
  pdf.setFont('times', 'normal');
  pdf.text(`${report.responsibleName} - ${report.functionRole}`, cx - 60 + nomeLw, currentY);
  currentY += LINE_H;

  pdf.setFont('times', 'bold');
  const cnpjLabel = 'CNPJ: ';
  pdf.text(cnpjLabel, cx - 60, currentY);
  const cnpjLw = pdf.getTextWidth(cnpjLabel);
  pdf.setFont('times', 'normal');
  pdf.text(report.providerDocument || '[Não informado]', cx - 60 + cnpjLw, currentY);

  // ══════════════════════════════════════════════════════════════
  // FOOTERS + PAGE NUMBERS (top-right per ABNT)
  // ══════════════════════════════════════════════════════════════
  const footerContent = report.footerText?.trim() || project.organizationName;

  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);

    // Page number – top right, 2 cm from edge
    pdf.setFontSize(FONT_BODY);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(0);
    const pNum = String(p);
    pdf.text(pNum, PAGE_W - MR, 15, { align: 'right' });

    // Footer line + org name
    pdf.setDrawColor(180, 180, 180);
    pdf.line(ML, PAGE_H - 15, PAGE_W - MR, PAGE_H - 15);
    pdf.setFontSize(FONT_CAPTION);
    pdf.setTextColor(80, 80, 80);
    const fw = pdf.getTextWidth(footerContent);
    pdf.text(footerContent, (PAGE_W - fw) / 2, PAGE_H - 10);
    pdf.setTextColor(0, 0, 0);
  }

  // Save
  const memberName = report.responsibleName.replace(/\s+/g, '_');
  pdf.save(`Relatorio_Equipe_${memberName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
