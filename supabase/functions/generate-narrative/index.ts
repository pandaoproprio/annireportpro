import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { mode = "generate", activities, goalTitle, goalAudience, sectionType, projectName, projectObject, text, chatHistory } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "chat") {
      systemPrompt = `Você é o **GIRA BOT**, assistente virtual do sistema GIRA Relatórios, especializado em ajudar oficineiros de projetos sociais no Brasil.

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
Se pedirem para gerar texto, escreva em tom institucional adequado para relatórios de prestação de contas.`;
      
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
      systemPrompt = `Você é um redator especializado em documentos institucionais e relatórios de prestação de contas no Brasil.
Reescreva o texto em tom formal, técnico e institucional, adequado para relatórios enviados a órgãos financiadores.
Mantenha todas as informações e dados originais. Apenas melhore a redação, fluidez e formalidade.
Retorne o texto reescrito sem explicações adicionais.`;
      userPrompt = `Reescreva o seguinte texto em tom formal e institucional:\n\n${text}`;
    } else if (mode === "expand") {
      systemPrompt = `Você é um redator especializado em relatórios de prestação de contas de projetos sociais no Brasil.
Expanda o texto fornecido, adicionando mais detalhes, contexto e profundidade.
Mantenha o tom formal e institucional. Não invente dados que não estejam implícitos no texto original.
Retorne o texto expandido sem explicações adicionais.`;
      userPrompt = `Expanda e aprofunde o seguinte texto, mantendo o tom formal:\n\n${text}`;
    } else {
      // mode === "generate" (original behavior)
      systemPrompt = `Você é um redator especializado em relatórios de prestação de contas de projetos sociais no Brasil. 
Escreva textos em português brasileiro formal, objetivos e adequados para relatórios institucionais enviados a órgãos financiadores.
Use linguagem técnica mas acessível. Não invente dados — baseie-se exclusivamente nas informações fornecidas.
Não use markdown, bullet points ou formatação especial. Escreva em parágrafos corridos.`;

      if (sectionType === "goal") {
        userPrompt = `Gere um relato narrativo para a seguinte meta de um projeto social:

Projeto: ${projectName}
Objeto: ${projectObject}
Meta: ${goalTitle}
Público-alvo: ${goalAudience}

Atividades realizadas vinculadas a esta meta:
${(activities || []).map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}${a.attendeesCount ? ` | ${a.attendeesCount} participantes` : ""}`).join("\n")}

Escreva um relato narrativo de 2-4 parágrafos descrevendo as realizações, metodologia utilizada, resultados alcançados e impacto no público-alvo.`;
      } else if (sectionType === "summary") {
        userPrompt = `Gere um resumo executivo para o seguinte projeto social:

Projeto: ${projectName}
Objeto: ${projectObject}

Total de atividades realizadas: ${(activities || []).length}
Total de participantes: ${(activities || []).reduce((sum: number, a: any) => sum + (a.attendeesCount || 0), 0)}

Tipos de atividades:
${Object.entries((activities || []).reduce((acc: any, a: any) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {})).map(([type, count]) => `- ${type}: ${count}`).join("\n")}

Escreva um resumo executivo de 2-3 parágrafos com visão geral das atividades realizadas, contexto e principais realizações.`;
      } else if (sectionType === "other") {
        userPrompt = `Gere um texto narrativo sobre outras ações desenvolvidas no projeto:

Projeto: ${projectName}

Atividades registradas (ocorrências, administrativo, outras):
${(activities || []).map((a: any) => `- ${a.date} (${a.type}): ${a.description}${a.challenges ? ` | Desafios: ${a.challenges}` : ""}`).join("\n")}

Escreva 1-3 parágrafos descrevendo essas ações complementares, imprevistos enfrentados e soluções adotadas.`;
      } else if (sectionType === "communication") {
        userPrompt = `Gere um texto narrativo sobre as ações de divulgação e comunicação do projeto:

Projeto: ${projectName}

Atividades de divulgação registradas:
${(activities || []).map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}`).join("\n")}

Escreva 1-2 parágrafos descrevendo as estratégias de comunicação utilizadas e seus resultados.`;
      } else if (sectionType === "generic") {
        // Generic generation from text context
        userPrompt = `Com base no seguinte contexto, gere um texto formal e institucional adequado para um relatório de prestação de contas:

${text || "Nenhum contexto fornecido."}

Escreva 2-3 parágrafos em tom formal e institucional.`;
      } else {
        userPrompt = text || "Gere um texto formal para um relatório de prestação de contas de um projeto social.";
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
        max_tokens: mode === "correct" ? 2000 : 1500,
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
