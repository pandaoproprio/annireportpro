import jsPDF from 'jspdf';
import type { ReportObjIIData, PhotoWithCaption } from './types';

const MARGIN_LEFT = 30;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 30;
const MARGIN_BOTTOM = 20;
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const FONT_SIZE = 12;
const LINE_HEIGHT = 1.5;
const FIRST_LINE_INDENT = 12.5;
const HEADER_HEIGHT = 22; // mm for header bar
const FOOTER_HEIGHT = 18; // mm for footer

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportReportObjIIPdf(data: ReportObjIIData): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { cover, header, footer } = data;
  const enabledSections = data.sections.filter(s => s.enabled && (s.content.trim() || s.photos.length > 0));

  // Pre-load logo images
  const [logoLeftData, logoCenterData, logoRightData] = await Promise.all([
    loadImageAsDataUrl(header.logoLeft),
    loadImageAsDataUrl(header.logoCenter),
    loadImageAsDataUrl(header.logoRight),
  ]);

  const hasHeader = logoLeftData || logoCenterData || logoRightData || header.leftText || header.rightText;
  const contentTop = hasHeader ? MARGIN_TOP + HEADER_HEIGHT : MARGIN_TOP;
  const contentBottom = footer.enabled ? PAGE_H - MARGIN_BOTTOM - FOOTER_HEIGHT : PAGE_H - MARGIN_BOTTOM;

  let y = contentTop;
  let pageNum = 0;
  let totalPages = 0; // will track for numbering

  // ── Draw header on current page ──
  const drawHeader = () => {
    if (!hasHeader) return;
    const hY = MARGIN_TOP;
    const logoSize = 18;

    if (logoLeftData) {
      try { doc.addImage(logoLeftData, 'JPEG', MARGIN_LEFT, hY, logoSize, logoSize); } catch {}
    }
    if (logoCenterData) {
      try { doc.addImage(logoCenterData, 'JPEG', PAGE_W / 2 - logoSize / 2, hY, logoSize, logoSize); } catch {}
    }
    if (logoRightData) {
      try { doc.addImage(logoRightData, 'JPEG', PAGE_W - MARGIN_RIGHT - logoSize, hY, logoSize, logoSize); } catch {}
    }

    if (header.leftText) {
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(header.leftText, MARGIN_LEFT, hY + logoSize + 3);
    }
    if (header.rightText) {
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      const tw = doc.getTextWidth(header.rightText);
      doc.text(header.rightText, PAGE_W - MARGIN_RIGHT - tw, hY + logoSize + 3);
    }

    // Separator line
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, MARGIN_TOP + HEADER_HEIGHT - 2, PAGE_W - MARGIN_RIGHT, MARGIN_TOP + HEADER_HEIGHT - 2);
  };

  // ── Draw footer on current page ──
  const drawFooter = (num: number) => {
    if (footer.enabled) {
      const fY = PAGE_H - MARGIN_BOTTOM - FOOTER_HEIGHT + 2;
      doc.setDrawColor(156, 163, 175);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_LEFT, fY, PAGE_W - MARGIN_RIGHT, fY);

      doc.setFont('times', 'normal');
      doc.setTextColor(80, 80, 80);
      const centerX = PAGE_W / 2;

      if (footer.line1) {
        doc.setFontSize(8);
        doc.text(footer.line1, centerX, fY + 4, { align: 'center' });
      }
      if (footer.line2) {
        doc.setFontSize(7);
        doc.text(footer.line2, centerX, fY + 8, { align: 'center' });
      }
      if (footer.line3) {
        doc.setFontSize(7);
        doc.text(footer.line3, centerX, fY + 12, { align: 'center' });
      }
    }

    // Page number (ABNT: bottom-right, 2cm from edges)
    if (num > 0) {
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const text = String(num);
      const tw = doc.getTextWidth(text);
      doc.text(text, PAGE_W - MARGIN_RIGHT - tw, PAGE_H - 10);
    }
  };

  // ── New page helper ──
  const newPage = () => {
    totalPages++;
    drawFooter(totalPages > 1 ? totalPages - 1 : 0);
    doc.addPage();
    y = contentTop;
    drawHeader();
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > contentBottom) {
      newPage();
    }
  };

  const lineH = FONT_SIZE * LINE_HEIGHT * 0.352778;

  // ── Write paragraph ──
  const writeParagraph = (text: string, indent = true) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(0, 0, 0);

    const plainText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const paragraphs = plainText.split(/\n+/);

    for (const para of paragraphs) {
      if (!para.trim()) { y += lineH; continue; }

      const effectiveW = indent ? CONTENT_W - FIRST_LINE_INDENT : CONTENT_W;
      const firstLineX = indent ? MARGIN_LEFT + FIRST_LINE_INDENT : MARGIN_LEFT;
      const allLines = doc.splitTextToSize(para, effectiveW);
      if (allLines.length === 0) continue;

      ensureSpace(lineH);
      doc.text(allLines[0], firstLineX, y);
      y += lineH;

      if (allLines.length > 1) {
        const remaining = para.substring(allLines[0].length).trim();
        if (remaining) {
          const restLines = doc.splitTextToSize(remaining, CONTENT_W);
          for (const line of restLines) {
            ensureSpace(lineH);
            doc.text(line, MARGIN_LEFT, y);
            y += lineH;
          }
        }
      }
    }
    y += lineH * 0.5;
  };

  const writeSectionTitle = (title: string) => {
    ensureSpace(lineH * 2);
    doc.setFont('times', 'bold');
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), MARGIN_LEFT, y);
    y += lineH * 1.5;
  };

  // ══════════ COVER PAGE ══════════
  totalPages++;

  if (cover.showLogos) {
    const logoSize = 20;
    const logoY = MARGIN_TOP;
    if (logoLeftData) { try { doc.addImage(logoLeftData, 'JPEG', MARGIN_LEFT, logoY, logoSize, logoSize); } catch {} }
    if (logoCenterData) { try { doc.addImage(logoCenterData, 'JPEG', PAGE_W / 2 - logoSize / 2, logoY, logoSize, logoSize); } catch {} }
    if (logoRightData) { try { doc.addImage(logoRightData, 'JPEG', PAGE_W - MARGIN_RIGHT - logoSize, logoY, logoSize, logoSize); } catch {} }
  }

  // Cover title
  let coverY = PAGE_H / 2 - 30;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  const titleLines = doc.splitTextToSize(cover.title || 'RELATÓRIO DO OBJETO', CONTENT_W);
  for (const line of titleLines) {
    const tw = doc.getTextWidth(line);
    doc.text(line, (PAGE_W - tw) / 2, coverY);
    coverY += 10;
  }

  // Subtitle
  if (cover.subtitle) {
    coverY += 4;
    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    const subLines = doc.splitTextToSize(cover.subtitle, CONTENT_W);
    for (const line of subLines) {
      const tw = doc.getTextWidth(line);
      doc.text(line, (PAGE_W - tw) / 2, coverY);
      coverY += 8;
    }
  }

  // Organization
  if (cover.organizationName) {
    coverY += 4;
    doc.setFontSize(12);
    const tw = doc.getTextWidth(cover.organizationName);
    doc.text(cover.organizationName, (PAGE_W - tw) / 2, coverY);
    coverY += 7;
  }

  // Fomento number
  if (cover.fomentoNumber) {
    doc.setFontSize(11);
    const tw = doc.getTextWidth(cover.fomentoNumber);
    doc.text(cover.fomentoNumber, (PAGE_W - tw) / 2, coverY);
    coverY += 7;
  }

  // Period
  if (cover.period) {
    coverY += 2;
    doc.setFontSize(12);
    const tw = doc.getTextWidth(cover.period);
    doc.text(cover.period, (PAGE_W - tw) / 2, coverY);
  }

  // Cover footer
  if (footer.enabled) {
    const fY = PAGE_H - MARGIN_BOTTOM - FOOTER_HEIGHT + 2;
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, fY, PAGE_W - MARGIN_RIGHT, fY);
    doc.setFont('times', 'normal');
    doc.setTextColor(80, 80, 80);
    const cx = PAGE_W / 2;
    if (footer.line1) { doc.setFontSize(8); doc.text(footer.line1, cx, fY + 4, { align: 'center' }); }
    if (footer.line2) { doc.setFontSize(7); doc.text(footer.line2, cx, fY + 8, { align: 'center' }); }
    if (footer.line3) { doc.setFontSize(7); doc.text(footer.line3, cx, fY + 12, { align: 'center' }); }
  }

  // ══════════ CONTENT PAGES ══════════
  newPage();

  // Table of Contents
  writeSectionTitle('SUMÁRIO');
  doc.setFont('times', 'normal');
  doc.setFontSize(FONT_SIZE);
  enabledSections.forEach((section, i) => {
    ensureSpace(lineH);
    doc.text(`${i + 1}. ${section.title}`, MARGIN_LEFT + FIRST_LINE_INDENT, y);
    y += lineH;
  });
  y += lineH;

  // Sections
  for (let i = 0; i < enabledSections.length; i++) {
    const section = enabledSections[i];

    if (i > 0) {
      newPage();
    }

    writeSectionTitle(`${i + 1}. ${section.title}`);
    if (section.content.trim()) {
      writeParagraph(section.content);
    }

    // Photos with captions (3 cols, ABNT grid)
    if (section.photos.length > 0) {
      const photoW = (CONTENT_W - 8) / 3;
      const photoH = photoW * 0.75;
      const captionH = 5;
      const cellH = photoH + captionH + 3;

      for (let p = 0; p < section.photos.length; p++) {
        const col = p % 3;

        if (col === 0) {
          ensureSpace(cellH);
        }

        const px = MARGIN_LEFT + col * (photoW + 4);
        const py = y;

        const photo = section.photos[p];
        const imgData = await loadImageAsDataUrl(photo.url);
        if (imgData) {
          try { doc.addImage(imgData, 'JPEG', px, py, photoW, photoH); } catch {}
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.rect(px, py, photoW, photoH);
        }

        // Caption below photo
        if (photo.caption) {
          doc.setFont('times', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 80);
          const captionLines = doc.splitTextToSize(photo.caption, photoW);
          doc.text(captionLines[0] || '', px + photoW / 2, py + photoH + 3, { align: 'center' });
        }

        if (col === 2 || p === section.photos.length - 1) {
          y += cellH;
        }
      }
    }
  }

  // Final footer + page number
  totalPages++;
  drawFooter(totalPages - 1);

  // Save
  const safeName = data.projectName?.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').trim().replace(/\s+/g, '_') || 'Projeto';
  doc.save(`Relatorio_ObjII_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
}
