import React from 'react'
import { Document, Page, View, Text } from '@react-pdf/renderer'
import { styles, COLORS } from './shared/styles'
import { ReportHeader, ReportFooter } from './shared/HeaderFooter'
import { SectionBlock } from './shared/SectionBlock'
import type { ReportData } from '../schema'

export function ObjetoITemplate(data: ReportData) {
  return (
    <Document
      title={data.meta.title}
      author={data.meta.organization}
      subject={data.meta.subtitle}
      creator="GIRA ERP — AnnITech"
    >
      {/* Capa */}
      <Page size="A4" style={styles.page}>
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
              fontFamily: 'Helvetica-Bold',
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

          <Text style={{ fontSize: 11, color: COLORS.text }}>
            {data.meta.organization}
          </Text>

          {data.meta.period && (
            <Text style={{ fontSize: 10, color: COLORS.muted }}>
              {data.meta.period}
            </Text>
          )}

          <Text style={{ fontSize: 9, color: COLORS.muted, marginTop: 24 }}>
            Gerado em{' '}
            {new Date(data.meta.generatedAt).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </Page>

      {/* Conteúdo */}
      <Page size="A4" style={styles.page}>
        <ReportHeader meta={data.meta} />

        {data.sections.map((section) => (
          <SectionBlock key={section.id} section={section} level={0} />
        ))}

        <ReportFooter meta={data.meta} />
      </Page>
    </Document>
  )
}
