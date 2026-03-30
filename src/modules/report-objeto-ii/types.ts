export interface PhotoWithCaption {
  url: string;
  caption: string;
}

export interface ReportObjIISection {
  id: string;
  key: string;
  title: string;
  enabled: boolean;
  content: string; // HTML content from TipTap
  photos: PhotoWithCaption[];
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

export interface CoverConfig {
  title: string;
  subtitle: string;
  organizationName: string;
  fomentoNumber: string;
  period: string;
  showLogos: boolean;
}

export interface HeaderConfig {
  logoLeft: string;
  logoCenter: string;
  logoRight: string;
}

export interface FooterConfig {
  enabled: boolean;
  line1: string;
  line2: string;
  line3: string;
}

export interface ReportObjIIData {
  cover: CoverConfig;
  header: HeaderConfig;
  footer: FooterConfig;
  sections: ReportObjIISection[];
  projectName: string;
}

export const DEFAULT_COVER: CoverConfig = {
  title: 'RELATÓRIO DO OBJETO',
  subtitle: '',
  organizationName: '',
  fomentoNumber: '',
  period: '',
  showLogos: true,
};

export const DEFAULT_HEADER: HeaderConfig = {
  logoLeft: '',
  logoCenter: '',
  logoRight: '',
};

export const DEFAULT_FOOTER: FooterConfig = {
  enabled: true,
  line1: 'Centro de Articulação de Populações Marginalizadas - CEAP',
  line2: 'R. Sr. dos Passos, 174 - Sl 701 - Centro, Rio de Janeiro - RJ, 20061-011',
  line3: 'ceapoficial.org.br | falecom@ceapoficial.org.br | (21) 9 7286-4717',
};
