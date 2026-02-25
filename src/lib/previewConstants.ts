/**
 * Preview Layout Constants — derived from pdfHelpers.ts ABNT constants.
 * Single source of truth for mm → px conversion in the web preview.
 *
 * At 96 DPI: 1 mm ≈ 3.7795 px.
 * We use 3.78 as a practical constant.
 */
import { PAGE_W, PAGE_H, ML, MR, MT, MB, CW, LINE_H, INDENT, FONT_BODY, FONT_CAPTION } from './pdfHelpers';

// ── Conversion factor ──
export const MM_TO_PX = 3.78; // 96 DPI

// ── Re-export PDF constants for convenience ──
export { PAGE_W, PAGE_H, ML, MR, MT, MB, CW, LINE_H, INDENT, FONT_BODY, FONT_CAPTION };

// ── Derived pixel values ──
export const PAGE_W_PX = PAGE_W * MM_TO_PX;  // ~793px
export const PAGE_H_PX = PAGE_H * MM_TO_PX;  // ~1122px
export const ML_PX = ML * MM_TO_PX;           // ~113px
export const MR_PX = MR * MM_TO_PX;           // ~75px
export const MT_PX = MT * MM_TO_PX;           // ~113px
export const MB_PX = MB * MM_TO_PX;           // ~75px
export const CW_PX = CW * MM_TO_PX;          // ~604px
export const INDENT_PX = INDENT * MM_TO_PX;   // ~47px

// ── Helper: convert mm to px ──
export const mmToPx = (mm: number): number => mm * MM_TO_PX;

// ── A4 page style (inline) ──
export const a4PageStyle: React.CSSProperties = {
  fontFamily: 'Times New Roman, serif',
  fontSize: `${FONT_BODY}pt`,
  lineHeight: '1.5',
  padding: `${MT}mm ${MR}mm ${MB}mm ${ML}mm`,
  textAlign: 'justify' as const,
};
