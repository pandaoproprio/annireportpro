export interface TemplateField {
  id: string;
  type: 'rich_text' | 'plain_text' | 'photo' | 'document';
  label: string;
  isRequired: boolean;
  allowMultiple: boolean;
  allowAI: boolean;
  maxFiles: number | null;
}

export interface TemplateSection {
  id: string;
  title: string;
  key: string;
  type: 'fixed' | 'editable' | 'custom';
  isVisible: boolean;
  isRequired: boolean;
  order: number;
  fields: TemplateField[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'objeto' | 'equipe' | 'justificativa' | 'personalizado';
  structure: TemplateSection[];
  exportConfig: { abnt: boolean };
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectReportTemplate {
  id: string;
  projectId: string;
  templateId: string;
  reportData: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  template?: ReportTemplate;
}

// Default template structures
export const DEFAULT_OBJETO_SECTIONS: TemplateSection[] = [
  {
    id: 'object', title: 'OBJETO', key: 'object', type: 'fixed',
    isVisible: true, isRequired: true, order: 0,
    fields: [{ id: 'object_text', type: 'rich_text', label: 'Descrição do Objeto', isRequired: true, allowMultiple: false, allowAI: false, maxFiles: null }],
  },
  {
    id: 'summary', title: 'RESUMO', key: 'summary', type: 'editable',
    isVisible: true, isRequired: true, order: 1,
    fields: [
      { id: 'summary_text', type: 'rich_text', label: 'Narrativa', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null },
      { id: 'summary_photos', type: 'photo', label: 'Registro Fotográfico', isRequired: false, allowMultiple: true, allowAI: false, maxFiles: 20 },
    ],
  },
  {
    id: 'goals', title: 'DEMONSTRAÇÃO DO ALCANCE DAS METAS ESTABELECIDAS', key: 'goals', type: 'editable',
    isVisible: true, isRequired: true, order: 2,
    fields: [
      { id: 'goals_text', type: 'rich_text', label: 'Narrativa por Meta', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null },
      { id: 'goals_photos', type: 'photo', label: 'Registro Fotográfico', isRequired: false, allowMultiple: true, allowAI: false, maxFiles: 20 },
    ],
  },
  {
    id: 'other', title: 'OUTRAS INFORMAÇÕES SOBRE AS AÇÕES DESENVOLVIDAS', key: 'other', type: 'editable',
    isVisible: true, isRequired: false, order: 3,
    fields: [
      { id: 'other_text', type: 'rich_text', label: 'Narrativa', isRequired: false, allowMultiple: false, allowAI: true, maxFiles: null },
      { id: 'other_photos', type: 'photo', label: 'Registro Fotográfico', isRequired: false, allowMultiple: true, allowAI: false, maxFiles: 20 },
    ],
  },
  {
    id: 'communication', title: 'PUBLICAÇÕES E AÇÕES DE DIVULGAÇÃO', key: 'communication', type: 'editable',
    isVisible: true, isRequired: false, order: 4,
    fields: [
      { id: 'comm_text', type: 'rich_text', label: 'Narrativa', isRequired: false, allowMultiple: false, allowAI: true, maxFiles: null },
      { id: 'comm_photos', type: 'photo', label: 'Registro Fotográfico', isRequired: false, allowMultiple: true, allowAI: false, maxFiles: 20 },
    ],
  },
  {
    id: 'satisfaction', title: 'GRAU DE SATISFAÇÃO DO PÚBLICO-ALVO', key: 'satisfaction', type: 'editable',
    isVisible: true, isRequired: false, order: 5,
    fields: [{ id: 'satisfaction_text', type: 'rich_text', label: 'Narrativa', isRequired: false, allowMultiple: false, allowAI: true, maxFiles: null }],
  },
  {
    id: 'future', title: 'SOBRE AS AÇÕES FUTURAS', key: 'future', type: 'editable',
    isVisible: true, isRequired: false, order: 6,
    fields: [{ id: 'future_text', type: 'rich_text', label: 'Narrativa', isRequired: false, allowMultiple: false, allowAI: true, maxFiles: null }],
  },
  {
    id: 'expenses', title: 'COMPROVAÇÃO DA EXECUÇÃO DOS ITENS DE DESPESA', key: 'expenses', type: 'editable',
    isVisible: true, isRequired: false, order: 7,
    fields: [{ id: 'expenses_table', type: 'plain_text', label: 'Tabela de Despesas', isRequired: false, allowMultiple: false, allowAI: false, maxFiles: null }],
  },
  {
    id: 'links', title: 'DOCUMENTOS DE COMPROVAÇÃO DO CUMPRIMENTO DO OBJETO', key: 'links', type: 'editable',
    isVisible: true, isRequired: false, order: 8,
    fields: [{ id: 'links_docs', type: 'document', label: 'Documentos', isRequired: false, allowMultiple: true, allowAI: false, maxFiles: 10 }],
  },
];

export const DEFAULT_EQUIPE_SECTIONS: TemplateSection[] = [
  {
    id: 'identification', title: '1. Dados de Identificação', key: 'identification', type: 'fixed',
    isVisible: true, isRequired: true, order: 0,
    fields: [
      { id: 'provider', type: 'plain_text', label: 'Prestador', isRequired: true, allowMultiple: false, allowAI: false, maxFiles: null },
      { id: 'responsible', type: 'plain_text', label: 'Responsável Técnico', isRequired: true, allowMultiple: false, allowAI: false, maxFiles: null },
      { id: 'function', type: 'plain_text', label: 'Função', isRequired: true, allowMultiple: false, allowAI: false, maxFiles: null },
    ],
  },
  {
    id: 'execution', title: '2. Relato de Execução', key: 'execution', type: 'editable',
    isVisible: true, isRequired: true, order: 1,
    fields: [
      { id: 'exec_text', type: 'rich_text', label: 'Relato de Execução', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null },
    ],
  },
  {
    id: 'attachments', title: '3. Anexos de Comprovação', key: 'attachments', type: 'editable',
    isVisible: true, isRequired: false, order: 2,
    fields: [
      { id: 'attach_photos', type: 'photo', label: 'Registros Fotográficos', isRequired: false, allowMultiple: true, allowAI: false, maxFiles: 20 },
    ],
  },
];

export const DEFAULT_JUSTIFICATIVA_SECTIONS: TemplateSection[] = [
  {
    id: 'object_section', title: '1. DO OBJETO DO TERMO ADITIVO', key: 'objectSection', type: 'editable',
    isVisible: true, isRequired: true, order: 0,
    fields: [{ id: 'obj_text', type: 'rich_text', label: 'Texto', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null }],
  },
  {
    id: 'justification_section', title: '2. DA JUSTIFICATIVA PARA A PRORROGAÇÃO', key: 'justificationSection', type: 'editable',
    isVisible: true, isRequired: true, order: 1,
    fields: [{ id: 'just_text', type: 'rich_text', label: 'Texto', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null }],
  },
  {
    id: 'executed_actions_section', title: '3. DAS AÇÕES JÁ EXECUTADAS', key: 'executedActionsSection', type: 'editable',
    isVisible: true, isRequired: true, order: 2,
    fields: [{ id: 'exec_text', type: 'rich_text', label: 'Texto', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null }],
  },
  {
    id: 'future_actions_section', title: '4. DAS AÇÕES FUTURAS PREVISTAS', key: 'futureActionsSection', type: 'editable',
    isVisible: true, isRequired: true, order: 3,
    fields: [{ id: 'future_text', type: 'rich_text', label: 'Texto', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null }],
  },
  {
    id: 'requested_deadline_section', title: '5. DO PRAZO SOLICITADO', key: 'requestedDeadlineSection', type: 'editable',
    isVisible: true, isRequired: true, order: 4,
    fields: [{ id: 'deadline_text', type: 'rich_text', label: 'Texto', isRequired: true, allowMultiple: false, allowAI: true, maxFiles: null }],
  },
  {
    id: 'attachments_section', title: '6. ANEXOS', key: 'attachmentsSection', type: 'editable',
    isVisible: true, isRequired: false, order: 5,
    fields: [
      { id: 'attach_text', type: 'rich_text', label: 'Texto', isRequired: false, allowMultiple: false, allowAI: false, maxFiles: null },
      { id: 'attach_docs', type: 'document', label: 'Documentos', isRequired: false, allowMultiple: true, allowAI: false, maxFiles: 10 },
    ],
  },
];
