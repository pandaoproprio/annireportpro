import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import { styles, ABNT, COLORS, FONTS } from './styles'
import type { ReportMeta, InstitutionalFooter, LogoBarConfig } from '../../schema'
import { CEAP_FOOTER_DEFAULTS } from '../../schema'

// ══════════════════════════════════════════════════════════════
// Logo Bar Header — single bar spanning the header area
// 3 slots (left / center / right), height = headerHeight
// ══════════════════════════════════════════════════════════════

interface HeaderProps {
  meta: ReportMeta
}

export function ReportHeader({ meta }: HeaderProps) {
  const lb = meta.logoBar
  const leftSrc = lb?.leftLogoBase64 ?? lb?.leftLogoUrl
  const centerSrc = lb?.centerLogoBase64 ?? lb?.centerLogoUrl
  const rightSrc = lb?.rightLogoBase64 ?? lb?.rightLogoUrl
  const legacySrc = meta.logoUrl
  const hasLogos = leftSrc || centerSrc || rightSrc || legacySrc

  if (!hasLogos) return null

  const barH = ((lb?.heightMm ?? 20) * 2.8346) * 0.85
  const alignment = lb?.alignment ?? 'space-between'
  const justifyContent =
    alignment === 'space-between' ? 'space-between' :
    alignment === 'space-around' ? 'space-around' :
    alignment === 'center' ? 'center' :
    alignment === 'right' ? 'flex-end' : 'flex-start'

  // Collect sources: use 3-slot if available, otherwise legacy single logo
  const sources: (string | undefined)[] = lb
    ? [leftSrc, centerSrc, rightSrc]
    : [legacySrc, undefined, undefined]

  const activeLogos = sources.filter(Boolean) as string[]

  return (
    <View
      style={{
        ...styles.logoBar,
        height: barH,
        justifyContent: justifyContent as any,
      }}
      fixed
    >
      {activeLogos.map((src, i) => (
        <Image
          key={i}
          src={src}
          style={{ height: barH, objectFit: 'contain' as any }}
        />
      ))}
    </View>
  )
}

// Legacy alias
export const ReportLogoBar = ReportHeader

// ══════════════════════════════════════════════════════════════
// Institutional Footer — 3 lines + page number (ABNT)
// ══════════════════════════════════════════════════════════════

interface FooterProps {
  meta: ReportMeta
  showPageNumber?: boolean
}

export function ReportFooter({ meta, showPageNumber = true }: FooterProps) {
  const f = meta.footer ?? {}
  const enabled = f.enabled !== false
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
          render={({ pageNumber }) =>
            pageNumber > 1 ? `${pageNumber}` : ''
          }
        />
      )}
    </View>
  )
}
