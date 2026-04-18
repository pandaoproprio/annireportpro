export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'single_select'
  | 'multi_select'
  | 'checkbox'
  | 'scale'
  | 'file_upload'
  | 'section_header'
  | 'info_text'
  | 'cep'
  | 'cpf_cnpj'
  | 'phone'
  | 'email';

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  short_text: 'Texto Curto',
  long_text: 'Texto Longo',
  number: 'Número',
  date: 'Data',
  single_select: 'Seleção Única',
  multi_select: 'Seleção Múltipla',
  checkbox: 'Checkbox',
  scale: 'Escala',
  file_upload: 'Upload de Arquivo',
  section_header: 'Cabeçalho de Seção',
  info_text: 'Texto Informativo',
  cep: 'CEP (com busca automática)',
  cpf_cnpj: 'CPF / CNPJ',
  phone: 'Telefone',
  email: 'E-mail',
};

export interface FieldCondition {
  field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';
  value?: string;
}

export type ConditionLogic = 'AND' | 'OR';

export interface FieldConditionGroup {
  logic: ConditionLogic;
  conditions: FieldCondition[];
}

export interface FormField {
  id: string;
  form_id: string;
  type: FieldType;
  label: string;
  description: string;
  required: boolean;
  options: string[];
  sort_order: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FormDesignSettings {
  logoUrl?: string;
  coverImageUrl?: string;
  headerImageUrl?: string;
  primaryColor?: string;
  buttonColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  theme?: 'light' | 'dark';
  pageLayout?: 'centered' | 'full';
  successMessage?: string;
  maxResponses?: number | null;
  showRegistrationNumber?: boolean;
  singlePage?: boolean;
  enableCheckin?: boolean;
  preCheckinEnabled?: boolean;
}

export type FormStatus = 'ativo' | 'inativo' | 'pausado' | 'encerrado';

export interface Form {
  id: string;
  project_id: string | null;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: FormStatus;
  settings: FormDesignSettings;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
}

export const CATEGORIES = [
  { value: 'geral', label: 'Geral' },
  { value: 'inscricao_eventos', label: 'Inscrição em Eventos ou Oficinas' },
  { value: 'pesquisa', label: 'Pesquisa' },
  { value: 'prestacao_contas', label: 'Prestação de Contas' },
  { value: 'registro_campo', label: 'Registro de Campo' },
  { value: 'avaliacao', label: 'Avaliação' },
  { value: 'operacional', label: 'Operacional' },
];
