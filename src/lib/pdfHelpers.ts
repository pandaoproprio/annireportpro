import jsPDF from 'jspdf';
import { PageLayout, ImageLayoutItem } from '@/types/imageLayout';

// ── Strip zero-width and invisible Unicode characters that break jsPDF ──
// U+200B (zero-width space), U+200C/D (zero-width non-joiner/joiner),
// U+FEFF (BOM), U+200E/F (LTR/RTL marks), U+2060 (word joiner)
const INVISIBLE_CHARS = /[\u200B\u200C\u200D\uFEFF\u200E\u200F\u2060\u00AD]/g;
export const sanitizeText = (text: string): string => text.replace(INVISIBLE_CHARS, '');

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

export interface GalleryImage {
  src: string;
  caption: string;
}

export interface TextBlock {
  type: 'paragraph' | 'bullet' | 'image' | 'gallery';
  content: string;
  segments?: StyledSegment[];
  imageSrc?: string;
  imageCaption?: string;
  imageWidthPct?: number;
  galleryImages?: GalleryImage[];
  galleryColumns?: number;
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

// ── Build HeaderConfig from visual config + preloaded images (shared utility) ──
export const buildHeaderConfig = (
  vc: { headerBannerHeightMm?: number; headerBannerFit?: 'contain' | 'cover' | 'fill'; headerBannerVisible?: boolean;
    headerLeftText?: string; headerRightText?: string;
    logoConfig?: { visible?: boolean; widthMm?: number };
    logoCenterConfig?: { visible?: boolean; widthMm?: number };
    logoSecondaryConfig?: { visible?: boolean; widthMm?: number };
    headerLogoAlignment?: 'left' | 'center' | 'right' | 'space-between' | 'space-around';
    headerLogoGap?: number; headerTopPadding?: number; headerHeight?: number; headerContentSpacing?: number;
  } | undefined,
  images: { bannerImg?: PreloadedImage | null; logoImg?: PreloadedImage | null; logoSecondaryImg?: PreloadedImage | null; logoCenterImg?: PreloadedImage | null },
): HeaderConfig | undefined => {
  if (!vc) return undefined;
  const { bannerImg, logoImg, logoSecondaryImg, logoCenterImg } = images;
  if (!bannerImg && !logoImg && !logoCenterImg && !logoSecondaryImg) return undefined;
  return {
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
};

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
export const addParagraph = (ctx: PdfContext, rawText: string): void => {
  const text = sanitizeText(rawText);
  if (!text || text.trim() === '') {
    // Empty paragraph = blank line spacing (preserves Enter key line breaks)
    ctx.currentY += LINE_H;
    return;
  }
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

// ── Manual bullet justification helper ──
const justifyBulletLine = (pdf: jsPDF, words: string[], x: number, maxWidth: number, y: number) => {
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

// ── Bullet item with bold label detection and manual justification ──
export const addBulletItem = (ctx: PdfContext, rawText: string): void => {
  const text = sanitizeText(rawText);
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

    // Print bold label on first line
    pdf.setFont('times', 'bold');
    pdf.text(label, textX, ctx.currentY);
    const lw = pdf.getTextWidth(label + ' ');
    pdf.setFont('times', 'normal');

    // Wrap remaining content after the label
    const remaining = textW - lw;
    const contentLines: string[] = pdf.splitTextToSize(content, remaining);

    // First content line: same line as the label
    if (contentLines.length > 0 && contentLines[0]) {
      // Check if we need to re-wrap: first line fits in remaining, rest in full width
      pdf.text(contentLines[0], textX + lw, ctx.currentY);
    }
    ctx.currentY += LINE_H;

    // If there's more content, re-split for full width lines
    if (contentLines.length > 1) {
      // Get leftover text (everything after what fit on first line)
      const firstLineText = contentLines[0];
      const leftover = content.substring(firstLineText.length).trim();
      const fullLines: string[] = pdf.splitTextToSize(leftover, textW);
      for (let i = 0; i < fullLines.length; i++) {
        ensureSpace(ctx, LINE_H);
        const words = fullLines[i].split(/\s+/).filter(w => w);
        const isLast = i === fullLines.length - 1;
        if (!isLast && words.length > 1) {
          justifyBulletLine(pdf, words, textX, textW, ctx.currentY);
        } else {
          pdf.text(fullLines[i], textX, ctx.currentY);
        }
        ctx.currentY += LINE_H;
      }
    }
  } else {
    const splitLines: string[] = pdf.splitTextToSize(text, textW);
    for (let i = 0; i < splitLines.length; i++) {
      if (i > 0) ensureSpace(ctx, LINE_H);
      const words = splitLines[i].split(/\s+/).filter(w => w);
      const isLast = i === splitLines.length - 1;
      if (!isLast && words.length > 1) {
        justifyBulletLine(pdf, words, textX, textW, ctx.currentY);
      } else {
        pdf.text(splitLines[i], textX, ctx.currentY);
      }
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
  temp.innerHTML = sanitizeText(html);
  const blocks: TextBlock[] = [];

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push({ type: 'paragraph', content: text, segments: [{ text, bold: false, italic: false, underline: false }] });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'div' && el.hasAttribute('data-gallery')) {
        // Gallery node — parse images from data-images attribute
        try {
          const imagesAttr = el.getAttribute('data-images') || el.getAttribute('images');
          if (imagesAttr) {
            const imgs = JSON.parse(imagesAttr) as GalleryImage[];
            const cols = parseInt(el.getAttribute('data-columns') || el.getAttribute('columns') || '2', 10);
            blocks.push({ type: 'gallery', content: '', galleryImages: imgs, galleryColumns: cols });
          }
        } catch { /* skip malformed gallery */ }
        // Also check for nested img tags as fallback
        const nestedImgs = el.querySelectorAll('img');
        if (nestedImgs.length > 0 && !el.getAttribute('data-images') && !el.getAttribute('images')) {
          const imgs: GalleryImage[] = [];
          nestedImgs.forEach(img => {
            const src = img.getAttribute('src') || '';
            const caption = img.getAttribute('data-caption') || img.getAttribute('alt') || '';
            if (src) imgs.push({ src, caption });
          });
          if (imgs.length > 0) {
            blocks.push({ type: 'gallery', content: '', galleryImages: imgs, galleryColumns: 2 });
          }
        }
      } else if (tag === 'img') {
        const src = el.getAttribute('src') || '';
        const caption = el.getAttribute('data-caption') || el.getAttribute('alt') || '';
        const widthPct = parseInt(el.getAttribute('data-width') || '100', 10);
        if (src) blocks.push({ type: 'image', content: caption, imageSrc: src, imageCaption: caption, imageWidthPct: widthPct });
      } else if (tag === 'li') {
        const t = el.textContent?.trim() || '';
        const segs = extractSegments(el);
        if (t) blocks.push({ type: 'bullet', content: t, segments: segs });
      } else if (tag === 'p') {
        // Check if paragraph contains an img
        const imgEl = el.querySelector('img');
        if (imgEl) {
          const src = imgEl.getAttribute('src') || '';
          const caption = imgEl.getAttribute('data-caption') || imgEl.getAttribute('alt') || '';
          const widthPct = parseInt(imgEl.getAttribute('data-width') || '100', 10);
          if (src) blocks.push({ type: 'image', content: caption, imageSrc: src, imageCaption: caption, imageWidthPct: widthPct });
          // Also process non-img text in the paragraph
          const textContent = el.textContent?.trim() || '';
          if (textContent) {
            const segs = extractSegments(el);
            blocks.push({ type: 'paragraph', content: textContent, segments: segs });
          }
      } else {
          const t = el.textContent?.trim() || '';
          const segs = extractSegments(el);
          // Preserve empty paragraphs as spacing (blank lines from Enter)
          blocks.push({ type: 'paragraph', content: t, segments: t ? segs : [] });
        }
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
  // Sanitize all segment texts
  const cleanSegments = segments.map(s => ({ ...s, text: sanitizeText(s.text) })).filter(s => s.text);
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);

  // A composite word groups styled parts that belong to the same word (no whitespace between them)
  interface WordPart { text: string; bold: boolean; italic: boolean; }
  interface CompositeWord { parts: WordPart[]; }

  // Build composite words by tracking whitespace boundaries across segments
  const compositeWords: CompositeWord[] = [];
  let currentWord: CompositeWord = { parts: [] };

  for (const seg of cleanSegments) {
    const rawParts = seg.text.split(/(\s+)/);
    for (const part of rawParts) {
      if (/^\s+$/.test(part)) {
        // Whitespace → finalize current word
        if (currentWord.parts.length > 0) {
          compositeWords.push(currentWord);
          currentWord = { parts: [] };
        }
      } else if (part) {
        currentWord.parts.push({ text: part, bold: seg.bold, italic: seg.italic });
      }
    }
  }
  if (currentWord.parts.length > 0) {
    compositeWords.push(currentWord);
  }

  if (compositeWords.length === 0) return;

  // Measure a composite word width
  const getWordWidth = (word: CompositeWord): number => {
    let w = 0;
    for (const p of word.parts) {
      const style = p.bold && p.italic ? 'bolditalic' : p.bold ? 'bold' : p.italic ? 'italic' : 'normal';
      pdf.setFont('times', style);
      w += pdf.getTextWidth(p.text);
    }
    return w;
  };

  // Render a composite word at position (x, y)
  const renderWord = (word: CompositeWord, x: number, y: number) => {
    let cx = x;
    for (const p of word.parts) {
      const style = p.bold && p.italic ? 'bolditalic' : p.bold ? 'bold' : p.italic ? 'italic' : 'normal';
      pdf.setFont('times', style);
      pdf.text(p.text, cx, y);
      cx += pdf.getTextWidth(p.text);
    }
  };

  const spaceW = (() => { pdf.setFont('times', 'normal'); return pdf.getTextWidth(' '); })();

  // Build lines with word-wrapping
  interface WordLine { words: CompositeWord[]; isFirst: boolean; availW: number; }
  const lines: WordLine[] = [];
  let lineWords: CompositeWord[] = [];
  let lineW = 0;
  let isFirst = true;

  for (const word of compositeWords) {
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
      // Left-aligned
      let cx = x;
      for (let wi = 0; wi < line.words.length; wi++) {
        if (wi > 0) cx += spaceW;
        renderWord(line.words[wi], cx, ctx.currentY);
        cx += getWordWidth(line.words[wi]);
      }
    } else {
      // Justified: distribute space between composite words only
      let totalTextW = 0;
      for (const w of line.words) totalTextW += getWordWidth(w);
      const gap = (line.availW - totalTextW) / (line.words.length - 1);
      let cx = x;
      for (let wi = 0; wi < line.words.length; wi++) {
        renderWord(line.words[wi], cx, ctx.currentY);
        cx += getWordWidth(line.words[wi]) + (wi < line.words.length - 1 ? gap : 0);
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

// ── Inline image (from rich-text editor) ──
export const addInlineImage = async (ctx: PdfContext, src: string, caption?: string, widthPct?: number): Promise<void> => {
  const imgData = await loadImage(src);
  if (!imgData) return;
  const { pdf } = ctx;
  const pct = Math.max(20, Math.min(100, widthPct || 100));
  const maxW = CW * (pct / 100);
  const maxH = 110;
  const aspect = imgData.width / imgData.height;
  let drawW = maxW;
  let drawH = drawW / aspect;
  if (drawH > maxH) { drawH = maxH; drawW = drawH * aspect; }
  const totalH = drawH + (caption ? 14 : 4);
  ensureSpace(ctx, totalH);
  const x = ML + (CW - drawW) / 2; // center
  try { pdf.addImage(imgData.data, 'JPEG', x, ctx.currentY, drawW, drawH); } catch (e) { console.warn('Inline img error:', e); }
  ctx.currentY += drawH + 2;
  if (caption) {
    pdf.setFontSize(FONT_CAPTION);
    pdf.setFont('times', 'italic');
    const capLines: string[] = pdf.splitTextToSize(caption, CW);
    for (let j = 0; j < Math.min(capLines.length, 3); j++) {
      pdf.text(capLines[j], ML + (CW - pdf.getTextWidth(capLines[j])) / 2, ctx.currentY);
      ctx.currentY += 4.5;
    }
  }
  ctx.currentY += 4;
};

// ── Gallery grid (from rich-text inline gallery) ──
export const addGalleryGrid = async (ctx: PdfContext, images: GalleryImage[], columns: number = 2): Promise<void> => {
  if (!images || images.length === 0) return;
  const { pdf } = ctx;
  const cols = Math.max(1, Math.min(4, columns));
  const COL_GAP = 6;
  const photoW = (CW - COL_GAP * (cols - 1)) / cols;
  const photoH = photoW * 0.75;
  const CAPTION_H = 6;

  let idx = 0;
  while (idx < images.length) {
    const rowNeeded = photoH + CAPTION_H + 8;
    ensureSpace(ctx, rowNeeded);
    const rowY = ctx.currentY;

    for (let col = 0; col < cols && idx < images.length; col++) {
      const x = ML + col * (photoW + COL_GAP);
      const imgData = await loadImage(images[idx].src);
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
        try { pdf.addImage(imgData.data, 'JPEG', drawX, drawY, drawW, drawH); } catch (e) { console.warn('Gallery img error:', e); }
      }
      // Caption
      const cap = images[idx].caption;
      if (cap) {
        pdf.setFontSize(8);
        pdf.setFont('times', 'italic');
        const capLines: string[] = pdf.splitTextToSize(cap, photoW);
        for (let j = 0; j < Math.min(capLines.length, 2); j++) {
          pdf.text(capLines[j], x + (photoW - pdf.getTextWidth(capLines[j])) / 2, rowY + photoH + 3 + j * 3.5);
        }
      }
      idx++;
    }
    ctx.currentY = rowY + photoH + CAPTION_H + 6;
  }
  ctx.currentY += 2;
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

    // Page number – bottom right (skip cover)
    if (!isCoverPage) {
      pdf.setFontSize(FONT_BODY);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(0);
      pdf.text(String(p), PAGE_W - MR, PAGE_H - 10, { align: 'right' });
    }

    // Skip footer on cover page
    if (isCoverPage) continue;

    const instEnabled = info.institutionalEnabled !== false;
    const hasCustomText = !!info.customText;

    // Skip footer line entirely if nothing to show
    if (!instEnabled && !hasCustomText) continue;

    // Footer line
    pdf.setDrawColor(180, 180, 180);
    const footerLineY = PAGE_H - 18;
    pdf.line(ML, footerLineY, PAGE_W - MR, footerLineY);

    pdf.setTextColor(80, 80, 80);
    const topSp = info.topSpacing ?? 4;
    let footerY = footerLineY + topSp;

    // Alignment helper based on footerInfo.alignment
    const align = info.alignment || 'center';
    const getTextX = (textWidth: number): number => {
      if (align === 'left') return ML;
      if (align === 'right') return PAGE_W - MR - textWidth;
      return (PAGE_W - textWidth) / 2; // center
    };


    if (instEnabled) {
      const ls = info.lineSpacing ?? 3;

      // Line 1 (bold)
      const l1Text = info.line1Text || info.orgName || orgName;
      const l1Size = info.line1FontSize ?? 9;
      pdf.setFont('times', 'bold');
      pdf.setFontSize(l1Size);
      const l1Tw = pdf.getTextWidth(l1Text);
      pdf.text(l1Text, getTextX(l1Tw), footerY);
      footerY += ls;

      // Line 2 (normal)
      if (info.line2Text) {
        const l2Size = info.line2FontSize ?? 7;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(l2Size);
        const l2Tw = pdf.getTextWidth(info.line2Text);
        pdf.text(info.line2Text, getTextX(l2Tw), footerY);
        footerY += ls;
      }

      // Line 3 (normal)
      if (info.line3Text) {
        const l3Size = info.line3FontSize ?? 7;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(l3Size);
        const l3Tw = pdf.getTextWidth(info.line3Text);
        pdf.text(info.line3Text, getTextX(l3Tw), footerY);
        footerY += ls;
      }
    }

    // Custom text (italic, always after institutional)
    if (info.customText) {
      pdf.setFont('times', 'italic');
      pdf.setFontSize(7);
      const customTw = pdf.getTextWidth(info.customText);
      pdf.text(info.customText, getTextX(customTw), footerY);
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
  const sigW = 80;
  pdf.setDrawColor(0);
  pdf.line(ML, ctx.currentY, ML + sigW, ctx.currentY);
  ctx.currentY += 5;

  pdf.setFont('times', 'normal');
  pdf.text(sigLabel, ML, ctx.currentY);
  ctx.currentY += LINE_H + 2;

  if (extra && extra.length > 0) {
    for (const item of extra) {
      pdf.setFont('times', 'bold');
      pdf.text(item.label, ML, ctx.currentY);
      const lw = pdf.getTextWidth(item.label);
      pdf.setFont('times', 'normal');
      pdf.text(item.value, ML + lw, ctx.currentY);
      ctx.currentY += LINE_H;
    }
  } else {
    pdf.setFont('times', 'bold');
    pdf.text(orgName, ML, ctx.currentY);
  }
};
