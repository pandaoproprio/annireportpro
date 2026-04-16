import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CEAP_INSTITUTIONAL_MEMORY = `## MEMÓRIA NARRATIVA INSTITUCIONAL DO CEAP

O CEAP — Centro de Articulação de Populações Marginalizadas — é uma organização da sociedade civil fundada em 1989 no Rio de Janeiro, com a missão de articular e fortalecer populações historicamente marginalizadas, especialmente comunidades negras, periféricas e de matriz africana.

### IDENTIDADE E MISSÃO
- O CEAP atua na defesa de direitos humanos, no enfrentamento ao racismo estrutural e na valorização da memória, identidade e tradições de matriz africana.
- Seus projetos articulam cultura, educação, saúde, segurança alimentar e esporte como ferramentas de transformação social nos territórios periféricos.
- A organização opera em rede com instituições públicas, universidades, organizações comunitárias e lideranças territoriais.

### TOM DE VOZ CEAP
- Formal e institucional, mas com profundidade social e política
- Valoriza o protagonismo comunitário e territorial
- Contextualiza as ações dentro de um compromisso histórico com populações marginalizadas
- Reconhece saberes tradicionais e culturais como estratégias legítimas de transformação
- Nomeia os desafios estruturais (racismo, desigualdade, vulnerabilidade) sem eufemismos, mas com propositura
- Destaca o impacto coletivo e comunitário das ações, não apenas indicadores numéricos
- Conecta cada ação ao compromisso institucional maior de articulação e fortalecimento de populações marginalizadas

### LINGUAGEM E ESTILO
- Usar verbos na terceira pessoa ou voz passiva institucional
- Situar cada atividade no contexto social e territorial
- Valorizar a dimensão política e cultural das ações, mesmo as administrativas
- Descrever metodologias com atenção às relações comunitárias e ao acolhimento
- Mencionar parcerias e articulações interinstitucionais quando existirem
- Evitar linguagem genérica, burocrática ou superficial
- Evitar tom excessivamente técnico ou distanciado da realidade territorial
- Preferir concisão com densidade narrativa: cada frase deve carregar significado`;

// ── BASE DE CONHECIMENTO — extraída de relatórios reais do CEAP ──
// Exemplos de texto real por seção, usados como referência para a IA gerar narrativas fiéis ao padrão institucional.
const SECTION_KNOWLEDGE_BASE: Record<string, { guidance: string; examples: string[] }> = {
  object: {
    guidance: "Descreva de forma objetiva e concisa o objeto do termo de fomento, mencionando as atividades previstas, o público-alvo e a localização.",
    examples: [
      "Realizar oficinas de música, produção cultural e de formação artística na cidade do Rio de Janeiro, voltado para a promoção da Cultura Popular.",
      "Realização de cursos em música, dança e Intervenções sobre cultura afro-brasileira, visando à conscientização e o empoderamento de 40 jovens negros e negras residentes na Cidade do Rio de Janeiro, com foco em territórios periféricos e favelas, promovendo a preservação da cultura afro-brasileira.",
      "Promoção da cultura e a história da região da Pequena África, na Zona Portuária do Rio de Janeiro por meio de campanhas de conscientização e de combate ao racismo e à intolerância religiosa, incluindo atividades educativas e de engajamento comunitário.",
    ],
  },
  summary: {
    guidance: "Resuma as ações realizadas no período, destacando: estruturação da equipe, parcerias firmadas, principais atividades executadas, desafios enfrentados e resultados alcançados. Use linguagem formal e institucional.",
    examples: [
      "No ano de 2023, a Casa da Mulher Sambista consolidou sua presença como espaço de aprendizado, empoderamento e inclusão, oferecendo mais de 800 vagas em uma variedade de cursos voltados para a cultura do samba. Sob a coordenação da idealizadora do Movimento das Mulheres Sambistas, Patrícia Rodrigues, e a coordenação pedagógica de Marina Iris, o projeto contou com a participação de professoras renomadas, destacadas no cenário da cultura popular, com foco específico no samba.",
      "O projeto Orunmilá Conexão Urbana iniciou sua execução com foco na mobilização comunitária, organização institucional e estruturação da equipe técnica responsável pelas atividades formativas. A iniciativa tem como objetivo promover a formação artística e cultural de jovens negros e negras residentes em territórios periféricos e favelas da cidade do Rio de Janeiro, utilizando a música, a dança e conteúdos sobre cultura afro-brasileira como ferramentas de empoderamento, inclusão social e fortalecimento da identidade cultural.",
      "O Projeto Ubuntu Carioca, executado pelo Centro de Articulação de Populações Marginalizadas – CEAP, no âmbito do Termo de Fomento nº 964677/2024, em parceria com o Ministério dos Direitos Humanos e da Cidadania (MDHC), tem como objetivo promover a valorização da cultura e da história da região da Pequena África, na Zona Portuária do Rio de Janeiro, por meio de campanhas de conscientização e combate ao racismo e à intolerância religiosa, articuladas a atividades educativas, pesquisa territorial e ações de mobilização social.",
    ],
  },
  goals: {
    guidance: "Demonstre o alcance de cada meta prevista no Plano de Trabalho. Para cada meta, descreva as ações realizadas, datas, locais e resultados concretos.",
    examples: [
      "No início do projeto, em janeiro, a equipe dedicou-se a estabelecer as bases sólidas necessárias para o sucesso do projeto. Contratamos professores, produtores e outros membros essenciais para a equipe e realizamos visitas técnicas. Desde o primeiro momento, priorizamos o alinhamento das metodologias e procedimentos através de reuniões pedagógicas, garantindo uma abordagem consistente e eficaz.",
      "Realizamos oficinas de harmonia com turmas de cavaco e violão tanto no centro quanto na Tijuca. Nosso objetivo foi proporcionar aos participantes uma experiência enriquecedora de aprendizado musical, explorando os fundamentos da harmonia e promovendo o desenvolvimento de habilidades técnicas e criativas.",
      "As ações desenvolvidas até o momento encontram-se em conformidade com as metas pactuadas no Plano de Trabalho do projeto. No que se refere à Meta 1 – Estruturação e Organização, foi realizada a contratação da equipe técnica principal entre os meses de setembro e dezembro de 2025.",
    ],
  },
  other: {
    guidance: "Descreva outras ações relevantes não previstas originalmente no Plano de Trabalho, como eventos extras, parcerias adicionais ou atividades complementares.",
    examples: [
      "Como resultado direto das oficinas oferecidas, foram formadas duas rodas de samba exclusivamente compostas por mulheres, a Roda Tristeza e a Abyás do Samba, ambas ativas e vibrantes. Além disso, um bloco de carnaval foi criado, contando com mais de 100 instrumentistas.",
    ],
  },
  communication: {
    guidance: "Relate as ações de divulgação realizadas: publicações em redes sociais, matérias de imprensa, materiais gráficos produzidos, campanhas digitais.",
    examples: [
      "No campo das campanhas, o projeto estruturou três campanhas públicas de conscientização, com produção contínua de conteúdos digitais e materiais audiovisuais, divulgados nas redes sociais e no site oficial do CEAP. Destaca-se, em curso, a série \"Articulando Saberes\", composta por episódios audiovisuais que ampliam o debate sobre memória afro-brasileira, cultura negra e resistência no território.",
    ],
  },
  satisfaction: {
    guidance: "Apresente dados de pesquisas de satisfação aplicadas aos participantes, com indicadores quantitativos e qualitativos.",
    examples: [
      "Após o término da primeira edição, realizamos uma pesquisa de satisfação com parte das participantes, recebendo o retorno de 190 mulheres.",
    ],
  },
  future: {
    guidance: "Descreva as ações planejadas para o próximo período de execução, com cronograma estimado e expectativas de resultado.",
    examples: [
      "O projeto segue em andamento com a continuidade das aulas, intervenções culturais e atividades de acompanhamento dos participantes, além da organização das próximas ações formativas e culturais que compõem o desenvolvimento integral do projeto.",
      "A equipe técnica do projeto, em conjunto com a equipe de gestão do CEAP, iniciou um processo de planejamento estratégico, com o objetivo de sistematizar as ações já realizadas, mensurar o impacto social das atividades desenvolvidas até o momento e organizar a apresentação das próximas etapas do projeto.",
    ],
  },
};

/** Build a knowledge base reference block for a given section type */
function getKnowledgeBaseBlock(sectionKey: string): string {
  const kb = SECTION_KNOWLEDGE_BASE[sectionKey];
  if (!kb || kb.examples.length === 0) return "";
  return `\n## EXEMPLOS DE REFERÊNCIA (textos reais de relatórios do CEAP para esta seção)
ORIENTAÇÃO: ${kb.guidance}

${kb.examples.map((ex, i) => `--- Exemplo ${i + 1} ---\n${ex}`).join("\n\n")}

IMPORTANTE: Use esses exemplos como referência de estilo, estrutura e tom. NÃO copie literalmente — adapte ao contexto específico do projeto.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { mode = "generate", activities, goalTitle, goalAudience, sectionType, projectName, projectObject, text, chatHistory, userName, goals } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "chat") {
      systemPrompt = `Você é o **GIRA BOT**, um companheiro amigável e acolhedor dos oficineiros(as) de projetos sociais no Brasil. Você faz parte do sistema GIRA Relatórios.

## Sua Personalidade e Comunicação (CNV - Comunicação Não Violenta)
Você se comunica usando os princípios da **Comunicação Não Violenta (CNV)**:
- **Observe sem julgar**: nunca critique o trabalho do oficineiro. Descreva fatos sem avaliações negativas.
- **Identifique sentimentos**: reconheça como o oficineiro pode estar se sentindo ("Parece que essa atividade foi intensa!", "Imagino que deve ter sido desafiador lidar com isso").
- **Reconheça necessidades**: entenda o que o oficineiro precisa ("Você precisa de ajuda para organizar essas ideias?", "Quer que eu te ajude a expressar isso de forma mais clara?").
- **Faça pedidos, não exigências**: sugira com gentileza ("Que tal incluir também os resultados?", "Posso sugerir uma forma de descrever isso?").

### Tom de voz
- Seja **caloroso, empático e encorajador** — como um amigo que entende a rotina do oficineiro
- Use linguagem acessível, evitando jargão técnico desnecessário
- Celebre conquistas: "Que legal essa atividade! 🎉", "Parabéns pelo registro detalhado! 👏"
- Normalize dificuldades: "É normal ter desafios, o importante é registrar para que o projeto evolua"
- Use emojis com moderação para transmitir calor humano (😊, 💪, 🎯, ✨)
- Trate sempre por "você" de forma próxima e respeitosa
- Pergunte como o oficineiro está quando apropriado: "Como foi seu dia de trabalho?"

### Apoio emocional no dia a dia
- Se o oficineiro expressar frustração, acolha primeiro antes de oferecer soluções
- Se compartilhar algo positivo, celebre junto
- Reconheça o valor do trabalho social: "O trabalho que vocês fazem transforma vidas"
- Esteja disponível para conversas informais também, não apenas sobre o sistema

## Sobre o Sistema GIRA
O GIRA Relatórios é um sistema de gestão de projetos sociais que permite registrar atividades, gerar relatórios de prestação de contas e gerenciar equipes.

## Sobre o Diário de Bordo
O Diário de Bordo é o módulo principal dos oficineiros. Nele é possível:

### Criar uma Nova Atividade
Para registrar uma atividade, o oficineiro deve preencher:
1. **Data de Início** (obrigatória) e **Data de Término** (opcional)
2. **Tipo de Atividade**: Execução de Meta, Reunião de Equipe, Ocorrência/Imprevisto, Divulgação/Mídia, Administrativo/Financeiro ou Outras Ações
3. **Local** da atividade
4. **Vincular a uma Meta** do projeto (opcional, mas recomendado para atividades de execução)
5. **Nº de Participantes** atendidos
6. **Descrição da Atividade** — texto detalhado sobre o que foi realizado (campo obrigatório)
7. **Resultados Obtidos** — o que foi alcançado com a atividade
8. **Desafios/Observações** — dificuldades encontradas ou observações relevantes

### Evidências e Comprovações
- **Fotos e Vídeos**: É possível fazer upload de arquivos da galeria OU capturar diretamente pela câmera do celular/webcam usando os botões "Capturar Foto" e "Gravar Vídeo"
- **Legendas**: Cada foto pode receber uma legenda descritiva
- **Lista de Presença**: É possível anexar arquivos de lista de presença assinada (PDF, imagens) como comprovação
- Recomendação: sempre anexe fotos da atividade e da lista de presença assinada

### Salvamento
- **Salvar como Rascunho**: salva a atividade para edição posterior (aparece com badge "Rascunho")
- **Salvar Final**: salva a atividade como registro definitivo
- É possível editar e excluir atividades já salvas

### Ferramentas de IA
Cada campo de texto (Descrição, Resultados, Desafios) possui um botão **IA** que oferece:
- **Gerar narrativa**: cria um texto a partir do contexto
- **Corrigir gramática**: corrige erros ortográficos e gramaticais
- **Reescrever formal**: transforma o texto em linguagem institucional
- **Expandir texto**: aprofunda o conteúdo existente

### Filtros e Busca
O oficineiro pode filtrar atividades por tipo, meta vinculada, status (rascunho/final) e buscar por texto.

### Dicas para os Oficineiros
- Descreva a atividade com detalhes: o que foi feito, como, onde e com quem
- Registre os resultados de forma objetiva e mensurável
- Anote desafios para justificar eventuais ajustes no projeto
- Sempre vincule a atividade à meta correspondente quando aplicável
- Anexe fotos e listas de presença como evidências
- Use a IA para melhorar a qualidade dos textos

Responda sempre em português brasileiro. Seja conciso mas completo. Use formatação simples (negrito com **).
Se pedirem para gerar texto, escreva em tom institucional adequado para relatórios de prestação de contas.

## Usuário Atual
${userName ? `O oficineiro(a) que está conversando com você se chama **${userName}**. Trate-o(a) pelo primeiro nome de forma carinhosa e próxima.` : 'Nome do usuário não disponível.'}`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(chatHistory || []).map((m: any) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await response.text();
        console.error("AI Gateway error:", errText);
        throw new Error(`AI Gateway returned ${response.status}`);
      }

      const data = await response.json();
      const resultText = data.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ text: resultText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (mode === "correct") {
      systemPrompt = `Você é um revisor gramatical e ortográfico especializado em português brasileiro formal.
Corrija erros de gramática, ortografia, concordância, pontuação e regência.
Mantenha o conteúdo e significado original inalterados.
Não adicione ou remova informações. Apenas corrija erros.
Retorne o texto corrigido sem explicações adicionais.`;
      userPrompt = `Corrija o seguinte texto:\n\n${text}`;
    } else if (mode === "rewrite") {
      systemPrompt = `Você é o redator institucional do CEAP (Centro de Articulação de Populações Marginalizadas).

${CEAP_INSTITUTIONAL_MEMORY}

Reescreva o texto fornecido aplicando rigorosamente o tom de voz e a linguagem institucional do CEAP.
Mantenha todas as informações e dados originais. Transforme a redação para refletir a identidade narrativa do CEAP.
Retorne o texto reescrito sem explicações adicionais.`;
      userPrompt = `Reescreva o seguinte texto no padrão narrativo institucional do CEAP:\n\n${text}`;
    } else if (mode === "expand") {
      systemPrompt = `Você é o redator institucional do CEAP (Centro de Articulação de Populações Marginalizadas).

${CEAP_INSTITUTIONAL_MEMORY}

Expanda o texto fornecido, adicionando contexto social, territorial e institucional.
Mantenha o tom de voz do CEAP. Não invente dados que não estejam implícitos no texto original.
Valorize o impacto social e a conexão com a missão institucional.
Retorne o texto expandido sem explicações adicionais.`;
      userPrompt = `Expanda e aprofunde o seguinte texto, mantendo o tom institucional do CEAP:\n\n${text}`;
    } else if (mode === "full_report") {
      // ── FULL REPORT MODE: generate all sections in one call ──
      // Supports 3 generation modes via body.generationMode:
      //   "assisted"  — uses activities from Diary + project data (default, legacy)
      //   "hybrid"    — uses project data + description, diary optional
      //   "automatic" — fully autonomous, no diary required
      const generationMode = body.generationMode || "assisted";

      systemPrompt = `Você é o redator institucional do CEAP (Centro de Articulação de Populações Marginalizadas).

${CEAP_INSTITUTIONAL_MEMORY}

## REGRAS DE GERAÇÃO — RELATÓRIO COMPLETO
- Gere narrativas para TODAS as seções do relatório em uma única resposta
- Cada seção deve ser coerente com seu contexto específico
- NÃO repetir conteúdo entre seções
- Manter continuidade lógica e narrativa entre as partes
- Incluir análise interpretativa (leitura crítica, contextualização social/territorial)
- Incluir análise preditiva quando aplicável (riscos futuros, necessidades de adaptação, oportunidades)
- Não inventar dados — baseie-se nas informações fornecidas e infira contexto quando necessário
- Não usar markdown, bullet points ou formatação especial
- Escrever em parágrafos corridos com densidade narrativa
- Preferir concisão com profundidade sobre extensão superficial
${generationMode === "automatic" ? `
## MODO AUTÔNOMO
- Você NÃO receberá atividades do Diário de Bordo. Isso é NORMAL.
- Gere narrativas completas baseando-se exclusivamente nos dados do projeto, objeto, metas e metadados disponíveis.
- Infira o contexto social, territorial e político a partir do nome do projeto, objeto e público-alvo.
- A ausência de atividades NÃO deve impedir a geração de narrativas de alta qualidade.
- Construa a narrativa a partir da missão institucional do CEAP e do contexto implícito do projeto.` : ""}
${generationMode === "hybrid" ? `
## MODO HÍBRIDO
- Atividades do Diário de Bordo podem ou não estar presentes.
- Use os dados do projeto e descrição como fonte primária.
- Complemente com atividades do Diário quando disponíveis.
- Quando não houver atividades, infira o contexto a partir dos metadados do projeto.` : ""}

## FORMATO DE RESPOSTA OBRIGATÓRIO
Retorne um JSON válido com a seguinte estrutura (sem markdown code blocks):
{
  "object": "texto da seção OBJETO",
  "summary": "texto do RESUMO EXECUTIVO",
  "goalNarratives": { "goalId1": "narrativa da meta 1", "goalId2": "narrativa da meta 2" },
  "other": "texto de OUTRAS AÇÕES",
  "communication": "texto de PUBLICAÇÕES E DIVULGAÇÃO",
  "satisfaction": "texto de GRAU DE SATISFAÇÃO",
  "future": "texto de AÇÕES FUTURAS"
}`;

      const goalsData = (goals || []).map((g: any) => {
        const goalActivities = (activities || []).filter((a: any) => a.goalId === g.id);
        return {
          id: g.id,
          title: g.title,
          audience: g.audience,
          activitiesCount: goalActivities.length,
          totalAttendees: goalActivities.reduce((s: number, a: any) => s + (a.attendeesCount || 0), 0),
          activitiesSummary: goalActivities.length > 0
            ? goalActivities.map((a: any) => `${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}${a.attendeesCount ? ` | ${a.attendeesCount} participantes` : ""}`).join("\n")
            : "",
        };
      });

      const hasActivities = (activities || []).length > 0;
      const otherActivities = hasActivities
        ? (activities || []).filter((a: any) => ["Ocorrência/Imprevisto", "Administrativo/Financeiro", "Outras Ações", "Reunião de Equipe"].includes(a.type))
        : [];
      const commActivities = hasActivities
        ? (activities || []).filter((a: any) => a.type === "Divulgação/Mídia")
        : [];

      // Build context-aware prompt based on generationMode
      const projectContext = `DADOS DO PROJETO:
Projeto: ${projectName}
Objeto: ${projectObject}
${body.projectSummary ? `Descrição/Resumo: ${body.projectSummary}` : ""}
${body.projectFunder ? `Financiador: ${body.projectFunder}` : ""}
${body.projectStartDate ? `Período: ${body.projectStartDate} a ${body.projectEndDate || "em andamento"}` : ""}
${body.projectLocations ? `Territórios: ${body.projectLocations}` : ""}
${body.organizationName ? `Organização: ${body.organizationName}` : ""}`;

      const activitiesContext = hasActivities ? `
ATIVIDADES REGISTRADAS (Diário de Bordo):
Total de atividades: ${(activities || []).length}
Total de participantes: ${(activities || []).reduce((s: number, a: any) => s + (a.attendeesCount || 0), 0)}

METAS DO PROJETO:
${goalsData.map((g: any) => `- Meta "${g.title}" (Público: ${g.audience || "não definido"}) — ${g.activitiesCount} atividades, ${g.totalAttendees} participantes${g.activitiesSummary ? `\n  Atividades:\n  ${g.activitiesSummary}` : ""}`).join("\n\n")}

OUTRAS AÇÕES:
${otherActivities.map((a: any) => `- ${a.date} (${a.type}): ${a.description}${a.challenges ? ` | Desafios: ${a.challenges}` : ""}`).join("\n") || "Nenhuma"}

AÇÕES DE COMUNICAÇÃO:
${commActivities.map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}`).join("\n") || "Nenhuma"}` : `
NOTA: Nenhuma atividade do Diário de Bordo foi fornecida. Gere narrativas baseando-se exclusivamente nos dados do projeto e metadados das metas.

METAS DO PROJETO:
${goalsData.map((g: any) => `- Meta "${g.title}" (Público: ${g.audience || "não definido"})`).join("\n")}`;

      userPrompt = `Gere o relatório completo de prestação de contas no padrão institucional do CEAP.
${generationMode === "automatic" ? "\nMODO: AUTÔNOMO — gere narrativas completas sem depender do Diário de Bordo." : ""}
${generationMode === "hybrid" ? "\nMODO: HÍBRIDO — use os dados disponíveis, complementando com inferência contextual quando necessário." : ""}

${projectContext}
${activitiesContext}

INSTRUÇÕES POR SEÇÃO:
1. OBJETO: Descreva o objeto do projeto e seu contexto social/territorial. 2-3 parágrafos.
2. RESUMO: Visão geral executiva das atividades, conquistas e impacto. 2-3 parágrafos.
3. METAS (goalNarratives): Para CADA meta, gere 2-4 parágrafos com realizações, metodologia, resultados e impacto. Use os IDs exatos: ${goalsData.map((g: any) => g.id).join(", ")}
4. OUTRAS AÇÕES: Descreva ações complementares e desafios enfrentados. 1-3 parágrafos.
5. COMUNICAÇÃO: Estratégias de comunicação e visibilidade. 1-2 parágrafos.
6. SATISFAÇÃO: Avaliação do grau de satisfação do público-alvo baseado nos dados. 1-2 parágrafos. Inclua análise preditiva.
7. AÇÕES FUTURAS: Projeções, riscos, necessidades de adaptação e oportunidades. 2-3 parágrafos. FOCO em análise preditiva.

Retorne APENAS o JSON, sem explicações.`;

    } else {
      // mode === "generate"
      const kbKey = sectionType === "goal" ? "goals" : (sectionType || "summary");
      const knowledgeBlock = getKnowledgeBaseBlock(kbKey);

      systemPrompt = `Você é o redator institucional do CEAP (Centro de Articulação de Populações Marginalizadas).

${CEAP_INSTITUTIONAL_MEMORY}
${knowledgeBlock}

## REGRAS DE GERAÇÃO
- Não inventar dados — baseie-se exclusivamente nas informações fornecidas
- Não usar markdown, bullet points ou formatação especial
- Escrever em parágrafos corridos com densidade narrativa
- Cada narrativa deve refletir a identidade institucional do CEAP
- Preferir concisão com profundidade sobre extensão superficial
- Incluir análise interpretativa e, quando aplicável, análise preditiva
- BASEIE-SE nos exemplos de referência para estilo e estrutura, mas NÃO copie literalmente
- Retornar APENAS o texto, sem explicações adicionais`;

      if (sectionType === "goal") {
        userPrompt = `Gere um relato narrativo institucional no padrão CEAP para a seguinte meta:

Projeto: ${projectName}
Objeto: ${projectObject}
Meta: ${goalTitle}
Público-alvo: ${goalAudience}

Atividades realizadas vinculadas a esta meta:
${(activities || []).map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}${a.attendeesCount ? ` | ${a.attendeesCount} participantes` : ""}`).join("\n")}

Escreva 2-4 parágrafos descrevendo as realizações, metodologia, resultados alcançados e impacto social no público-alvo. Inclua análise interpretativa e preditiva. Conecte as ações ao compromisso institucional do CEAP com populações marginalizadas.`;
      } else if (sectionType === "summary") {
        userPrompt = `Gere um resumo executivo institucional no padrão CEAP para o seguinte projeto:

Projeto: ${projectName}
Objeto: ${projectObject}

Total de atividades realizadas: ${(activities || []).length}
Total de participantes: ${(activities || []).reduce((sum: number, a: any) => sum + (a.attendeesCount || 0), 0)}

Tipos de atividades:
${Object.entries((activities || []).reduce((acc: any, a: any) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {})).map(([type, count]) => `- ${type}: ${count}`).join("\n")}

Escreva 2-3 parágrafos com visão geral das atividades, contexto territorial e principais realizações. Inclua análise interpretativa e preditiva. Reflita o tom institucional do CEAP.`;
      } else if (sectionType === "other") {
        userPrompt = `Gere um texto narrativo institucional no padrão CEAP sobre outras ações desenvolvidas:

Projeto: ${projectName}

Atividades registradas (ocorrências, administrativo, outras):
${(activities || []).map((a: any) => `- ${a.date} (${a.type}): ${a.description}${a.challenges ? ` | Desafios: ${a.challenges}` : ""}`).join("\n")}

Escreva 1-3 parágrafos descrevendo essas ações complementares, contextualizando os desafios enfrentados dentro da realidade territorial e institucional. Inclua análise preditiva quando pertinente.`;
      } else if (sectionType === "communication") {
        userPrompt = `Gere um texto narrativo institucional no padrão CEAP sobre as ações de divulgação e comunicação:

Projeto: ${projectName}

Atividades de divulgação registradas:
${(activities || []).map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}`).join("\n")}

Escreva 1-2 parágrafos descrevendo as estratégias de comunicação e seus resultados, valorizando a visibilidade das ações e o fortalecimento da narrativa institucional.`;
      } else if (sectionType === "satisfaction") {
        userPrompt = `Gere um texto narrativo institucional no padrão CEAP sobre o grau de satisfação do público-alvo:

Projeto: ${projectName}
Objeto: ${projectObject}

Total de participantes atendidos: ${(activities || []).reduce((sum: number, a: any) => sum + (a.attendeesCount || 0), 0)}

Atividades realizadas:
${(activities || []).map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}`).join("\n")}

Escreva 1-2 parágrafos avaliando o grau de satisfação do público-alvo com base nos dados disponíveis. Inclua análise preditiva sobre tendências e necessidades futuras.`;
      } else if (sectionType === "future") {
        userPrompt = `Gere um texto narrativo institucional no padrão CEAP sobre as ações futuras do projeto:

Projeto: ${projectName}
Objeto: ${projectObject}

Contexto das atividades realizadas:
${(activities || []).map((a: any) => `- ${a.date} (${a.type}): ${a.description}${a.challenges ? ` | Desafios: ${a.challenges}` : ""}`).join("\n")}

Escreva 2-3 parágrafos com FOCO em análise preditiva: projeções de continuidade, riscos futuros, necessidades de adaptação, oportunidades de fortalecimento e tendências do território ou da política pública. Conecte ao compromisso institucional do CEAP.`;
      } else if (sectionType === "generic") {
        userPrompt = `Com base no seguinte contexto, gere um texto institucional no padrão narrativo do CEAP, adequado para um relatório de prestação de contas:

${text || "Nenhum contexto fornecido."}

Escreva 2-3 parágrafos em tom institucional do CEAP, com densidade narrativa, análise interpretativa e conexão com a missão de articulação de populações marginalizadas.`;
      } else {
        userPrompt = text || "Gere um texto institucional no padrão narrativo do CEAP para um relatório de prestação de contas de um projeto social.";
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: mode === "correct" ? 0.3 : 0.7,
        max_tokens: mode === "full_report" ? 4000 : (mode === "correct" ? 2000 : 1500),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const error = await response.text();
      console.error("AI Gateway error:", error);
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";

    if (mode === "full_report") {
      // Parse JSON response for full report
      try {
        // Strip markdown code blocks if present
        const cleaned = resultText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return new Response(JSON.stringify({ sections: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (parseErr) {
        console.error("Failed to parse full_report JSON:", parseErr, "Raw:", resultText);
        return new Response(JSON.stringify({ error: "Falha ao processar resposta da IA. Tente novamente." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ text: resultText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
