import {
  sanitizeText, StyledSegment, TextBlock, GalleryImage,
  ML, CW, LINE_H, FONT_BODY, FONT_CAPTION, INDENT,
} from './constants';
import { ensureSpace } from './pageLayout';
import type { PdfContext } from './pageLayout';
import type jsPDF from 'jspdf';

// ── Manual justification ──
const justifyLine = (pdf: jsPDF, words: string[], x: number, maxWidth: number, y: number) => {
  if (words.length <= 1) { pdf.text(words.join(''), x, y); return; }
  const totalTextW = words.reduce((sum, w) => sum + pdf.getTextWidth(w), 0);
  const gap = (maxWidth - totalTextW) / (words.length - 1);
  let cx = x;
  for (const word of words) { pdf.text(word, cx, y); cx += pdf.getTextWidth(word) + gap; }
};

// ── Justified paragraph with indent ──
export const addParagraph = (ctx: PdfContext, rawText: string): void => {
  const text = sanitizeText(rawText);
  if (!text || text.trim() === '') { ctx.currentY += LINE_H; return; }
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
        lineWords = [word]; lineW = wordW; isFirst = false;
      } else { lineWords.push(word); lineW += spaceW + wordW; }
    }
    if (lineWords.length > 0) allLines.push({ words: lineWords, width: isFirst ? CW - INDENT : CW, isFirst });
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const x = line.isFirst ? ML + INDENT : ML;
      ensureSpace(ctx, LINE_H);
      const isLastLine = i === allLines.length - 1;
      if (isLastLine || line.words.length <= 1) { pdf.text(line.words.join(' '), x, ctx.currentY); }
      else { justifyLine(pdf, line.words, x, line.width, ctx.currentY); }
      ctx.currentY += LINE_H;
    }
    ctx.currentY += 2;
  }
};

// ── Bullet justification helper ──
const justifyBulletLine = (pdf: jsPDF, words: string[], x: number, maxWidth: number, y: number) => {
  if (words.length <= 1) { pdf.text(words.join(''), x, y); return; }
  const totalTextW = words.reduce((sum, w) => sum + pdf.getTextWidth(w), 0);
  const gap = (maxWidth - totalTextW) / (words.length - 1);
  let cx = x;
  for (const word of words) { pdf.text(word, cx, y); cx += pdf.getTextWidth(word) + gap; }
};

// ── Bullet item ──
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
    pdf.setFont('times', 'bold');
    pdf.text(label, textX, ctx.currentY);
    const lw = pdf.getTextWidth(label + ' ');
    pdf.setFont('times', 'normal');
    const remaining = textW - lw;
    const contentLines: string[] = pdf.splitTextToSize(content, remaining);
    if (contentLines.length > 0 && contentLines[0]) {
      pdf.text(contentLines[0], textX + lw, ctx.currentY);
    }
    ctx.currentY += LINE_H;
    if (contentLines.length > 1) {
      const firstLineText = contentLines[0];
      const leftover = content.substring(firstLineText.length).trim();
      const fullLines: string[] = pdf.splitTextToSize(leftover, textW);
      for (let i = 0; i < fullLines.length; i++) {
        ensureSpace(ctx, LINE_H);
        const words = fullLines[i].split(/\s+/).filter(w => w);
        const isLast = i === fullLines.length - 1;
        if (!isLast && words.length > 1) { justifyBulletLine(pdf, words, textX, textW, ctx.currentY); }
        else { pdf.text(fullLines[i], textX, ctx.currentY); }
        ctx.currentY += LINE_H;
      }
    }
  } else {
    const splitLines: string[] = pdf.splitTextToSize(text, textW);
    for (let i = 0; i < splitLines.length; i++) {
      if (i > 0) ensureSpace(ctx, LINE_H);
      const words = splitLines[i].split(/\s+/).filter(w => w);
      const isLast = i === splitLines.length - 1;
      if (!isLast && words.length > 1) { justifyBulletLine(pdf, words, textX, textW, ctx.currentY); }
      else { pdf.text(splitLines[i], textX, ctx.currentY); }
      ctx.currentY += LINE_H;
    }
  }
  ctx.currentY += 1;
};

// ── Section title ──
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
      if (text) segments.push({ text, bold: parentBold, italic: parentItalic, underline: parentUnderline });
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

// ── HTML parser ──
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
        try {
          const imagesAttr = el.getAttribute('data-images') || el.getAttribute('images');
          if (imagesAttr) {
            const imgs = JSON.parse(imagesAttr) as GalleryImage[];
            const cols = parseInt(el.getAttribute('data-columns') || el.getAttribute('columns') || '2', 10);
            blocks.push({ type: 'gallery', content: '', galleryImages: imgs, galleryColumns: cols });
          }
        } catch { /* skip */ }
        const nestedImgs = el.querySelectorAll('img');
        if (nestedImgs.length > 0 && !el.getAttribute('data-images') && !el.getAttribute('images')) {
          const imgs: GalleryImage[] = [];
          nestedImgs.forEach(img => {
            const src = img.getAttribute('src') || '';
            const caption = img.getAttribute('data-caption') || img.getAttribute('alt') || '';
            if (src) imgs.push({ src, caption });
          });
          if (imgs.length > 0) blocks.push({ type: 'gallery', content: '', galleryImages: imgs, galleryColumns: 2 });
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
        const imgEl = el.querySelector('img');
        if (imgEl) {
          const src = imgEl.getAttribute('src') || '';
          const caption = imgEl.getAttribute('data-caption') || imgEl.getAttribute('alt') || '';
          const widthPct = parseInt(imgEl.getAttribute('data-width') || '100', 10);
          if (src) blocks.push({ type: 'image', content: caption, imageSrc: src, imageCaption: caption, imageWidthPct: widthPct });
          const textContent = el.textContent?.trim() || '';
          if (textContent) {
            const segs = extractSegments(el);
            blocks.push({ type: 'paragraph', content: textContent, segments: segs });
          }
        } else {
          const t = el.textContent?.trim() || '';
          const segs = extractSegments(el);
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

// ── Rich paragraph renderer ──
export const addRichParagraph = (ctx: PdfContext, segments: StyledSegment[]): void => {
  if (!segments || segments.length === 0) return;
  const cleanSegments = segments.map(s => ({ ...s, text: sanitizeText(s.text) })).filter(s => s.text);
  const { pdf } = ctx;
  pdf.setFontSize(FONT_BODY);

  interface WordPart { text: string; bold: boolean; italic: boolean; }
  interface CompositeWord { parts: WordPart[]; }

  const compositeWords: CompositeWord[] = [];
  let currentWord: CompositeWord = { parts: [] };

  for (const seg of cleanSegments) {
    const rawParts = seg.text.split(/(\s+)/);
    for (const part of rawParts) {
      if (/^\s+$/.test(part)) {
        if (currentWord.parts.length > 0) { compositeWords.push(currentWord); currentWord = { parts: [] }; }
      } else if (part) {
        currentWord.parts.push({ text: part, bold: seg.bold, italic: seg.italic });
      }
    }
  }
  if (currentWord.parts.length > 0) compositeWords.push(currentWord);
  if (compositeWords.length === 0) return;

  const getWordWidth = (word: CompositeWord): number => {
    let w = 0;
    for (const p of word.parts) {
      const style = p.bold && p.italic ? 'bolditalic' : p.bold ? 'bold' : p.italic ? 'italic' : 'normal';
      pdf.setFont('times', style);
      w += pdf.getTextWidth(p.text);
    }
    return w;
  };

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
      lineWords = [word]; lineW = wordW; isFirst = false;
    } else {
      lineW += (lineWords.length > 0 ? spaceW : 0) + wordW;
      lineWords.push(word);
    }
  }
  if (lineWords.length > 0) lines.push({ words: lineWords, isFirst, availW: isFirst ? CW - INDENT : CW });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const x = line.isFirst ? ML + INDENT : ML;
    ensureSpace(ctx, LINE_H);
    const isLastLine = i === lines.length - 1;
    if (isLastLine || line.words.length <= 1) {
      let cx = x;
      for (let wi = 0; wi < line.words.length; wi++) {
        if (wi > 0) cx += spaceW;
        renderWord(line.words[wi], cx, ctx.currentY);
        cx += getWordWidth(line.words[wi]);
      }
    } else {
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
