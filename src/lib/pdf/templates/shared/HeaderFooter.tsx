import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import { styles, ABNT, COLORS } from './styles'
import type { ReportMeta, InstitutionalFooter, LogoBarConfig } from '../../schema'
import { CEAP_FOOTER_DEFAULTS } from '../../schema'

// ══════════════════════════════════════════════════════════════
// Logo Bar Header — 3 slots (left / center / right)
// Equivalent to the jsPDF renderHeaderOnPage
// ══════════════════════════════════════════════════════════════

interface LogoBarProps {
  logoBar?: LogoBarConfig
  legacyLogoUrl?: string  // backward compat: single logo
  meta: ReportMeta
}

export function ReportLogoBar({ logoBar, legacyLogoUrl, meta }: LogoBarProps) {
  const leftSrc = logoBar?.leftLogoBase64 ?? logoBar?.leftLogoUrl
  const centerSrc = logoBar?.centerLogoBase64 ?? logoBar?.centerLogoUrl
  const rightSrc = logoBar?.rightLogoBase64 ?? logoBar?.rightLogoUrl

  const hasLogos = leftSrc || centerSrc || rightSrc || legacyLogoUrl

  if (!hasLogos) {
    // Fallback: text-only header
    return (
      <View style={styles.header} fixed>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{meta.title}</Text>
          {meta.subtitle && <Text style={styles.headerSubtitle}>{meta.subtitle}</Text>}
          <Text style={styles.headerOrg}>{meta.organization}</Text>
        </View>
      </View>
    )
  }

  // If no logoBar but has legacyLogoUrl, render single-logo layout
  if (!logoBar && legacyLogoUrl) {
    return (
      <View style={styles.header} fixed>
        <Image src={legacyLogoUrl} style={styles.headerLogo} />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{meta.title}</Text>
          {meta.subtitle && <Text style={styles.headerSubtitle}>{meta.subtitle}</Text>}
          <Text style={styles.headerOrg}>{meta.organization}</Text>
        </View>
      </View>
    )
  }

  // Full 3-slot logo bar
  const logoH = (logoBar?.heightMm ?? 20) * 2.8346 * 0.85
  const alignment = logoBar?.alignment ?? 'space-between'

  const justifyContent =
    alignment === 'space-between' ? 'space-between' :
    alignment === 'space-around' ? 'space-around' :
    alignment === 'center' ? 'center' :
    alignment === 'right' ? 'flex-end' :
    'flex-start'

  return (
    <View
      style={{
        ...styles.logoBar,
        justifyContent: justifyContent as any,
      }}
      fixed
    >
      {leftSrc && (
        <Image
          src={leftSrc}
          style={{ height: logoH, objectFit: 'contain' as any }}
        />
      )}
      {centerSrc && (
        <Image
          src={centerSrc}
          style={{ height: logoH, objectFit: 'contain' as any }}
        />
      )}
      {rightSrc && (
        <Image
          src={rightSrc}
          style={{ height: logoH, objectFit: 'contain' as any }}
        />
      )}
    </View>
  )
}

// ══════════════════════════════════════════════════════════════
// Legacy Header (backward compatible)
// ══════════════════════════════════════════════════════════════

interface HeaderProps {
  meta: ReportMeta
}

export function ReportHeader({ meta }: HeaderProps) {
  return (
    <ReportLogoBar
      logoBar={meta.logoBar}
      legacyLogoUrl={meta.logoUrl}
      meta={meta}
    />
  )
}

// ══════════════════════════════════════════════════════════════
// Institutional Footer — 3 lines + page number (ABNT)
// CEAP defaults as fallback
// ══════════════════════════════════════════════════════════════

interface FooterProps {
  meta: ReportMeta
  showPageNumber?: boolean
}

export function ReportFooter({ meta, showPageNumber = true }: FooterProps) {
  const f = meta.footer ?? {}
  const enabled = f.enabled !== false // default true
  const line1 = f.line1 || CEAP_FOOTER_DEFAULTS.line1
  const line2 = f.line2 || CEAP_FOOTER_DEFAULTS.line2
  const line3 = f.line3 || CEAP_FOOTER_DEFAULTS.line3
  const align = f.alignment || CEAP_FOOTER_DEFAULTS.alignment

  return (
    <View style={styles.footer} fixed>
      {enabled && (
        <>
          <Text style={{ ...styles.footerLine1, textAlign: align }}>{line1}</Text>
          <Text style={{ ...styles.footerLine2, textAlign: align }}>{line2}</Text>
          <Text style={{ ...styles.footerLine3, textAlign: align }}>{line3}</Text>
        </>
      )}

      {showPageNumber && (
        <Text
          style={styles.footerPageNumber}
          render={({ pageNumber, totalPages }) =>
            pageNumber > 1 ? `${pageNumber}` : ''
          }
        />
      )}
    </View>
  )
}
