import { pdf } from '@react-pdf/renderer'
import type { ReportData, TemplateName } from './schema'
import { preloadAssets } from './assetLoader'

// Os templates serão adicionados nos próximos passos
// Por enquanto, importação lazy para não quebrar o build
async function resolveTemplate(name: TemplateName, data: ReportData) {
  switch (name) {
    case 'objeto-i': {
      const { ObjetoITemplate } = await import('./templates/ObjetoITemplate')
      return ObjetoITemplate(data)
    }
    case 'objeto-ii': {
      const { ObjetoIITemplate } = await import('./templates/ObjetoIITemplate')
      return ObjetoIITemplate(data)
    }
    case 'relatorio-v2': {
      const { RelatorioV2Template } = await import('./templates/RelatorioV2Template')
      return RelatorioV2Template(data)
    }
    default:
      throw new Error(`Template desconhecido: ${name}`)
  }
}

export async function generateReport(
  rawData: ReportData,
  template: TemplateName
): Promise<Blob> {
  const data = await preloadAssets(rawData)
  const doc = await resolveTemplate(template, data)
  return await pdf(doc).toBlob()
}

export function downloadReport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
