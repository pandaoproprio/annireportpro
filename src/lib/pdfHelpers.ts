import jsPDF from 'jspdf';
import { PageLayout, ImageLayoutItem } from '@/types/imageLayout';

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
export const MAX_Y = PAGE_H - MB - 4;  // leave room for footer (footer line at PAGE_H-18)
export const LINE_H = 7.2;  // ~1.5 × 12pt ≈ 7.2 mm
export const HEADER_BANNER_H = 20;  // max banner height in mm
export const HEADER_LOGO_H = 12;    // logo height in mm
export const HEADER_TOP_Y = 5;      // where header starts from top
export const INDENT = 12.5; // 1.25 cm paragraph indent
export const FONT_BODY = 12;
export const FONT_CAPTION = 10;

// ── Types ──
export interface StyledSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface TextBlock {
  type: 'paragraph' | 'bullet';
  content: string;
  segments?: StyledSegment[];
}

export interface PreloadedImage {
  data: string;
  width: number;
  height: number;
}

export interface HeaderConfig {
  bannerImg?: PreloadedImage | null;
  bannerHeightMm?: number;
  bannerFit?: 'contain' | 'cover' | 'fill';
  bannerVisible?: boolean;
  logoImg?: PreloadedImage | null;
  logoSecondaryImg?: PreloadedImage | null;
  logoCenterImg?: PreloadedImage | null;
  headerLeftText?: string;
  headerRightText?: string;
  // Advanced controls
  logoVisible?: boolean;
  logoCenterVisible?: boolean;
  logoSecondaryVisible?: boolean;
  logoWidthMm?: number;
  logoCenterWidthMm?: number;
  logoSecondaryWidthMm?: number;
  logoAlignment?: 'left' | 'center' | 'right' | 'space-between' | 'space-around';
  logoGapMm?: number;
  topPaddingMm?: number;
  headerHeightMm?: number;
  contentSpacingMm?: number; // gap between header bottom and content start
}

export interface PdfContext {
  pdf: jsPDF;
  currentY: number;
  pageCount: number;
  headerConfig?: HeaderConfig;
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
  // Set currentY based on whether there's a header that needs space
  ctx.currentY = getContentStartY(ctx);
};

// Calculate where content should start based on header config
export const getContentStartY = (ctx: PdfContext): number => {
  if (!ctx.headerConfig) return MT;
  const topPad = ctx.headerConfig.topPaddingMm ?? HEADER_TOP_Y;
  const gap = ctx.headerConfig.contentSpacingMm ?? 8;
  if (ctx.headerConfig.bannerImg && ctx.headerConfig.bannerVisible !== false) {
    const bannerH = ctx.headerConfig.bannerHeightMm ?? ctx.headerConfig.headerHeightMm ?? HEADER_BANNER_H;
    return topPad + bannerH + gap;
  }
  const headerH = ctx.headerConfig.headerHeightMm ?? HEADER_BANNER_H;
  const hasAnyLogo = (ctx.headerConfig.logoImg && ctx.headerConfig.logoVisible !== false)
    || (ctx.headerConfig.logoCenterImg && ctx.headerConfig.logoCenterVisible !== false)
    || (ctx.headerConfig.logoSecondaryImg && ctx.headerConfig.logoSecondaryVisible !== false);
  if (hasAnyLogo) {
    return topPad + 3 + (headerH || HEADER_LOGO_H) + gap;
  }
  return MT;
};

export const ensureSpace = (ctx: PdfContext, h: number): void => {
  if (ctx.currentY + h > MAX_Y) addPage(ctx);
};

// ── Manual justification: distributes words evenly across the line width ──
const justifyLine = (pdf: jsPDF, words: string[], x: number, maxWidth: number, y: number) => {
  if (words.length <= 1) {
    pdf.text(words.join(''), x, y);
    return;
  }
  const totalTextW = words.reduce((sum, w) => sum + pdf.getTextWidth(w), 0);
  const gap = (maxWidth - totalTextW) / (words.length - 1);
  let cx = x;
  for (const word of words) {
    pdf.text(word, cx, y);
    cx += pdf.getTextWidth(word) + gap;
  }
};

// ── Justified paragraph with 1.25 cm first-line indent and 1.5 line spacing ──
export const addParagraph = (ctx: PdfContext, text: string): void => {
  if (!text || text.trim() === '') return;
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'normal');
  const paragraphs = text.split('\n').filter(p => p.trim() !== '');
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(w => w);
    if (words.length === 0) continue;

    const allLines: { words: string[]; width: number; isFirst: boolean }[] = [];
    let lineWords: string[] = [];
    let lineW = 0;
    let isFirst = true;

    for (const word of words) {
      const wordW = pdf.getTextWidth(word);
      const spaceW = lineWords.length > 0 ? pdf.getTextWidth(' ') : 0;
      const availW = isFirst ? CW - INDENT : CW;

      if (lineWords.length > 0 && lineW + spaceW + wordW > availW) {
        allLines.push({ words: lineWords, width: availW, isFirst });
        lineWords = [word];
        lineW = wordW;
        isFirst = false;
      } else {
        lineWords.push(word);
        lineW += spaceW + wordW;
      }
    }
    if (lineWords.length > 0) {
      allLines.push({ words: lineWords, width: isFirst ? CW - INDENT : CW, isFirst });
    }

    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const x = line.isFirst ? ML + INDENT : ML;
      ensureSpace(ctx, LINE_H);
      const isLastLine = i === allLines.length - 1;
      if (isLastLine || line.words.length <= 1) {
        // Last line or single word: left-aligned
        pdf.text(line.words.join(' '), x, ctx.currentY);
      } else {
        justifyLine(pdf, line.words, x, line.width, ctx.currentY);
      }
      ctx.currentY += LINE_H;
    }
    ctx.currentY += 2;
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

// ── Section title (bold, Times 12pt) with underline ──
export const addSectionTitle = (ctx: PdfContext, title: string): void => {
  ensureSpace(ctx, LINE_H * 2);
  ctx.currentY += 4;
  ctx.pdf.setFontSize(FONT_BODY);
  ctx.pdf.setFont('times', 'bold');
  ctx.pdf.text(title, ML, ctx.currentY);
  // Draw underline beneath the title
  const lineY = ctx.currentY + 2;
  ctx.pdf.setDrawColor(0, 0, 0);
  ctx.pdf.setLineWidth(0.4);
  ctx.pdf.line(ML, lineY, ML + CW, lineY);
  ctx.currentY += LINE_H + 4;
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

// ── Extract styled segments from an element ──
const extractSegments = (el: Node, parentBold = false, parentItalic = false, parentUnderline = false): StyledSegment[] => {
  const segments: StyledSegment[] = [];

  el.childNodes.forEach(child => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      if (text) {
        segments.push({ text, bold: parentBold, italic: parentItalic, underline: parentUnderline });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase();
      const b = parentBold || tag === 'strong' || tag === 'b';
      const i = parentItalic || tag === 'em' || tag === 'i';
      const u = parentUnderline || tag === 'u';
      segments.push(...extractSegments(child, b, i, u));
    }
  });

  return segments;
};

// ── HTML parser (preserves bold/italic/underline) ──
export const parseHtmlToBlocks = (html: string): TextBlock[] => {
  if (!html) return [];
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const blocks: TextBlock[] = [];

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push({ type: 'paragraph', content: text, segments: [{ text, bold: false, italic: false, underline: false }] });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'li') {
        const t = el.textContent?.trim() || '';
        const segs = extractSegments(el);
        if (t) blocks.push({ type: 'bullet', content: t, segments: segs });
      } else if (tag === 'p') {
        const t = el.textContent?.trim() || '';
        const segs = extractSegments(el);
        if (t) blocks.push({ type: 'paragraph', content: t, segments: segs });
      } else {
        el.childNodes.forEach(c => processNode(c));
      }
    }
  };

  temp.childNodes.forEach(c => processNode(c));
  return blocks;
};

// ── Rich paragraph renderer: justified with bold/italic segments ──
export const addRichParagraph = (ctx: PdfContext, segments: StyledSegment[]): void => {
  if (!segments || segments.length === 0) return;
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);

  // Flatten segments into words with their style
  interface StyledWord { text: string; bold: boolean; italic: boolean; }
  const words: StyledWord[] = [];

  for (const seg of segments) {
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (part.trim()) {
        words.push({ text: part, bold: seg.bold, italic: seg.italic });
      }
    }
  }

  if (words.length === 0) return;

  // Build lines with word-wrapping
  interface WordLine { words: StyledWord[]; isFirst: boolean; availW: number; }
  const lines: WordLine[] = [];
  let lineWords: StyledWord[] = [];
  let lineW = 0;
  let isFirst = true;

  const getWordWidth = (w: StyledWord) => {
    const style = w.bold && w.italic ? 'bolditalic' : w.bold ? 'bold' : w.italic ? 'italic' : 'normal';
    pdf.setFont('times', style);
    return pdf.getTextWidth(w.text);
  };

  const getSpaceWidth = () => {
    pdf.setFont('times', 'normal');
    return pdf.getTextWidth(' ');
  };

  const spaceW = getSpaceWidth();

  for (const word of words) {
    const wordW = getWordWidth(word);
    const availW = isFirst ? CW - INDENT : CW;

    if (lineWords.length > 0 && lineW + spaceW + wordW > availW) {
      lines.push({ words: lineWords, isFirst, availW });
      lineWords = [word];
      lineW = wordW;
      isFirst = false;
    } else {
      lineW += (lineWords.length > 0 ? spaceW : 0) + wordW;
      lineWords.push(word);
    }
  }
  if (lineWords.length > 0) {
    lines.push({ words: lineWords, isFirst, availW: isFirst ? CW - INDENT : CW });
  }

  // Render lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const x = line.isFirst ? ML + INDENT : ML;
    ensureSpace(ctx, LINE_H);
    const isLastLine = i === lines.length - 1;

    if (isLastLine || line.words.length <= 1) {
      // Left-aligned: render words sequentially
      let cx = x;
      for (let wi = 0; wi < line.words.length; wi++) {
        const w = line.words[wi];
        const style = w.bold && w.italic ? 'bolditalic' : w.bold ? 'bold' : w.italic ? 'italic' : 'normal';
        pdf.setFont('times', style);
        if (wi > 0) cx += spaceW;
        pdf.text(w.text, cx, ctx.currentY);
        cx += pdf.getTextWidth(w.text);
      }
    } else {
      // Justified: distribute space
      let totalTextW = 0;
      for (const w of line.words) {
        const style = w.bold && w.italic ? 'bolditalic' : w.bold ? 'bold' : w.italic ? 'italic' : 'normal';
        pdf.setFont('times', style);
        totalTextW += pdf.getTextWidth(w.text);
      }
      const gap = (line.availW - totalTextW) / (line.words.length - 1);
      let cx = x;
      for (const w of line.words) {
        const style = w.bold && w.italic ? 'bolditalic' : w.bold ? 'bold' : w.italic ? 'italic' : 'normal';
        pdf.setFont('times', style);
        pdf.text(w.text, cx, ctx.currentY);
        cx += pdf.getTextWidth(w.text) + gap;
      }
    }
    ctx.currentY += LINE_H;
  }
  ctx.currentY += 2;
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

// ── Photo grid (adaptive: 1 photo = full width, 2+ = 2 columns) ──
export const addPhotoGrid = async (
  ctx: PdfContext,
  photoUrls: string[],
  sectionLabel: string,
  captions?: string[],
): Promise<void> => {
  if (photoUrls.length === 0) return;

  const { pdf } = ctx;

  // Section title
  ensureSpace(ctx, LINE_H * 3);
  ctx.currentY += 4;
  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'bold');
  const titleText = `REGISTROS FOTOGRÁFICOS – ${sectionLabel.toUpperCase()}`;
  pdf.text(titleText, ML, ctx.currentY);
  ctx.currentY += LINE_H + 4;

  const useSingleColumn = photoUrls.length === 1;
  const COL_GAP = 8;
  const photoW = useSingleColumn ? CW : (CW - COL_GAP) / 2;
  const photoH = useSingleColumn ? photoW * 0.65 : photoW * 0.85;
  const CAPTION_H = 6;
  const cols = useSingleColumn ? 1 : 2;

  let idx = 0;
  while (idx < photoUrls.length) {
    const rowNeeded = photoH + CAPTION_H + 6;
    if (ctx.currentY + rowNeeded > MAX_Y) addPage(ctx);
    const rowY = ctx.currentY;

    for (let col = 0; col < cols && idx < photoUrls.length; col++) {
      const x = useSingleColumn ? ML : (col === 0 ? ML : ML + photoW + COL_GAP);
      const imgData = await loadImage(photoUrls[idx]);
      if (imgData) {
        const imgAspect = imgData.width / imgData.height;
        const cellAspect = photoW / photoH;
        let drawW: number, drawH: number, drawX: number, drawY: number;
        if (imgAspect > cellAspect) {
          drawW = photoW;
          drawH = photoW / imgAspect;
          drawX = x;
          drawY = rowY + (photoH - drawH) / 2;
        } else {
          drawH = photoH;
          drawW = photoH * imgAspect;
          drawX = x + (photoW - drawW) / 2;
          drawY = rowY;
        }
        try { pdf.addImage(imgData.data, 'JPEG', drawX, drawY, drawW, drawH); }
        catch (e) { console.warn('Image error:', e); }
      }

      // Caption
      const caption = captions?.[idx] || `Foto ${idx + 1}`;
      pdf.setFontSize(FONT_CAPTION);
      pdf.setFont('times', 'italic');
      const capLines: string[] = pdf.splitTextToSize(caption, photoW);
      const capY = rowY + photoH + 3;
      for (let cl = 0; cl < Math.min(capLines.length, 2); cl++) {
        pdf.text(capLines[cl], x + photoW / 2, capY + cl * 4, { align: 'center' });
      }

      idx++;
    }

    ctx.currentY = rowY + photoH + CAPTION_H + 4;
  }
};

// ── Render photos using advanced Konva layout (coordinates in mm) ──
export const addPhotoLayout = async (
  ctx: PdfContext,
  layout: PageLayout,
  sectionLabel: string,
): Promise<void> => {
  if (!layout.images || layout.images.length === 0) return;

  const { pdf } = ctx;

  // Start on a new page for the layout
  addPage(ctx);

  // Section title at top
  pdf.setFontSize(FONT_BODY);
  pdf.setFont('times', 'bold');
  const titleText = `REGISTROS FOTOGRÁFICOS – ${sectionLabel.toUpperCase()}`;
  pdf.text(titleText, ML, ctx.currentY);
  ctx.currentY += LINE_H + 4;

  // Sort by zIndex for correct layering
  const sorted = [...layout.images].sort((a, b) => a.zIndex - b.zIndex);

  for (const item of sorted) {
    const imgData = await loadImage(item.src);
    if (!imgData) continue;

    // Draw border rectangle if borderWidth > 0
    if (item.borderWidth > 0) {
      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b] as const;
      };
      const [br, bg, bb] = hexToRgb(item.borderColor || '#000000');
      pdf.setDrawColor(br, bg, bb);
      pdf.setLineWidth(item.borderWidth);
      pdf.rect(
        item.x - item.borderWidth / 2,
        item.y - item.borderWidth / 2,
        item.width + item.borderWidth,
        item.height + item.borderWidth,
        'S'
      );
    }

    // Draw image at exact mm coordinates
    try {
      pdf.addImage(imgData.data, 'JPEG', item.x, item.y, item.width, item.height);
    } catch (e) {
      console.warn('Layout image error:', e);
    }

    // Caption below image
    if (item.caption) {
      pdf.setFontSize(FONT_CAPTION);
      pdf.setFont('times', 'italic');
      pdf.setTextColor(0);
      const capX = item.x + item.width / 2;
      const capY = item.y + item.height + 4;
      const capLines: string[] = pdf.splitTextToSize(item.caption, item.width);
      for (let cl = 0; cl < Math.min(capLines.length, 2); cl++) {
        pdf.text(capLines[cl], capX, capY + cl * 4, { align: 'center' });
      }
    }
  }

  // Update currentY to after the lowest image
  const maxBottom = Math.max(...sorted.map(i => i.y + i.height + (i.caption ? 10 : 0)));
  ctx.currentY = maxBottom + 4;
};

// ── Footer info for rich footer ──
export interface FooterInfo {
  orgName: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  customText?: string;
  alignment?: 'left' | 'center' | 'right';
  // Institutional per-line footer
  institutionalEnabled?: boolean;
  line1Text?: string;
  line1FontSize?: number; // pt
  line2Text?: string;
  line2FontSize?: number; // pt
  line3Text?: string;
  line3FontSize?: number; // pt
  lineSpacing?: number; // mm
  topSpacing?: number; // mm
}

// ── Preload header images for reuse on all pages ──
export const preloadHeaderImages = async (
  bannerUrl?: string,
  logoUrl?: string,
  logoSecondaryUrl?: string,
  logoCenterUrl?: string,
): Promise<{ bannerImg: PreloadedImage | null; logoImg: PreloadedImage | null; logoSecondaryImg: PreloadedImage | null; logoCenterImg: PreloadedImage | null }> => {
  const [bannerImg, logoImg, logoSecondaryImg, logoCenterImg] = await Promise.all([
    bannerUrl ? loadImage(bannerUrl) : Promise.resolve(null),
    logoUrl ? loadImage(logoUrl) : Promise.resolve(null),
    logoSecondaryUrl ? loadImage(logoSecondaryUrl) : Promise.resolve(null),
    logoCenterUrl ? loadImage(logoCenterUrl) : Promise.resolve(null),
  ]);
  return { bannerImg, logoImg, logoSecondaryImg, logoCenterImg };
};

// ── Render header on a specific page (called in post-pass) ──
const renderHeaderOnPage = (pdf: jsPDF, config: HeaderConfig): void => {
  const { bannerImg, logoImg, logoSecondaryImg, logoCenterImg, headerLeftText, headerRightText } = config;
  const topY = config.topPaddingMm ?? HEADER_TOP_Y;
  const maxH = config.headerHeightMm ?? HEADER_BANNER_H;

  if (bannerImg && config.bannerVisible !== false) {
    const bannerMaxH = config.bannerHeightMm ?? maxH;
    const bannerAspect = bannerImg.width / bannerImg.height;
    const bannerH = Math.min(CW / bannerAspect, bannerMaxH);
    const drawW = bannerH * bannerAspect;
    const drawX = ML + (CW - drawW) / 2;
    try { pdf.addImage(bannerImg.data, 'JPEG', drawX, topY, drawW, bannerH); } catch (e) { console.warn('Banner error:', e); }
    return;
  }

  // Fallback: logos + text
  const headerY = topY + 3;
  const logoVisible = config.logoVisible !== false;
  const logoCenterVisible = config.logoCenterVisible !== false;
  const logoSecVisible = config.logoSecondaryVisible !== false;
  const logoH = Math.min(maxH, HEADER_LOGO_H);
  const gap = config.logoGapMm ?? 0;
  const alignment = config.logoAlignment ?? 'space-between';

  // Collect visible logos with their computed widths
  const logos: { img: PreloadedImage; computedW: number; position: 'left' | 'center' | 'right' }[] = [];
  if (logoImg && logoVisible) {
    const w = config.logoWidthMm ?? logoH * (logoImg.width / logoImg.height);
    const h = w / (logoImg.width / logoImg.height);
    logos.push({ img: logoImg, computedW: w, position: 'left' });
  }
  if (logoCenterImg && logoCenterVisible) {
    const w = config.logoCenterWidthMm ?? logoH * (logoCenterImg.width / logoCenterImg.height);
    logos.push({ img: logoCenterImg, computedW: w, position: 'center' });
  }
  if (logoSecondaryImg && logoSecVisible) {
    const w = config.logoSecondaryWidthMm ?? logoH * (logoSecondaryImg.width / logoSecondaryImg.height);
    logos.push({ img: logoSecondaryImg, computedW: w, position: 'right' });
  }

  if (logos.length > 0) {
    const totalLogosW = logos.reduce((s, l) => s + l.computedW, 0);
    const totalGapW = (logos.length - 1) * gap;

    let startX = ML;
    let effectiveGap = gap;

    if (alignment === 'space-between' && logos.length > 1) {
      effectiveGap = (CW - totalLogosW) / (logos.length - 1);
      startX = ML;
    } else if (alignment === 'space-around' && logos.length > 0) {
      effectiveGap = (CW - totalLogosW) / (logos.length + 1);
      startX = ML + effectiveGap;
    } else if (alignment === 'center') {
      startX = ML + (CW - totalLogosW - totalGapW) / 2;
      effectiveGap = gap;
    } else if (alignment === 'right') {
      startX = ML + CW - totalLogosW - totalGapW;
      effectiveGap = gap;
    } else {
      effectiveGap = gap;
    }

    let cx = startX;
    for (const logo of logos) {
      const h = logo.computedW / (logo.img.width / logo.img.height);
      try { pdf.addImage(logo.img.data, 'JPEG', cx, headerY, logo.computedW, Math.min(h, logoH)); } catch (e) { /* skip */ }
      cx += logo.computedW + effectiveGap;
    }
  }

  if (headerLeftText) {
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(headerLeftText, ML + (logoImg && logoVisible ? 15 : 0), headerY + 8);
    pdf.setTextColor(0);
  }

  if (headerRightText) {
    pdf.setFontSize(8);
    pdf.setFont('times', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(headerRightText, PAGE_W - MR, headerY + 8, { align: 'right' });
    pdf.setTextColor(0);
  }
};

// ── Footer + page numbers + headers (top-right per ABNT) ──
export const addFooterAndPageNumbers = (ctx: PdfContext, orgName: string, skipPage1 = false, footerInfo?: FooterInfo): void => {
  const { pdf, pageCount, headerConfig } = ctx;
  const info = footerInfo || { orgName };

  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    const isCoverPage = skipPage1 && p === 1;

    // ── Header on every page EXCEPT cover ──
    if (headerConfig && !isCoverPage) {
      renderHeaderOnPage(pdf, headerConfig);
    }

    // Page number – top right, 2 cm from edge (skip cover)
    if (!isCoverPage) {
      pdf.setFontSize(FONT_BODY);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(0);
      pdf.text(String(p), PAGE_W - MR, 15, { align: 'right' });
    }

    // Skip footer on cover page
    if (isCoverPage) continue;

    // Footer line
    pdf.setDrawColor(180, 180, 180);
    const footerLineY = PAGE_H - 18;
    pdf.line(ML, footerLineY, PAGE_W - MR, footerLineY);

    pdf.setTextColor(80, 80, 80);
    const topSp = info.topSpacing ?? 4;
    let footerY = footerLineY + topSp;

    // Center-align helper (institutional footer is always centered)
    const getCenterX = (textWidth: number): number => (PAGE_W - textWidth) / 2;

    const instEnabled = info.institutionalEnabled !== false;

    if (instEnabled) {
      const ls = info.lineSpacing ?? 3;

      // Line 1 (bold)
      const l1Text = info.line1Text || info.orgName || orgName;
      const l1Size = info.line1FontSize ?? 9;
      pdf.setFont('times', 'bold');
      pdf.setFontSize(l1Size);
      const l1Tw = pdf.getTextWidth(l1Text);
      pdf.text(l1Text, getCenterX(l1Tw), footerY);
      footerY += ls;

      // Line 2 (normal)
      if (info.line2Text) {
        const l2Size = info.line2FontSize ?? 7;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(l2Size);
        const l2Tw = pdf.getTextWidth(info.line2Text);
        pdf.text(info.line2Text, getCenterX(l2Tw), footerY);
        footerY += ls;
      }

      // Line 3 (normal)
      if (info.line3Text) {
        const l3Size = info.line3FontSize ?? 7;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(l3Size);
        const l3Tw = pdf.getTextWidth(info.line3Text);
        pdf.text(info.line3Text, getCenterX(l3Tw), footerY);
        footerY += ls;
      }
    }

    // Custom text (italic, always after institutional)
    if (info.customText) {
      pdf.setFont('times', 'italic');
      pdf.setFontSize(7);
      const customTw = pdf.getTextWidth(info.customText);
      pdf.text(info.customText, getCenterX(customTw), footerY);
    }

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
