import React from 'react'
import { Document, Page, Text } from '@react-pdf/renderer'
import type { ReportData } from '../schema'

export function ObjetoITemplate(data: ReportData) {
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
