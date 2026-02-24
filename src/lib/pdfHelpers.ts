import jsPDF from 'jspdf';

// ══════════════════════════════════════════════════════════════
// ABNT NBR 14724 constants — SINGLE SOURCE OF TRUTH
// ══════════════════════════════════════════════════════════════
export const PAGE_W = 210;
export const PAGE_H = 297;
export const ML = 30;       // margin left  3 cm
export const MR = 20;       // margin right 2 cm
export const MT = 30;       // margin top   3 cm
export const MB = 20;       // margin bottom 2 cm
export const CW = PAGE_W - ML - MR;   // content width = 160 mm
export const MAX_Y = PAGE_H - MB;
export const LINE_H = 7.2;  // ~1.5 × 12pt ≈ 7.2 mm
export const INDENT = 12.5; // 1.25 cm paragraph indent
export const FONT_BODY = 12;
export const FONT_CAPTION = 10;

// ── Types ──
export interface TextBlock {
  type: 'paragraph' | 'bullet';
  content: string;
}

export interface PdfContext {
  pdf: jsPDF;
  currentY: number;
  pageCount: number;
}

// ── Context creation ──
export const createPdfContext = (): PdfContext => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  return { pdf, currentY: MT, pageCount: 1 };
};

// ── Page management ──
export const addPage = (ctx: PdfContext): void => {
  ctx.pdf.addPage();
  ctx.pageCount++;
  ctx.currentY = MT;
};

export const ensureSpace = (ctx: PdfContext, h: number): void => {
  if (ctx.currentY + h > MAX_Y) addPage(ctx);
};

// ── Justified paragraph with 1.25 cm first-line indent and 1.5 line spacing ──
export const addParagraph = (ctx: PdfContext, text: string): void => {
  if (!text || text.trim() === '') return;
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'normal');
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  for (const para of paragraphs) {
    const lines: string[] = pdf.splitTextToSize(para, CW - INDENT);
    for (let i = 0; i < lines.length; i++) {
      ensureSpace(ctx, LINE_H);
      const x = i === 0 ? ML + INDENT : ML;
      const w = i === 0 ? CW - INDENT : CW;
      pdf.text(lines[i], x, ctx.currentY, { maxWidth: w, align: 'justify' });
      ctx.currentY += LINE_H;
    }
    ctx.currentY += 2; // small gap after paragraph
  }
};

// ── Bullet item with bold label detection ──
export const addBulletItem = (ctx: PdfContext, text: string): void => {
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);
  const bulletIndent = 8;
  const textX = ML + bulletIndent + 4;
  const textW = CW - bulletIndent - 4;

  ensureSpace(ctx, LINE_H);
  pdf.setFont('times', 'normal');
  pdf.text('•', ML + bulletIndent, ctx.currentY);

  const colonIdx = text.indexOf(':');
  const hasLabel = colonIdx > 0 && colonIdx < 50;

  if (hasLabel) {
    const label = text.substring(0, colonIdx + 1);
    const content = text.substring(colonIdx + 1).trim();
    pdf.setFont('times', 'bold');
    pdf.text(label, textX, ctx.currentY);
    const lw = pdf.getTextWidth(label + ' ');
    pdf.setFont('times', 'normal');

    const remaining = textW - lw;
    if (pdf.getTextWidth(content) <= remaining) {
      pdf.text(content, textX + lw, ctx.currentY);
      ctx.currentY += LINE_H;
    } else {
      const allLines: string[] = pdf.splitTextToSize(label + ' ' + content, textW);
      const firstRest = allLines[0].substring(label.length).trim();
      if (firstRest) pdf.text(firstRest, textX + lw, ctx.currentY);
      ctx.currentY += LINE_H;
      for (let i = 1; i < allLines.length; i++) {
        ensureSpace(ctx, LINE_H);
        pdf.text(allLines[i], textX, ctx.currentY, { maxWidth: textW, align: 'justify' });
        ctx.currentY += LINE_H;
      }
    }
  } else {
    const lines: string[] = pdf.splitTextToSize(text, textW);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) ensureSpace(ctx, LINE_H);
      pdf.text(lines[i], textX, ctx.currentY, { maxWidth: textW, align: 'justify' });
      ctx.currentY += LINE_H;
    }
  }
  ctx.currentY += 1;
};

// ── Section title (bold, Times 12pt) ──
export const addSectionTitle = (ctx: PdfContext, title: string): void => {
  ensureSpace(ctx, LINE_H * 2);
  ctx.currentY += 4;
  ctx.pdf.setFontSize(FONT_BODY);
  ctx.pdf.setFont('times', 'bold');
  ctx.pdf.text(title, ML, ctx.currentY);
  ctx.currentY += LINE_H + 2;
};

// ── Header label: value pair ──
export const addHeaderLine = (ctx: PdfContext, label: string, value: string): void => {
  ensureSpace(ctx, LINE_H);
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'bold');
  pdf.text(label, ML, ctx.currentY);
  const lw = pdf.getTextWidth(label + ' ');
  pdf.setFont('times', 'normal');
  const valLines: string[] = pdf.splitTextToSize(value, CW - lw);
  pdf.text(valLines[0], ML + lw, ctx.currentY);
  ctx.currentY += LINE_H;
  for (let i = 1; i < valLines.length; i++) {
    ensureSpace(ctx, LINE_H);
    pdf.text(valLines[i], ML + lw, ctx.currentY, { maxWidth: CW - lw });
    ctx.currentY += LINE_H;
  }
};

// ── HTML parser ──
export const parseHtmlToBlocks = (html: string): TextBlock[] => {
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
export const loadImage = async (url: string): Promise<{ data: string; width: number; height: number } | null> => {
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

// ── Photo grid (2 columns) ──
export const addPhotoGrid = async (
  ctx: PdfContext,
  photoUrls: string[],
  sectionLabel: string,
): Promise<void> => {
  if (photoUrls.length === 0) return;

  addPage(ctx);
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'bold');
  const titleText = `REGISTROS FOTOGRÁFICOS – ${sectionLabel.toUpperCase()}`;
  pdf.text(titleText, ML, ctx.currentY);
  ctx.currentY += LINE_H + 4;

  const photoW = (CW - 10) / 2;
  const photoH = photoW * 0.75;
  const COL_GAP = 10;

  let idx = 0;
  while (idx < photoUrls.length) {
    if (ctx.currentY + photoH + 15 > MAX_Y) addPage(ctx);
    const rowY = ctx.currentY;

    for (let col = 0; col < 2 && idx < photoUrls.length; col++) {
      const x = col === 0 ? ML : ML + photoW + COL_GAP;
      const imgData = await loadImage(photoUrls[idx]);
      if (imgData) {
        try { pdf.addImage(imgData.data, 'JPEG', x, rowY, photoW, photoH); }
        catch (e) { console.warn('Image error:', e); }
      }

      pdf.setFontSize(FONT_CAPTION);
      pdf.setFont('times', 'italic');
      pdf.text(`Foto ${idx + 1}`, x + photoW / 2, rowY + photoH + 4, { align: 'center' });

      idx++;
    }

    ctx.currentY = rowY + photoH + 10;
  }
};

// ── Footer + page numbers (top-right per ABNT) ──
export const addFooterAndPageNumbers = (ctx: PdfContext, orgName: string, skipPage1 = false): void => {
  const { pdf, pageCount } = ctx;

  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);

    // Page number – top right, 2 cm from edge
    if (!(skipPage1 && p === 1)) {
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
    const fw = pdf.getTextWidth(orgName);
    pdf.text(orgName, (PAGE_W - fw) / 2, PAGE_H - 10);
    pdf.setTextColor(0, 0, 0);
  }
};

// ── Signature block ──
export const addSignatureBlock = (
  ctx: PdfContext,
  orgName: string,
  dateText: string,
  sigLabel: string,
  extra?: { label: string; value: string }[],
): void => {
  const { pdf } = ctx;
  ctx.currentY += LINE_H;
  ensureSpace(ctx, 55);

  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'normal');
  pdf.text(dateText, ML, ctx.currentY);
  ctx.currentY += LINE_H * 3;

  ensureSpace(ctx, 35);
  const cx = PAGE_W / 2;
  const sigW = 80;
  pdf.setDrawColor(0);
  pdf.line(cx - sigW / 2, ctx.currentY, cx + sigW / 2, ctx.currentY);
  ctx.currentY += 5;

  pdf.setFont('times', 'normal');
  pdf.text(sigLabel, cx - pdf.getTextWidth(sigLabel) / 2, ctx.currentY);
  ctx.currentY += LINE_H + 2;

  if (extra && extra.length > 0) {
    for (const item of extra) {
      pdf.setFont('times', 'bold');
      pdf.text(item.label, cx - 60, ctx.currentY);
      const lw = pdf.getTextWidth(item.label);
      pdf.setFont('times', 'normal');
      pdf.text(item.value, cx - 60 + lw, ctx.currentY);
      ctx.currentY += LINE_H;
    }
  } else {
    pdf.setFont('times', 'bold');
    pdf.text(orgName, cx - pdf.getTextWidth(orgName) / 2, ctx.currentY);
  }
};
