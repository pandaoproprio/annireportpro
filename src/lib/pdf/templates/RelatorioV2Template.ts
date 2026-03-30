import React from 'react'
import { Document, Page, Text } from '@react-pdf/renderer'
import type { ReportData } from '../schema'

export function RelatorioV2Template(data: ReportData) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4' },
      React.createElement(Text, null, data.meta.title)
    )
  )
}
