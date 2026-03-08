// ══════════════════════════════════════════════════════════════
// ABNT NBR 14724 constants — SINGLE SOURCE OF TRUTH
// ══════════════════════════════════════════════════════════════

// ── Strip zero-width and invisible Unicode characters that break jsPDF ──
const INVISIBLE_CHARS = /[\u200B\u200C\u200D\uFEFF\u200E\u200F\u2060\u00AD]/g;
export const sanitizeText = (text: string): string => text.replace(INVISIBLE_CHARS, '');

export const PAGE_W = 210;
export const PAGE_H = 297;
export const ML = 30;       // margin left  3 cm
export const MR = 20;       // margin right 2 cm
export const MT = 30;       // margin top   3 cm
export const MB = 20;       // margin bottom 2 cm
export const CW = PAGE_W - ML - MR;   // content width = 160 mm
export const MAX_Y = PAGE_H - MB - 4;  // leave room for footer
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
