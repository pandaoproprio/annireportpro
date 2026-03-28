import jsPDF from 'jspdf';
import { MT, MB, PAGE_H, ML, CW, LINE_H, FONT_BODY, HEADER_BANNER_H, HEADER_LOGO_H, HEADER_TOP_Y, MAX_Y } from './constants';
import type { HeaderConfig } from './headerFooter';

// ── PDF rendering context ──
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

// ── Calculate where content should start based on header config ──
export const getContentStartY = (ctx: PdfContext): number => {
  if (!ctx.headerConfig) return MT;
  const topPad = ctx.headerConfig.topPaddingMm ?? HEADER_TOP_Y;
  const gap = ctx.headerConfig.contentSpacingMm ?? 4;
  if (ctx.headerConfig.bannerImg && ctx.headerConfig.bannerVisible !== false) {
    const bannerH = ctx.headerConfig.bannerHeightMm ?? ctx.headerConfig.headerHeightMm ?? HEADER_BANNER_H;
    return topPad + bannerH + gap;
  }
  const configuredHeaderH = ctx.headerConfig.headerHeightMm ?? HEADER_BANNER_H;
  const headerH = Math.max(Math.min(configuredHeaderH, HEADER_BANNER_H), HEADER_LOGO_H + 2);
  const hasAnyLogo = (ctx.headerConfig.logoImg && ctx.headerConfig.logoVisible !== false)
    || (ctx.headerConfig.logoCenterImg && ctx.headerConfig.logoCenterVisible !== false)
    || (ctx.headerConfig.logoSecondaryImg && ctx.headerConfig.logoSecondaryVisible !== false);
  if (hasAnyLogo) {
    return Math.max(MT + 1, topPad + headerH + gap);
  }
  return MT;
};

// ── Page management ──
export const addPage = (ctx: PdfContext): void => {
  ctx.pdf.addPage();
  ctx.pageCount++;
  ctx.currentY = getContentStartY(ctx);
};

export const ensureSpace = (ctx: PdfContext, h: number): void => {
  if (ctx.currentY + h > MAX_Y) addPage(ctx);
};

// ── Signature block ──
export const addSignatureBlock = (
  ctx: PdfContext, orgName: string, dateText: string, sigLabel: string,
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
