import { StyleSheet, Font } from '@react-pdf/renderer'

// ══════════════════════════════════════════════════════════════
// ABNT NBR 14724 — Styles for @react-pdf/renderer
// Single source of truth — all values in POINTS (1mm ≈ 2.8346pt)
// ══════════════════════════════════════════════════════════════

const MM = 2.8346 // 1 mm in points

// ── ABNT Margins (mm → pt) ──
export const ABNT = {
  marginTop: 30 * MM,      // 3 cm
  marginBottom: 20 * MM,   // 2 cm
  marginLeft: 30 * MM,     // 3 cm
  marginRight: 20 * MM,    // 2 cm
  fontSize: 12,            // 12pt body
  fontCaption: 10,         // 10pt captions
  lineHeight: 1.5,         // 1.5 spacing
  indent: 12.5 * MM,       // 1.25cm paragraph indent
  logoBarHeight: 20 * MM,  // 20mm logo bar
  logoWidth: 30 * MM,      // 30mm default logo width
  logoGap: 4 * MM,         // 4mm gap between logos
}

export const COLORS = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  light: '#f5f5f5',
  border: '#d0d0d0',
  text: '#222222',
  muted: '#666666',
  white: '#ffffff',
}

export const FONTS = {
  regular: 'Times-Roman',
  bold: 'Times-Bold',
  italic: 'Times-Italic',
  boldItalic: 'Times-BoldItalic',
}

export const styles = StyleSheet.create({
  // ── Page ──
  page: {
    fontFamily: FONTS.regular,
    fontSize: ABNT.fontSize,
    color: COLORS.text,
    paddingTop: ABNT.marginTop,
    paddingBottom: ABNT.marginBottom + 20, // extra room for footer
    paddingLeft: ABNT.marginLeft,
    paddingRight: ABNT.marginRight,
    backgroundColor: COLORS.white,
  },
  coverPage: {
    fontFamily: FONTS.regular,
    fontSize: ABNT.fontSize,
    color: COLORS.text,
    paddingTop: ABNT.marginTop,
    paddingBottom: ABNT.marginBottom,
    paddingLeft: ABNT.marginLeft,
    paddingRight: ABNT.marginRight,
    backgroundColor: COLORS.white,
  },

  // ── Logo Bar Header ──
  logoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.accent,
  },
  logoImage: {
    height: ABNT.logoBarHeight * 0.85,
    objectFit: 'contain' as const,
  },

  // ── Legacy single-logo header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.accent,
  },
  headerLogo: {
    width: 48,
    height: 48,
    objectFit: 'contain' as const,
    marginRight: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 2,
  },
  headerOrg: {
    fontSize: 9,
    color: COLORS.muted,
  },

  // ── Footer institucional ──
  footer: {
    position: 'absolute',
    bottom: ABNT.marginBottom * 0.5,
    left: ABNT.marginLeft,
    right: ABNT.marginRight,
    borderTopWidth: 0.75,
    borderTopColor: COLORS.border,
    paddingTop: 4,
  },
  footerLine1: {
    fontFamily: FONTS.bold,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 2,
  },
  footerLine2: {
    fontFamily: FONTS.regular,
    fontSize: 7,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 2,
  },
  footerLine3: {
    fontFamily: FONTS.regular,
    fontSize: 7,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 2,
  },
  footerPageNumber: {
    fontFamily: FONTS.regular,
    fontSize: ABNT.fontSize,
    textAlign: 'right',
    color: COLORS.text,
    position: 'absolute',
    bottom: ABNT.marginBottom * 0.3,
    right: 0,
  },

  // ── Sections ──
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: ABNT.fontSize,
    color: COLORS.accent,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: COLORS.border,
  },
  subsectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: ABNT.fontSize,
    color: COLORS.secondary,
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: ABNT.fontSize,
    lineHeight: ABNT.lineHeight,
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'justify',
    textIndent: ABNT.indent,
  },

  // ── Photo Grid (3 columns) ──
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  photoCell: {
    width: '31%',
  },
  photoImage: {
    width: '100%',
    height: 110,
    objectFit: 'cover' as const,
    borderRadius: 2,
  },
  photoCaption: {
    fontFamily: FONTS.italic,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Table ──
  table: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tableHeader: {
    backgroundColor: COLORS.accent,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 5,
    fontFamily: FONTS.bold,
    fontSize: 9,
    color: COLORS.white,
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 9,
    color: COLORS.text,
  },
  tableRowAlt: {
    backgroundColor: COLORS.light,
  },

  // ── Info box ──
  infoBox: {
    backgroundColor: COLORS.light,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 2,
  },
  infoBoxText: {
    fontSize: 9.5,
    color: COLORS.text,
    lineHeight: ABNT.lineHeight,
  },
})
