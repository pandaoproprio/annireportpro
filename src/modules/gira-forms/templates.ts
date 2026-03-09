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
    description: 'Formulário completo de inscrição com dados pessoais, identidade, endereço, redes sociais e LGPD.',
    category: 'inscricao_eventos',
    fields: [
      // ── Seção 1: Dados Pessoais e Contatos ──
      { type: 'section_header', label: 'Dados Pessoais e Contatos', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Nome Completo', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Nome Social / Artístico', description: '', required: false, options: [], settings: {} },
      { type: 'single_select', label: 'Auto-declaração de Raça', description: '', required: true, options: ['Branca', 'Negro (pretos + pardos)', 'Indígena', 'Amarela'], settings: {} },
      { type: 'single_select', label: 'Grau de Escolaridade', description: '', required: true, options: ['Sem instrução', 'Ensino Fundamental Incompleto', 'Ensino Fundamental Completo', 'Ensino Médio Incompleto', 'Ensino Médio Completo', 'Ensino Superior Incompleto', 'Ensino Superior Completo', 'Pós-Graduação'], settings: {} },
      { type: 'single_select', label: 'Você tem filhas(es/os)?', description: '', required: true, options: ['Sim', 'Não'], settings: {} },
      { type: 'date', label: 'Data de Nascimento', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'CPF', description: '', required: true, options: [], settings: {} },
      { type: 'long_text', label: 'Conte mais sobre você e o que te motivou a procurar essa oficina!', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'E-mail de contato', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Celular / Telefone fixo / Telefone alternativo', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Endereço completo (Rua, Nº, Bairro e Complemento)', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'CEP', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Município / UF', description: '', required: true, options: [], settings: {} },

      // ── Seção 2: Identidade de Gênero ──
      { type: 'section_header', label: 'Identidade de Gênero', description: '', required: false, options: [], settings: {} },
      {
        type: 'info_text',
        label: 'Informações sobre Identidade de Gênero',
        description: '**Mulher cisgênero:** pessoa que se identifica com o gênero (feminino) que foi atribuído no nascimento.\n\n**Mulher trans:** pessoa que não se identifica com o gênero (masculino) que foi atribuído ao nascer. Se identifica e reivindica o reconhecimento social e legal como mulher.\n\n**Travesti:** pessoa que não se identifica com o gênero (masculino) que foi atribuído ao nascer. Vivencia papéis e expressão de gênero feminina.\n\n**Homem Trans:** pessoa que não se identifica com o gênero (feminino) que foi atribuído ao nascer. Se identifica e reivindica o reconhecimento social e legal como homem.\n\n**Transmasculine:** pessoa que não se identifica com o gênero que foi atribuído ao nascer, dialoga com a masculinidade, mas não se reivindica enquanto homem.\n\n**Não-binárie:** pessoa que não se identifica com o gênero que foi atribuído ao nascer. Reivindica e se identifica enquanto uma pessoa não-binária.',
        required: false, options: [], settings: {},
      },
      { type: 'single_select', label: 'Identidade de Gênero', description: '', required: true, options: ['Mulher Cis', 'Mulher Trans', 'Travesti', 'Homem Trans', 'Transmasculine', 'Não-binárie'], settings: {} },

      // ── Seção 3: Sobre a Oficina ──
      { type: 'section_header', label: 'Sobre a Oficina', description: '', required: false, options: [], settings: {} },
      {
        type: 'info_text',
        label: 'Atenção',
        description: '**ATENÇÃO:**\n- As oficinas acontecem durante a semana, no período da noite. Certifique-se que você tem essa disponibilidade. Com mais de três faltas consecutivas, você será desligada do projeto.',
        required: false, options: [], settings: {},
      },
      { type: 'single_select', label: 'Oficina desejada', description: 'Selecione a oficina em que deseja se inscrever', required: true, options: ['Oficina 1', 'Oficina 2', 'Oficina 3'], settings: {} },
      { type: 'single_select', label: 'Horário preferido', description: 'Escolha o melhor horário', required: true, options: ['Manhã (9h–12h)', 'Tarde (14h–17h)', 'Noite (18h–21h)'], settings: {} },
      { type: 'single_select', label: 'Estou ciente do horário e tenho disponibilidade', description: '', required: true, options: ['Sim'], settings: {} },

      // ── Seção 4: Redes Sociais ──
      { type: 'section_header', label: 'Redes Sociais', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Instagram', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Facebook', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Outras redes e plataformas digitais', description: '', required: false, options: [], settings: {} },
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
      { type: 'checkbox', label: 'Autorizo o uso da minha imagem para fins de divulgação', description: '', required: false, options: ['Sim, autorizo'], settings: {} },
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
