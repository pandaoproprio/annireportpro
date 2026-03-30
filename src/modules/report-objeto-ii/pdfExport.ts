import jsPDF from 'jspdf';
import type { ReportObjIIData } from './types';

const MARGIN_LEFT = 30;    // mm — ABNT 3cm
const MARGIN_RIGHT = 20;   // mm — ABNT 2cm
const MARGIN_TOP = 30;     // mm — ABNT 3cm
const MARGIN_BOTTOM = 20;  // mm — ABNT 2cm
const PAGE_W = 210;
const PAGE_H = 297;
const CONTENT_W = PAGE_W - MARGIN_LEFT - MARGIN_RIGHT;
const FONT_SIZE = 12;
const LINE_HEIGHT = 1.5;   // ABNT 1.5 spacing
const FIRST_LINE_INDENT = 12.5; // mm — ABNT 1.25cm

async function loadImageAsDataUrl(url: string): Promise<string | null> {
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
  let y = MARGIN_TOP;
  let pageNum = 0;

  const enabledSections = data.sections.filter(s => s.enabled && s.content.trim());

  // ── Helper: add page number (bottom-right, ABNT) ──
  const addPageNumber = (num: number) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const text = String(num);
    const tw = doc.getTextWidth(text);
    doc.text(text, PAGE_W - MARGIN_RIGHT - tw, PAGE_H - 10);
  };

  // ── Helper: check if need new page ──
  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN_BOTTOM) {
      pageNum++;
      addPageNumber(pageNum);
      doc.addPage();
      y = MARGIN_TOP;
    }
  };

  // ── Helper: write wrapped paragraph with ABNT indent ──
  const writeParagraph = (text: string, indent = true) => {
    doc.setFont('times', 'normal');
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(0, 0, 0);
    const lineH = FONT_SIZE * LINE_HEIGHT * 0.352778; // pt→mm with spacing

    // Strip HTML tags for plain text
    const plainText = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

    const paragraphs = plainText.split(/\n+/);
    for (const para of paragraphs) {
      if (!para.trim()) {
        y += lineH;
        continue;
      }

      const effectiveW = indent ? CONTENT_W - FIRST_LINE_INDENT : CONTENT_W;
      const firstLineX = indent ? MARGIN_LEFT + FIRST_LINE_INDENT : MARGIN_LEFT;

      // Split first line separately for indent
      const firstLines = doc.splitTextToSize(para, effectiveW);
      if (firstLines.length === 0) continue;

      // Draw first line with indent
      ensureSpace(lineH);
      doc.text(firstLines[0], firstLineX, y);
      y += lineH;

      // Remaining lines at normal margin
      if (firstLines.length > 1) {
        const remaining = para.substring(firstLines[0].length).trim();
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
    y += lineH * 0.5; // paragraph spacing
  };

  // ── Helper: section title (bold uppercase) ──
  const writeSectionTitle = (title: string) => {
    const lineH = FONT_SIZE * LINE_HEIGHT * 0.352778;
    ensureSpace(lineH * 2);
    doc.setFont('times', 'bold');
    doc.setFontSize(FONT_SIZE);
    doc.setTextColor(0, 0, 0);
    doc.text(title.toUpperCase(), MARGIN_LEFT, y);
    y += lineH * 1.5;
  };

  // ══════════ COVER PAGE ══════════
  // Logos
  const logoSize = 20;
  const logos = [
    { url: data.logoLeft, x: MARGIN_LEFT },
    { url: data.logoCenter, x: PAGE_W / 2 - logoSize / 2 },
    { url: data.logoRight, x: PAGE_W - MARGIN_RIGHT - logoSize },
  ];

  for (const logo of logos) {
    if (logo.url) {
      const dataUrl = await loadImageAsDataUrl(logo.url);
      if (dataUrl) {
        try {
          doc.addImage(dataUrl, 'JPEG', logo.x, MARGIN_TOP, logoSize, logoSize);
        } catch { /* skip broken image */ }
      }
    }
  }

  // Title centered
  y = PAGE_H / 2 - 20;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(data.title || 'RELATÓRIO DO OBJETO', CONTENT_W);
  for (const line of titleLines) {
    const tw = doc.getTextWidth(line);
    doc.text(line, (PAGE_W - tw) / 2, y);
    y += 10;
  }

  // Project name
  if (data.projectName) {
    y += 5;
    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    const pLines = doc.splitTextToSize(data.projectName, CONTENT_W);
    for (const line of pLines) {
      const tw = doc.getTextWidth(line);
      doc.text(line, (PAGE_W - tw) / 2, y);
      y += 8;
    }
  }

  // Period
  if (data.projectPeriod) {
    y += 3;
    doc.setFontSize(12);
    const tw = doc.getTextWidth(data.projectPeriod);
    doc.text(data.projectPeriod, (PAGE_W - tw) / 2, y);
  }

  // ══════════ CONTENT PAGES ══════════
  doc.addPage();
  y = MARGIN_TOP;
  pageNum = 1;

  // Table of Contents
  writeSectionTitle('SUMÁRIO');
  doc.setFont('times', 'normal');
  doc.setFontSize(FONT_SIZE);
  const lineH = FONT_SIZE * LINE_HEIGHT * 0.352778;

  enabledSections.forEach((section, i) => {
    ensureSpace(lineH);
    doc.text(`${i + 1}. ${section.title}`, MARGIN_LEFT + FIRST_LINE_INDENT, y);
    y += lineH;
  });
  y += lineH;

  // Sections
  for (let i = 0; i < enabledSections.length; i++) {
    const section = enabledSections[i];

    // Start each major section on a new page (except first after TOC)
    if (i > 0) {
      pageNum++;
      addPageNumber(pageNum);
      doc.addPage();
      y = MARGIN_TOP;
    }

    writeSectionTitle(`${i + 1}. ${section.title}`);
    writeParagraph(section.content);

    // Photos grid (3 cols × 2 rows per page)
    if (section.photos.length > 0) {
      const photoW = (CONTENT_W - 8) / 3;  // 3 cols with 4mm gap
      const photoH = photoW * 0.75;

      for (let p = 0; p < section.photos.length; p++) {
        const col = p % 3;
        const row = Math.floor(p / 3) % 2;

        if (p > 0 && p % 6 === 0) {
          // New page for more photos
          pageNum++;
          addPageNumber(pageNum);
          doc.addPage();
          y = MARGIN_TOP;
        }

        if (col === 0 && (p % 6 !== 0 || p === 0)) {
          ensureSpace(photoH + 6);
        }

        const px = MARGIN_LEFT + col * (photoW + 4);
        const py = col === 0 ? y : y; // same row y

        const imgData = await loadImageAsDataUrl(section.photos[p]);
        if (imgData) {
          try {
            doc.addImage(imgData, 'JPEG', px, py, photoW, photoH);
          } catch { /* skip */ }
        } else {
          doc.setDrawColor(200, 200, 200);
          doc.rect(px, py, photoW, photoH);
        }

        if (col === 2 || p === section.photos.length - 1) {
          y += photoH + 4;
        }
      }
    }
  }

  // Final page number
  pageNum++;
  addPageNumber(pageNum);

  // Save
  const safeName = data.projectName?.replace(/[^a-zA-Z0-9À-ÿ\s-_]/g, '').trim().replace(/\s+/g, '_') || 'Projeto';
  doc.save(`Relatorio_ObjII_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
}
