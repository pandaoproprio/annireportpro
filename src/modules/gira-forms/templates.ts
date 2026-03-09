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
    id: 'dums2_bloco_carnavalesco',
    name: 'Pré-Inscrição – DUMS II – Oficina de Bloco Carnavalesco',
    description: 'Formulário de Pré-Inscrição para a Oficina de Bloco Carnavalesco do projeto Didáticas Urbanas das Matrizes do Samba II (DUMS II), em parceria com o Movimento de Mulheres Sambistas (MMS).',
    category: 'inscricao_eventos',
    fields: [
      // ── Seção 1: Apresentação ──
      { type: 'section_header', label: 'Formulário de Pré-Inscrição – DUMS II', description: 'Oficina de Bloco Carnavalesco\n(Parceria com o Movimento de Mulheres Sambistas – MMS)', required: false, options: [], settings: {} },
      {
        type: 'info_text',
        label: 'Bem-vinda!',
        description: 'Que alegria saber do seu interesse em participar da nossa oficina!\n\nA **Oficina de Bloco Carnavalesco** integra o projeto **Didáticas Urbanas das Matrizes do Samba II (DUMS II)**, realizado pelo CEAP, com foco na formação cultural, no fortalecimento das matrizes do samba carioca e na valorização do protagonismo feminino no carnaval e na cultura popular.',
        required: false, options: [], settings: {},
      },
      {
        type: 'info_text',
        label: 'LEIA ATENTAMENTE ANTES DE SE INSCREVER',
        description: '- **Não é permitida** a inscrição em mais de uma oficina do MMS. Escolha com atenção e responsabilidade antes de finalizar sua inscrição;\n\n- Preencha atentamente **todos os campos obrigatórios**. Eles serão fundamentais para o contato e para o acompanhamento pedagógico;\n\n- O projeto DUMS II tem como objetivo promover formação cultural gratuita, fortalecimento das matrizes do samba, desenvolvimento territorial e valorização das expressões afro-brasileiras, com atenção especial às perspectivas de gênero, raça e classe;\n\n- **O preenchimento deste formulário não garante sua vaga.** A seleção será realizada pela equipe do Movimento de Mulheres Sambistas (MMS). A inscrição será confirmada somente após contato por e-mail ou telefone;\n\n- As oficinas acontecem durante a semana, no período da noite. Certifique-se de que possui disponibilidade. **Com mais de três faltas consecutivas sem justificativa, a participante poderá ser desligada da oficina.**',
        required: false, options: [], settings: {},
      },
      {
        type: 'info_text',
        label: '🥁 ATENÇÃO AO HORÁRIO DA OFICINA DE BLOCO CARNAVALESCO',
        description: '📅 **Terças-feiras**\n🕢 **18h30 às 20h**\n\n🎼 **Instrumentos disponíveis:**\n- Chocalho (10 vagas)\n- Agogô (8 vagas)\n- Surdo (8 vagas)\n- Tamborim (15 vagas – necessário possuir instrumento próprio)\n\n📍 **Local:** Centro do Rio de Janeiro (O endereço completo será informado por e-mail às selecionadas)',
        required: false, options: [], settings: {},
      },

      // ── Seção 2: Dados Pessoais e Contatos ──
      { type: 'section_header', label: 'Dados Pessoais e Contatos', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Nome Completo', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Nome Social / Artístico', description: '', required: false, options: [], settings: {} },
      { type: 'single_select', label: 'Auto-declaração de Raça', description: '', required: true, options: ['Branca', 'Negro (pretos + pardos)', 'Indígena', 'Amarela'], settings: {} },
      { type: 'single_select', label: 'Grau de Escolaridade', description: '', required: true, options: ['Sem instrução', 'Ensino Fundamental Incompleto', 'Ensino Fundamental Completo', 'Ensino Médio Incompleto', 'Ensino Médio Completo', 'Ensino Superior Incompleto', 'Ensino Superior Completo', 'Pós-Graduação'], settings: {} },
      { type: 'single_select', label: 'Você tem filhas(es/os)?', description: '', required: true, options: ['Sim', 'Não'], settings: {} },
      { type: 'date', label: 'Data de Nascimento', description: '', required: true, options: [], settings: {} },
      { type: 'cpf_cnpj', label: 'CPF', description: '', required: true, options: [], settings: {} },
      { type: 'long_text', label: 'Conte mais sobre você e o que te motivou a procurar essa oficina!', description: '', required: true, options: [], settings: {} },
      { type: 'email', label: 'E-mail de contato', description: '', required: true, options: [], settings: {} },
      { type: 'phone', label: 'Celular / Telefone fixo / Telefone alternativo', description: '', required: true, options: [], settings: {} },
      { type: 'cep', label: 'CEP', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Endereço completo (Rua, Nº, Bairro e Complemento)', description: '', required: true, options: [], settings: {} },
      { type: 'short_text', label: 'Município / UF', description: '', required: true, options: [], settings: {} },

      // ── Seção 3: Identidade de Gênero ──
      { type: 'section_header', label: 'Identidade de Gênero', description: '', required: false, options: [], settings: {} },
      {
        type: 'info_text',
        label: 'Informações sobre Identidade de Gênero',
        description: '**Mulher cisgênero:** pessoa que se identifica com o gênero (feminino) que foi atribuído no nascimento.\n\n**Mulher trans:** pessoa que não se identifica com o gênero (masculino) que foi atribuído ao nascer. Se identifica e reivindica o reconhecimento social e legal como mulher.\n\n**Travesti:** pessoa que não se identifica com o gênero (masculino) que foi atribuído ao nascer. Vivencia papéis e expressão de gênero feminina.\n\n**Homem Trans:** pessoa que não se identifica com o gênero (feminino) que foi atribuído ao nascer. Se identifica e reivindica o reconhecimento social e legal como homem.\n\n**Transmasculine:** pessoa que não se identifica com o gênero que foi atribuído ao nascer, dialoga com a masculinidade, mas não se reivindica enquanto homem.\n\n**Não-binárie:** pessoa que não se identifica com o gênero que foi atribuído ao nascer. Reivindica e se identifica enquanto uma pessoa não-binária.',
        required: false, options: [], settings: {},
      },
      { type: 'single_select', label: 'Identidade de Gênero', description: '', required: true, options: ['Mulher Cis', 'Mulher Trans', 'Travesti', 'Homem Trans', 'Transmasculine', 'Não-binárie'], settings: {} },

      // ── Seção 4: Sobre a Oficina ──
      { type: 'section_header', label: 'Sobre a Oficina', description: '', required: false, options: [], settings: {} },
      {
        type: 'info_text',
        label: 'Atenção',
        description: '**ATENÇÃO:**\n- As oficinas acontecem durante a semana, no período da noite. Certifique-se de que você tem essa disponibilidade.\n- Com mais de três faltas consecutivas sem justificativa, você será desligada do projeto.',
        required: false, options: [], settings: {},
      },
      { type: 'single_select', label: 'Instrumento desejado', description: 'Selecione o instrumento em que deseja se inscrever', required: true, options: ['Chocalho (10 vagas)', 'Agogô (8 vagas)', 'Surdo (8 vagas)', 'Tamborim (15 vagas – necessário possuir instrumento próprio)'], settings: {} },
      { type: 'single_select', label: 'Você possui instrumento próprio?', description: 'Obrigatório para quem escolheu Tamborim', required: true, options: ['Sim', 'Não'], settings: {} },
      { type: 'single_select', label: 'Estou ciente do horário (terças, 18h30–20h) e tenho disponibilidade', description: '', required: true, options: ['Sim'], settings: {} },

      // ── Seção 5: Redes Sociais ──
      { type: 'section_header', label: 'Redes Sociais', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Instagram', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Facebook', description: '', required: false, options: [], settings: {} },
      { type: 'short_text', label: 'Outras redes e plataformas digitais', description: '', required: false, options: [], settings: {} },
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
