import type { ReportData, ReportSection } from '../schema'

export function mapObjetoIIToReportData(state: any, orgLogoUrl?: string): ReportData {
  const sections: ReportSection[] = []

  // Reutiliza a estrutura de seções se já existir no estado do Objeto II
  if (state.sections && Array.isArray(state.sections)) {
    for (const sec of state.sections) {
      sections.push({
        id: sec.id ?? String(Math.random()),
        title: sec.title ?? sec.titulo ?? 'Seção',
        content: sec.content ?? sec.conteudo ?? '',
        photos: sec.photos?.map((f: any) => ({
          url: f.url ?? f,
          caption: f.caption ?? f.legenda ?? '',
        })) ?? [],
        subsections: [],
      })
    }
  }

  // Execução financeira
  if (state.execucaoFinanceira || state.financial) {
    const fin = state.execucaoFinanceira ?? state.financial
    sections.push({
      id: 'financeiro',
      title: 'Execução Financeira',
      content: [
        fin.valorPrevisto && `Valor Previsto: ${fin.valorPrevisto}`,
        fin.valorExecutado && `Valor Executado: ${fin.valorExecutado}`,
        fin.saldo && `Saldo: ${fin.saldo}`,
        fin.observacoes && `Observações: ${fin.observacoes}`,
      ]
        .filter(Boolean)
        .join('\n'),
    })
  }

  return {
    meta: {
      title: state.titulo ?? 'Relatório do Objeto II',
      subtitle: 'Prestação de Contas — Objeto II',
      organization: state.organizacao ?? '',
      logoUrl: orgLogoUrl,
      period: state.periodo ?? '',
      generatedAt: new Date().toISOString(),
    },
    sections,
    assets: [],
  }
}
