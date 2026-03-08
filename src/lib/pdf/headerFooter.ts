import jsPDF from 'jspdf';
import {
  PreloadedImage, PAGE_W, PAGE_H, ML, MR, CW, HEADER_BANNER_H, HEADER_LOGO_H,
  HEADER_TOP_Y, FONT_BODY,
} from './constants';
import type { PdfContext } from './pageLayout';

// ── Header config ──
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
  contentSpacingMm?: number;
}

// ── Footer info ──
export interface FooterInfo {
  orgName: string;
  address?: string;
  website?: string;
  email?: string;
  phone?: string;
  customText?: string;
  alignment?: 'left' | 'center' | 'right';
  institutionalEnabled?: boolean;
  line1Text?: string;
  line1FontSize?: number;
  line2Text?: string;
  line2FontSize?: number;
  line3Text?: string;
  line3FontSize?: number;
  lineSpacing?: number;
  topSpacing?: number;
}

// ── Build HeaderConfig from visual config + preloaded images ──
export const buildHeaderConfig = (
  vc: {
    headerBannerHeightMm?: number; headerBannerFit?: 'contain' | 'cover' | 'fill'; headerBannerVisible?: boolean;
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

// ── Preload header images ──
export const preloadHeaderImages = async (
  bannerUrl?: string, logoUrl?: string, logoSecondaryUrl?: string, logoCenterUrl?: string,
): Promise<{ bannerImg: PreloadedImage | null; logoImg: PreloadedImage | null; logoSecondaryImg: PreloadedImage | null; logoCenterImg: PreloadedImage | null }> => {
  // Dynamic import to avoid circular dependency
  const { loadImage } = await import('./imageHelpers');
  const [bannerImg, logoImg, logoSecondaryImg, logoCenterImg] = await Promise.all([
    bannerUrl ? loadImage(bannerUrl) : Promise.resolve(null),
    logoUrl ? loadImage(logoUrl) : Promise.resolve(null),
    logoSecondaryUrl ? loadImage(logoSecondaryUrl) : Promise.resolve(null),
    logoCenterUrl ? loadImage(logoCenterUrl) : Promise.resolve(null),
  ]);
  return { bannerImg, logoImg, logoSecondaryImg, logoCenterImg };
};

// ── Render header on a specific page ──
export const renderHeaderOnPage = (pdf: jsPDF, config: HeaderConfig): void => {
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

  const headerY = topY + 3;
  const logoVisible = config.logoVisible !== false;
  const logoCenterVisible = config.logoCenterVisible !== false;
  const logoSecVisible = config.logoSecondaryVisible !== false;
  const logoH = Math.min(maxH, HEADER_LOGO_H);
  const gap = config.logoGapMm ?? 0;
  const alignment = config.logoAlignment ?? 'space-between';

  const logos: { img: PreloadedImage; computedW: number; position: 'left' | 'center' | 'right' }[] = [];
  if (logoImg && logoVisible) {
    const w = config.logoWidthMm ?? logoH * (logoImg.width / logoImg.height);
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
      try { pdf.addImage(logo.img.data, 'JPEG', cx, headerY, logo.computedW, Math.min(h, logoH)); } catch { /* skip */ }
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

// ── Footer + page numbers + headers (post-pass) ──
export const addFooterAndPageNumbers = (ctx: PdfContext, orgName: string, skipPage1 = false, footerInfo?: FooterInfo): void => {
  const { pdf, pageCount, headerConfig } = ctx;
  const info = footerInfo || { orgName };

  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    const isCoverPage = skipPage1 && p === 1;

    if (headerConfig && !isCoverPage) {
      renderHeaderOnPage(pdf, headerConfig);
    }

    if (!isCoverPage) {
      pdf.setFontSize(FONT_BODY);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(0);
      pdf.text(String(p), PAGE_W - MR, PAGE_H - 10, { align: 'right' });
    }

    if (isCoverPage) continue;

    const instEnabled = info.institutionalEnabled !== false;
    const hasCustomText = !!info.customText;
    if (!instEnabled && !hasCustomText) continue;

    pdf.setDrawColor(180, 180, 180);
    const footerLineY = PAGE_H - 18;
    pdf.line(ML, footerLineY, PAGE_W - MR, footerLineY);

    pdf.setTextColor(80, 80, 80);
    const topSp = info.topSpacing ?? 4;
    let footerY = footerLineY + topSp;

    const align = info.alignment || 'center';
    const getTextX = (textWidth: number): number => {
      if (align === 'left') return ML;
      if (align === 'right') return PAGE_W - MR - textWidth;
      return (PAGE_W - textWidth) / 2;
    };

    if (instEnabled) {
      const ls = info.lineSpacing ?? 3;
      const l1Text = info.line1Text || info.orgName || orgName;
      const l1Size = info.line1FontSize ?? 9;
      pdf.setFont('times', 'bold');
      pdf.setFontSize(l1Size);
      const l1Tw = pdf.getTextWidth(l1Text);
      pdf.text(l1Text, getTextX(l1Tw), footerY);
      footerY += ls;

      if (info.line2Text) {
        const l2Size = info.line2FontSize ?? 7;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(l2Size);
        const l2Tw = pdf.getTextWidth(info.line2Text);
        pdf.text(info.line2Text, getTextX(l2Tw), footerY);
        footerY += ls;
      }
      if (info.line3Text) {
        const l3Size = info.line3FontSize ?? 7;
        pdf.setFont('times', 'normal');
        pdf.setFontSize(l3Size);
        const l3Tw = pdf.getTextWidth(info.line3Text);
        pdf.text(info.line3Text, getTextX(l3Tw), footerY);
        footerY += ls;
      }
    }

    if (info.customText) {
      pdf.setFont('times', 'italic');
      pdf.setFontSize(7);
      const customTw = pdf.getTextWidth(info.customText);
      pdf.text(info.customText, getTextX(customTw), footerY);
    }

    pdf.setTextColor(0, 0, 0);
  }
};
