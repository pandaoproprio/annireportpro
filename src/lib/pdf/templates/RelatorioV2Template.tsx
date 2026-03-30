import React from 'react'
import { Document, Page } from '@react-pdf/renderer'
import { styles } from './shared/styles'
import { ReportHeader, ReportFooter } from './shared/HeaderFooter'
import { SectionBlock } from './shared/SectionBlock'
import type { ReportData } from '../schema'

export function RelatorioV2Template(data: ReportData) {
  return (
    <Document
      title={data.meta.title}
      author={data.meta.organization}
      creator="GIRA ERP — AnnITech"
    >
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
