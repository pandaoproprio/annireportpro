import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { styles, COLORS } from './shared/styles'
import { ReportHeader, ReportFooter } from './shared/HeaderFooter'
import { SectionBlock } from './shared/SectionBlock'
import type { ReportData } from '../schema'

export function RelatorioV2Template(data: ReportData) {
  return (
    <Document
      title={data.meta.title}
      author={data.meta.organization}
      subject={data.meta.subtitle}
      creator="GIRA ERP — AnnITech"
    >
      {/* ── Capa ── */}
      <Page size="A4" style={styles.coverPage}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontFamily: 'Times-Bold',
              color: COLORS.primary,
              textAlign: 'center',
            }}
          >
            {data.meta.title}
          </Text>

          {data.meta.subtitle && (
            <Text
              style={{
                fontSize: 13,
                fontFamily: 'Times-Roman',
                color: COLORS.muted,
                textAlign: 'center',
              }}
            >
              {data.meta.subtitle}
            </Text>
          )}

          <View
            style={{
              width: 60,
              height: 2,
              backgroundColor: COLORS.accent,
              marginVertical: 8,
            }}
          />

          <Text style={{ fontSize: 12, fontFamily: 'Times-Roman', color: COLORS.text }}>
            {data.meta.organization}
          </Text>

          {data.meta.period && (
            <Text style={{ fontSize: 11, fontFamily: 'Times-Roman', color: COLORS.muted }}>
              {data.meta.period}
            </Text>
          )}

          <Text style={{ fontSize: 9, fontFamily: 'Times-Italic', color: COLORS.muted, marginTop: 24 }}>
            Gerado em{' '}
            {new Date(data.meta.generatedAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </Page>

      {/* ── Conteúdo ── */}
      <Page size="A4" style={styles.page} wrap>
        <ReportHeader meta={data.meta} />

        {data.sections.map((section) => (
          <SectionBlock key={section.id} section={section} level={0} />
        ))}

        <ReportFooter meta={data.meta} />
      </Page>
    </Document>
  )
}
