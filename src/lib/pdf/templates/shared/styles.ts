import { StyleSheet } from '@react-pdf/renderer'

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
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  oblique: 'Helvetica-Oblique',
}

export const PAGE = {
  marginTop: 60,
  marginBottom: 60,
  marginLeft: 50,
  marginRight: 50,
}

export const styles = StyleSheet.create({
  page: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.text,
    paddingTop: PAGE.marginTop,
    paddingBottom: PAGE.marginBottom,
    paddingLeft: PAGE.marginLeft,
    paddingRight: PAGE.marginRight,
    backgroundColor: COLORS.white,
  },
  // Cabeçalho
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerLogo: {
    width: 48,
    height: 48,
    objectFit: 'contain',
    marginRight: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 14,
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
  // Rodapé
  footer: {
    position: 'absolute',
    bottom: 24,
    left: PAGE.marginLeft,
    right: PAGE.marginRight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.muted,
  },
  // Seções
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.accent,
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subsectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.secondary,
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.6,
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'justify',
  },
  // Grid de fotos
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
    objectFit: 'cover',
    borderRadius: 3,
  },
  photoCaption: {
    fontSize: 7.5,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 3,
  },
  // Tabela
  table: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
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
  // Caixa de destaque
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
    lineHeight: 1.5,
  },
})
