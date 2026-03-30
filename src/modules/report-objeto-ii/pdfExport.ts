import jsPDF from 'jspdf';
import type { ReportObjIIData, PhotoWithCaption } from './types';

const ML = 30;   // ABNT left 3cm
const MR = 20;   // ABNT right 2cm
const MT = 30;   // ABNT top 3cm
const MB = 20;   // ABNT bottom 2cm
const PW = 210;
const PH = 297;
const CW = PW - ML - MR;
const FS = 12;
const LH = 1.5;
const INDENT = 12.5;
const HDR_H = 22;
const FTR_H = 18;

async function loadImg(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const r = await fetch(url);
    const b = await r.blob();
    return new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => res(null); fr.readAsDataURL(b); });
  } catch { return null; }
}

/** Strip HTML to plain text, preserving paragraph breaks */
function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Detect bold segments from HTML (simple approach) */
function extractFormattedSegments(html: string): Array<{ text: string; bold: boolean; italic: boolean }> {
  const segments: Array<{ text: string; bold: boolean; italic: boolean }> = [];
  // Simple parser: split by <strong>/<em> tags
  const raw = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ');

  // For PDF export, we use plain text with basic bold/italic detection
  const plainText = htmlToPlain(html);
  segments.push({ text: plainText, bold: false, italic: false });
  return segments;
}

export async function exportReportObjIIPdf(data: ReportObjIIData): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { cover, header, footer } = data;
  const enabledSections = data.sections.filter(s => s.enabled && (s.content.trim() || s.photos.length > 0));

  const [logoL, logoC, logoR] = await Promise.all([
    loadImg(header.logoLeft), loadImg(header.logoCenter), loadImg(header.logoRight),
  ]);

  const hasHdr = !!(logoL || logoC || logoR);
  const cTop = hasHdr ? MT + HDR_H : MT;
  const cBot = footer.enabled ? PH - MB - FTR_H : PH - MB;
  let y = cTop;
  let totalPages = 0;
  const lineH = FS * LH * 0.352778;

  // ── Draw header bar (logos only) ──
  const drawHeader = () => {
    if (!hasHdr) return;
    const sz = 18;
    if (logoL) try { doc.addImage(logoL, 'JPEG', ML, MT, sz, sz); } catch {}
    if (logoC) try { doc.addImage(logoC, 'JPEG', PW / 2 - sz / 2, MT, sz, sz); } catch {}
    if (logoR) try { doc.addImage(logoR, 'JPEG', PW - MR - sz, MT, sz, sz); } catch {}
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.line(ML, MT + HDR_H - 2, PW - MR, MT + HDR_H - 2);
  };

  // ── Draw footer ──
  const drawFooter = (num: number) => {
    if (footer.enabled) {
      const fY = PH - MB - FTR_H + 2;
      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.3);
      doc.line(ML, fY, PW - MR, fY);
      doc.setFont('times', 'normal');
      doc.setTextColor(80, 80, 80);
      const cx = PW / 2;
      if (footer.line1) { doc.setFontSize(8); doc.text(footer.line1, cx, fY + 4, { align: 'center' }); }
      if (footer.line2) { doc.setFontSize(7); doc.text(footer.line2, cx, fY + 8, { align: 'center' }); }
      if (footer.line3) { doc.setFontSize(7); doc.text(footer.line3, cx, fY + 12, { align: 'center' }); }
    }
    if (num > 0) {
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const t = String(num);
      doc.text(t, PW - MR - doc.getTextWidth(t), PH - 10);
    }
  };

  const newPage = () => {
    totalPages++;
    drawFooter(totalPages > 1 ? totalPages - 1 : 0);
    doc.addPage();
    y = cTop;
    drawHeader();
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > cBot) newPage();
  };

  const writeParagraph = (text: string, indent = true) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);

    const plainText = htmlToPlain(text);
    const paragraphs = plainText.split(/\n\n+/);

    for (const para of paragraphs) {
      if (!para.trim()) { y += lineH; continue; }

      const lines = para.split(/\n/);
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        if (!line.trim()) { y += lineH * 0.5; continue; }

        const isBullet = line.startsWith('• ');
        const useIndent = indent && !isBullet && li === 0;
        const effW = useIndent ? CW - INDENT : CW;
        const startX = useIndent ? ML + INDENT : ML;

        const wrapped = doc.splitTextToSize(line, effW);
        for (let w = 0; w < wrapped.length; w++) {
          ensureSpace(lineH);
          doc.text(wrapped[w], w === 0 ? startX : ML, y);
          y += lineH;
        }
      }
      y += lineH * 0.3;
    }
    y += lineH * 0.2;
  };

  const writeSectionTitle = (title: string) => {
    ensureSpace(lineH * 2);
    doc.setFont('times', 'bold');
    doc.setFontSize(FS);
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), ML, y);
    y += lineH * 1.5;
  };

  // ══════════ COVER ══════════
  totalPages++;
  if (cover.showLogos) {
    const sz = 20;
    if (logoL) try { doc.addImage(logoL, 'JPEG', ML, MT, sz, sz); } catch {}
    if (logoC) try { doc.addImage(logoC, 'JPEG', PW / 2 - sz / 2, MT, sz, sz); } catch {}
    if (logoR) try { doc.addImage(logoR, 'JPEG', PW - MR - sz, MT, sz, sz); } catch {}
  }

  let cy = PH / 2 - 30;
  doc.setFont('times', 'bold'); doc.setFontSize(18); doc.setTextColor(0, 0, 0);
  for (const l of doc.splitTextToSize(cover.title || 'RELATÓRIO DO OBJETO', CW)) {
    doc.text(l, (PW - doc.getTextWidth(l)) / 2, cy); cy += 10;
  }
  if (cover.subtitle) {
    cy += 4; doc.setFontSize(14); doc.setFont('times', 'normal');
    for (const l of doc.splitTextToSize(cover.subtitle, CW)) { doc.text(l, (PW - doc.getTextWidth(l)) / 2, cy); cy += 8; }
  }
  if (cover.organizationName) {
    cy += 4; doc.setFontSize(12); doc.text(cover.organizationName, (PW - doc.getTextWidth(cover.organizationName)) / 2, cy); cy += 7;
  }
  if (cover.fomentoNumber) {
    doc.setFontSize(11); doc.text(cover.fomentoNumber, (PW - doc.getTextWidth(cover.fomentoNumber)) / 2, cy); cy += 7;
  }
  if (cover.period) {
    cy += 2; doc.setFontSize(12); doc.text(cover.period, (PW - doc.getTextWidth(cover.period)) / 2, cy);
  }

  // Cover footer
  if (footer.enabled) {
    const fY = PH - MB - FTR_H + 2;
    doc.setDrawColor(156, 163, 175); doc.setLineWidth(0.3);
    doc.line(ML, fY, PW - MR, fY);
    doc.setFont('times', 'normal'); doc.setTextColor(80, 80, 80);
    const cx = PW / 2;
    if (footer.line1) { doc.setFontSize(8); doc.text(footer.line1, cx, fY + 4, { align: 'center' }); }
    if (footer.line2) { doc.setFontSize(7); doc.text(footer.line2, cx, fY + 8, { align: 'center' }); }
    if (footer.line3) { doc.setFontSize(7); doc.text(footer.line3, cx, fY + 12, { align: 'center' }); }
  }

  // ══════════ CONTENT ══════════
  newPage();

  // TOC
  writeSectionTitle('SUMÁRIO');
  doc.setFont('times', 'normal'); doc.setFontSize(FS);
  enabledSections.forEach((s, i) => { ensureSpace(lineH); doc.text(`${i + 1}. ${s.title}`, ML + INDENT, y); y += lineH; });
  y += lineH;

  for (let i = 0; i < enabledSections.length; i++) {
    const section = enabledSections[i];
    if (i > 0) newPage();

    writeSectionTitle(`${i + 1}. ${section.title}`);
    if (section.content.trim()) writeParagraph(section.content);

    // Photos with captions (3 cols)
    if (section.photos.length > 0) {
      const pw = (CW - 8) / 3;
      const ph = pw * 0.75;
      const captH = 5;
      const cellH = ph + captH + 3;

      for (let p = 0; p < section.photos.length; p++) {
        const col = p % 3;
        if (col === 0) ensureSpace(cellH);

        const px = ML + col * (pw + 4);
        const py = y;
        const photo = section.photos[p];
        const imgData = await loadImg(photo.url);
        if (imgData) { try { doc.addImage(imgData, 'JPEG', px, py, pw, ph); } catch {} }
        else { doc.setDrawColor(200, 200, 200); doc.rect(px, py, pw, ph); }

        if (photo.caption) {
          doc.setFont('times', 'italic'); doc.setFontSize(8); doc.setTextColor(80, 80, 80);
          const cl = doc.splitTextToSize(photo.caption, pw);
          doc.text(cl[0] || '', px + pw / 2, py + ph + 3, { align: 'center' });
        }

        if (col === 2 || p === section.photos.length - 1) y += cellH;
      }
    }
  }

  totalPages++;
  drawFooter(totalPages - 1);

  const safeName = data.projectName?.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').trim().replace(/\s+/g, '_') || 'Projeto';
  doc.save(`Relatorio_ObjII_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
}
