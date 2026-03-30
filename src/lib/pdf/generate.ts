/*
  COMO USAR — exemplo para o botão de exportar do Objeto I:

  import { generateReport, downloadReport } from '@/lib/pdf/generate'
  import type { ReportData } from '@/lib/pdf/schema'

  async function handleExport() {
    const data: ReportData = {
      meta: {
        title: 'Relatório do Objeto I',
        subtitle: 'Prestação de Contas',
        organization: 'CEAP',
        logoUrl: orgLogoUrl,       // URL do Supabase Storage
        period: 'Jan–Dez 2025',
        generatedAt: new Date().toISOString(),
      },
      sections: mapReportStateToDomain(reportState), // seu mapper existente
      assets: [],  // preloadAssets preenche automaticamente
    }

    const blob = await generateReport(data, 'objeto-i')
    downloadReport(blob, `relatorio-objeto-i-${Date.now()}`)
  }
*/
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
