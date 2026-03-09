import type { FieldType } from './types';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: {
    type: FieldType;
    label: string;
    description: string;
    required: boolean;
    options: string[];
    settings: Record<string, unknown>;
  }[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'inscricao_evento',
    name: 'Inscrição em Eventos ou Oficinas',
    description: 'Formulário de inscrição com campos para dados pessoais, seleção de oficina e horário preferido.',
    category: 'inscricao_eventos',
    fields: [
      { type: 'short_text', label: 'Nome completo', description: 'Informe seu nome completo', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'E-mail', description: 'Seu melhor e-mail para contato', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Telefone / WhatsApp', description: 'Número com DDD', required: true, options: [], settings: {} },
      { type: 'single_select', label: 'Oficina desejada', description: 'Selecione a oficina em que deseja se inscrever', required: true, options: ['Oficina 1', 'Oficina 2', 'Oficina 3'], settings: {} },
      { type: 'single_select', label: 'Horário preferido', description: 'Escolha o melhor horário', required: true, options: ['Manhã (9h–12h)', 'Tarde (14h–17h)', 'Noite (18h–21h)'], settings: {} },
      { type: 'short_text', label: 'Idade', description: 'Informe sua idade', required: false, options: [], settings: {} },
      { type: 'long_text', label: 'Observações', description: 'Alguma informação adicional?', required: false, options: [], settings: {} },
    ],
  },
  {
    id: 'pesquisa_satisfacao',
    name: 'Pesquisa de Satisfação',
    description: 'Avalie a qualidade de um evento ou atividade realizada.',
    category: 'pesquisa',
    fields: [
      { type: 'short_text', label: 'Nome (opcional)', description: '', required: false, options: [], settings: {} },
      { type: 'scale', label: 'Como você avalia a organização?', description: 'De 1 (ruim) a 5 (excelente)', required: true, options: [], settings: { min: 1, max: 5 } },
      { type: 'scale', label: 'Como você avalia o conteúdo?', description: 'De 1 (ruim) a 5 (excelente)', required: true, options: [], settings: { min: 1, max: 5 } },
      { type: 'single_select', label: 'Participaria novamente?', description: '', required: true, options: ['Sim', 'Talvez', 'Não'], settings: {} },
      { type: 'long_text', label: 'Sugestões ou comentários', description: '', required: false, options: [], settings: {} },
    ],
  },
  {
    id: 'registro_presenca',
    name: 'Lista de Presença',
    description: 'Registre a presença dos participantes em atividades e eventos.',
    category: 'registro_campo',
    fields: [
      { type: 'short_text', label: 'Nome completo', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'CPF ou Documento', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Instituição / Comunidade', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Telefone', description: '', required: false, options: [], settings: {} },
      { type: 'checkbox', label: 'Autorizo o uso da minha imagem para fins de divulgação', description: '', required: false, options: [], settings: {} },
    ],
  },
  {
    id: 'em_branco',
    name: 'Em Branco',
    description: 'Comece do zero e adicione os campos que desejar.',
    category: 'geral',
    fields: [],
  },
];
