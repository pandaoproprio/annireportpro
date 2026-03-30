import React from 'react'
import { View, Text, Image } from '@react-pdf/renderer'
import { styles } from './styles'
import type { ReportMeta } from '../../schema'

interface HeaderProps {
  meta: ReportMeta
}

export function ReportHeader({ meta }: HeaderProps) {
  return (
    <View style={styles.header} fixed>
      {meta.logoUrl && (
        <Image src={meta.logoUrl} style={styles.headerLogo} />
      )}
      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>{meta.title}</Text>
        {meta.subtitle && (
          <Text style={styles.headerSubtitle}>{meta.subtitle}</Text>
        )}
        <Text style={styles.headerOrg}>{meta.organization}</Text>
        {meta.period && (
          <Text style={styles.headerOrg}>Período: {meta.period}</Text>
        )}
      </View>
    </View>
  )
}

export function ReportFooter({ meta }: HeaderProps) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{meta.organization}</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Página ${pageNumber} de ${totalPages}`
        }
      />
      <Text style={styles.footerText}>
        Gerado em {new Date(meta.generatedAt).toLocaleDateString('pt-BR')}
      </Text>
    </View>
  )
}
