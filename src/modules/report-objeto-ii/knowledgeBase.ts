/**
 * Base de conhecimento extraída dos relatórios reais do CEAP.
 * Usada pela IA para sugerir narrativas contextualizadas campo a campo.
 */

export const SECTION_EXAMPLES: Record<string, { guidance: string; examples: string[] }> = {
  object: {
    guidance: 'Descreva de forma objetiva e concisa o objeto do termo de fomento, mencionando as atividades previstas, o público-alvo e a localização.',
    examples: [
      'Realizar oficinas de música, produção cultural e de formação artística na cidade do Rio de Janeiro, voltado para a promoção da Cultura Popular.',
      'Realização de cursos em música, dança e Intervenções sobre cultura afro-brasileira, visando à conscientização e o empoderamento de 40 jovens negros e negras residentes na Cidade do Rio de Janeiro, com foco em territórios periféricos e favelas, promovendo a preservação da cultura afro-brasileira.',
      'Promoção da cultura e a história da região da Pequena África, na Zona Portuária do Rio de Janeiro por meio de campanhas de conscientização e de combate ao racismo e à intolerância religiosa, incluindo atividades educativas e de engajamento comunitário.',
    ],
  },
  summary: {
    guidance: 'Resuma as ações realizadas no período, destacando: estruturação da equipe, parcerias firmadas, principais atividades executadas, desafios enfrentados e resultados alcançados. Use linguagem formal e institucional.',
    examples: [
      'No ano de 2023, a Casa da Mulher Sambista consolidou sua presença como espaço de aprendizado, empoderamento e inclusão, oferecendo mais de 800 vagas em uma variedade de cursos voltados para a cultura do samba. Sob a coordenação da idealizadora do Movimento das Mulheres Sambistas, Patrícia Rodrigues, e a coordenação pedagógica de Marina Iris, o projeto contou com a participação de professoras renomadas, destacadas no cenário da cultura popular, com foco específico no samba.',
      'O projeto Orunmilá Conexão Urbana iniciou sua execução com foco na mobilização comunitária, organização institucional e estruturação da equipe técnica responsável pelas atividades formativas. A iniciativa tem como objetivo promover a formação artística e cultural de jovens negros e negras residentes em territórios periféricos e favelas da cidade do Rio de Janeiro, utilizando a música, a dança e conteúdos sobre cultura afro-brasileira como ferramentas de empoderamento, inclusão social e fortalecimento da identidade cultural.',
      'O Projeto Ubuntu Carioca, executado pelo Centro de Articulação de Populações Marginalizadas – CEAP, no âmbito do Termo de Fomento nº 964677/2024, em parceria com o Ministério dos Direitos Humanos e da Cidadania (MDHC), tem como objetivo promover a valorização da cultura e da história da região da Pequena África, na Zona Portuária do Rio de Janeiro, por meio de campanhas de conscientização e combate ao racismo e à intolerância religiosa, articuladas a atividades educativas, pesquisa territorial e ações de mobilização social.',
    ],
  },
  goals: {
    guidance: 'Demonstre o alcance de cada meta prevista no Plano de Trabalho. Para cada meta, descreva as ações realizadas, datas, locais e resultados concretos. Inclua fotos em formato paisagem com legendas descritivas.',
    examples: [
      'No início do projeto, em janeiro, a equipe dedicou-se a estabelecer as bases sólidas necessárias para o sucesso do projeto. Contratamos professores, produtores e outros membros essenciais para a equipe e realizamos visitas técnicas. Desde o primeiro momento, priorizamos o alinhamento das metodologias e procedimentos através de reuniões pedagógicas, garantindo uma abordagem consistente e eficaz.',
      'Realizamos oficinas de harmonia com turmas de cavaco e violão tanto no centro quanto na Tijuca. Nosso objetivo foi proporcionar aos participantes uma experiência enriquecedora de aprendizado musical, explorando os fundamentos da harmonia e promovendo o desenvolvimento de habilidades técnicas e criativas.',
      'As ações desenvolvidas até o momento encontram-se em conformidade com as metas pactuadas no Plano de Trabalho do projeto. No que se refere à Meta 1 – Estruturação e Organização, foi realizada a contratação da equipe técnica principal entre os meses de setembro e dezembro de 2025.',
    ],
  },
  other: {
    guidance: 'Descreva outras ações relevantes não previstas originalmente no Plano de Trabalho, como eventos extras, parcerias adicionais ou atividades complementares.',
    examples: [
      'Como resultado direto das oficinas oferecidas, foram formadas duas rodas de samba exclusivamente compostas por mulheres, a Roda Tristeza e a Abyás do Samba, ambas ativas e vibrantes. Além disso, um bloco de carnaval foi criado, contando com mais de 100 instrumentistas.',
    ],
  },
  communication: {
    guidance: 'Relate as ações de divulgação realizadas: publicações em redes sociais, matérias de imprensa, materiais gráficos produzidos, campanhas digitais. Inclua capturas de tela ou links.',
    examples: [
      'No campo das campanhas, o projeto estruturou três campanhas públicas de conscientização, com produção contínua de conteúdos digitais e materiais audiovisuais, divulgados nas redes sociais e no site oficial do CEAP. Destaca-se, em curso, a série "Articulando Saberes", composta por episódios audiovisuais que ampliam o debate sobre memória afro-brasileira, cultura negra e resistência no território.',
    ],
  },
  satisfaction: {
    guidance: 'Apresente dados de pesquisas de satisfação aplicadas aos participantes, com indicadores quantitativos e qualitativos. Inclua gráficos se disponíveis.',
    examples: [
      'Após o término da primeira edição, realizamos uma pesquisa de satisfação com parte das participantes, recebendo o retorno de 190 mulheres.',
    ],
  },
  future: {
    guidance: 'Descreva as ações planejadas para o próximo período de execução, com cronograma estimado e expectativas de resultado.',
    examples: [
      'O projeto segue em andamento com a continuidade das aulas, intervenções culturais e atividades de acompanhamento dos participantes, além da organização das próximas ações formativas e culturais que compõem o desenvolvimento integral do projeto.',
      'A equipe técnica do projeto, em conjunto com a equipe de gestão do CEAP, iniciou um processo de planejamento estratégico, com o objetivo de sistematizar as ações já realizadas, mensurar o impacto social das atividades desenvolvidas até o momento e organizar a apresentação das próximas etapas do projeto.',
    ],
  },
  expenses: {
    guidance: 'Liste as despesas realizadas com valores, notas fiscais e comprovantes. Organize por rubrica conforme o Plano de Trabalho.',
    examples: [],
  },
  links: {
    guidance: 'Inclua links ou referências para listas de presença, fichas de inscrição, registros audiovisuais e demais documentos comprobatórios.',
    examples: [],
  },
};

export const PHOTO_GUIDELINES = {
  orientation: 'landscape' as const,
  maxSizeMB: 1,
  minWidth: 1280,
  minHeight: 720,
  captionRequired: true,
};

export const FILLING_GUIDE = `## Como preencher o Relatório do Objeto

### Fotos
- Sempre no formato **horizontal (paisagem)**
- Tamanho máximo de **1 MB** por imagem
- Resolução mínima recomendada: **1280×720px**
- Cada foto deve ter uma **legenda descritiva**

### Texto
- Use linguagem **formal e objetiva**
- Descreva ações realizadas com **datas, locais e resultados concretos**
- Mencione **parcerias, equipe envolvida e público atendido**
- Campos obrigatórios estão sinalizados com **asterisco (*)**
- Campos com sugestão de IA possuem indicação visual distinta (ícone de lâmpada)

### Estrutura do Relatório
1. **OBJETO** — Descrição do objeto do termo de fomento
2. **RESUMO** — Síntese das ações realizadas no período
3. **DEMONSTRAÇÃO DO ALCANCE DAS METAS** — Detalhamento meta a meta
4. **OUTRAS AÇÕES DESENVOLVIDAS** — Atividades complementares
5. **PUBLICAÇÕES E DIVULGAÇÃO** — Ações de comunicação
6. **GRAU DE SATISFAÇÃO** — Pesquisa de satisfação
7. **AÇÕES FUTURAS** — Planejamento do próximo período
8. **COMPROVAÇÃO DE DESPESAS** — Documentação financeira
9. **DOCUMENTOS DE COMPROVAÇÃO** — Links e anexos

### Dicas
- Revise cada seção antes de exportar
- As fotos devem ilustrar as ações descritas no texto
- Mantenha coerência entre as metas do Plano de Trabalho e o relatório
`;
