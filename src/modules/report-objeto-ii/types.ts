export interface ReportObjIISection {
  id: string;
  key: string;
  title: string;
  enabled: boolean;
  content: string;
  photos: string[];
}

export const AVAILABLE_SECTIONS: Omit<ReportObjIISection, 'enabled' | 'content' | 'photos'>[] = [
  { id: 'object', key: 'object', title: 'OBJETO' },
  { id: 'summary', key: 'summary', title: 'RESUMO' },
  { id: 'goals', key: 'goals', title: 'DEMONSTRAÇÃO DO ALCANCE DAS METAS' },
  { id: 'other', key: 'other', title: 'OUTRAS AÇÕES DESENVOLVIDAS' },
  { id: 'communication', key: 'communication', title: 'PUBLICAÇÕES E DIVULGAÇÃO' },
  { id: 'satisfaction', key: 'satisfaction', title: 'GRAU DE SATISFAÇÃO' },
  { id: 'future', key: 'future', title: 'AÇÕES FUTURAS' },
  { id: 'expenses', key: 'expenses', title: 'COMPROVAÇÃO DE DESPESAS' },
  { id: 'links', key: 'links', title: 'DOCUMENTOS DE COMPROVAÇÃO' },
];

export interface ReportObjIIData {
  title: string;
  logoLeft: string;
  logoCenter: string;
  logoRight: string;
  sections: ReportObjIISection[];
  projectName: string;
  projectPeriod: string;
}
