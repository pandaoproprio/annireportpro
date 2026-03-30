import type { ReportData, ReportSection } from '../schema'

/**
 * Adapta o estado atual do Objeto I (useReportState) para ReportData.
 * Ajuste os campos conforme os nomes reais do seu estado.
 */
export function mapObjetoIToReportData(state: any, orgLogoUrl?: string): ReportData {
  const sections: ReportSection[] = []

  // Identificação
  if (state.identification) {
    sections.push({
      id: 'identification',
      title: 'Identificação do Objeto',
      content: [
        state.identification.projectName && `Projeto: ${state.identification.projectName}`,
        state.identification.responsavel && `Responsável: ${state.identification.responsavel}`,
        state.identification.vigencia && `Vigência: ${state.identification.vigencia}`,
        state.identification.valorTotal && `Valor Total: ${state.identification.valorTotal}`,
      ]
        .filter(Boolean)
        .join('\n'),
    })
  }

  // Descrição / Objeto
  if (state.objeto || state.descricao) {
    sections.push({
      id: 'objeto',
      title: 'Descrição do Objeto',
      content: state.objeto ?? state.descricao ?? '',
    })
  }

  // Metas e resultados
  if (state.metas || state.resultados) {
    sections.push({
      id: 'metas',
      title: 'Metas e Resultados Alcançados',
      content: state.metas ?? state.resultados ?? '',
    })
  }

  // Atividades
  if (state.atividades && Array.isArray(state.atividades)) {
    sections.push({
      id: 'atividades',
      title: 'Atividades Realizadas',
      subsections: state.atividades.map((a: any, i: number) => ({
        id: `atividade-${i}`,
        title: a.titulo ?? a.nome ?? `Atividade ${i + 1}`,
        content: a.descricao ?? '',
        photos: a.fotos?.map((f: any) => ({
          url: f.url ?? f,
          caption: f.legenda ?? f.caption ?? '',
        })) ?? [],
      })),
    })
  }

  // Fotos gerais (caso não estejam vinculadas a atividades)
  if (state.fotos && Array.isArray(state.fotos) && state.fotos.length > 0) {
    sections.push({
      id: 'fotos',
      title: 'Registro Fotográfico',
      photos: state.fotos.map((f: any) => ({
        url: f.url ?? f,
        caption: f.legenda ?? f.caption ?? '',
      })),
    })
  }

  // Considerações finais
  if (state.consideracoes || state.conclusao) {
    sections.push({
      id: 'conclusao',
      title: 'Considerações Finais',
      content: state.consideracoes ?? state.conclusao ?? '',
    })
  }

  return {
    meta: {
      title: state.identification?.projectName ?? state.titulo ?? 'Relatório do Objeto I',
      subtitle: 'Prestação de Contas — Objeto I',
      organization: state.identification?.organizacao ?? state.organizacao ?? '',
      logoUrl: orgLogoUrl,
      period: state.identification?.vigencia ?? state.periodo ?? '',
      generatedAt: new Date().toISOString(),
    },
    sections,
    assets: [],
  }
}
