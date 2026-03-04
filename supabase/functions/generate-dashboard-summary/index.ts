import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um analista executivo especializado em projetos socioculturais brasileiros.
Gere um resumo executivo conciso e profissional em português do Brasil com base nos dados do projeto fornecido.

Estrutura obrigatória (use markdown):
1. **Visão Geral** — contexto do projeto em 2-3 frases
2. **Indicadores-Chave** — destaque números importantes (atividades, pessoas impactadas, metas)
3. **Análise de Progresso** — avaliação qualitativa do andamento
4. **Pontos de Atenção** — riscos ou alertas identificados nos dados
5. **Recomendações** — 2-3 ações sugeridas

Seja objetivo, use dados concretos e mantenha o tom institucional.
Máximo 400 palavras.`;

    const userPrompt = `Dados do projeto:
- Nome: ${projectData.name}
- Organização: ${projectData.organization}
- Fomento: ${projectData.fomento}
- Financiador: ${projectData.funder}
- Período: ${projectData.startDate} a ${projectData.endDate}
- Dias restantes: ${projectData.daysRemaining}
- Total de atividades: ${projectData.totalActivities}
- Pessoas impactadas: ${projectData.totalAttendees}
- Metas cadastradas: ${projectData.goalsCount}
- Atividades por tipo: ${JSON.stringify(projectData.activitiesByType)}
- Atividades por meta: ${JSON.stringify(projectData.activitiesByGoal)}
- Locais de atuação: ${projectData.locations?.join(", ") || "Não informado"}
- SLA: ${projectData.slaOnTime} no prazo, ${projectData.slaOverdue} atrasados
- Rascunhos ativos: ${projectData.draftsCount}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const narrative = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-dashboard-summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
