import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CEAP_RISK_CONTEXT = `## CONTEXTO INSTITUCIONAL — CEAP
O CEAP (Centro de Articulação de Populações Marginalizadas) atua em projetos sociais com comunidades periféricas, negras e de matriz africana no Rio de Janeiro.
Os riscos devem ser analisados considerando:
- Contexto social e territorial (violência, vulnerabilidade, acesso)
- Sustentabilidade financeira (dependência de editais e fomento público)
- Equipe reduzida e múltiplas demandas
- Relação com poder público e marcos regulatórios
- Sazonalidade de atividades culturais e comunitárias
- Impactos climáticos e urbanos nos territórios de atuação`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const { mode, risks, projectName, projectObject, projectSummary } = body;

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "analyze") {
      systemPrompt = `Você é um analista de riscos especializado em projetos sociais e do terceiro setor no Brasil.

${CEAP_RISK_CONTEXT}

## INSTRUÇÕES
Analise os riscos fornecidos e retorne um JSON com:
{
  "overallAssessment": "avaliação geral do panorama de riscos (2-3 parágrafos)",
  "patterns": ["padrão identificado 1", "padrão 2"],
  "correlations": [{"riskIds": ["id1", "id2"], "description": "como estão correlacionados"}],
  "predictions": [{"description": "previsão", "probability": "alta|media|baixa", "timeframe": "curto|medio|longo prazo", "suggestedAction": "ação sugerida"}],
  "recommendations": [{"priority": "alta|media|baixa", "title": "título", "description": "descrição da recomendação"}],
  "riskScoreOverall": "baixo|medio|alto|critico"
}

Retorne APENAS o JSON, sem markdown.`;

      const risksData = (risks || []).map((r: any) => 
        `- "${r.title}" [${r.category}] P:${r.probability} I:${r.impact} Status:${r.status}${r.description ? ` — ${r.description}` : ""}${r.mitigation_plan ? ` | Mitigação: ${r.mitigation_plan}` : ""}${r.due_date ? ` | Prazo: ${r.due_date}` : ""}`
      ).join("\n");

      userPrompt = `Analise os riscos do projeto "${projectName}".

Objeto: ${projectObject || "Não informado"}
${projectSummary ? `Resumo: ${projectSummary}` : ""}

RISCOS CADASTRADOS (${(risks || []).length}):
${risksData || "Nenhum risco cadastrado."}

${(risks || []).length === 0 ? "IMPORTANTE: Mesmo sem riscos cadastrados, identifique riscos potenciais com base no contexto do projeto e sugira ações preventivas." : ""}

Retorne APENAS o JSON.`;

    } else if (mode === "action_plan") {
      systemPrompt = `Você é um consultor de gestão de riscos especializado em projetos sociais do terceiro setor no Brasil.

${CEAP_RISK_CONTEXT}

## INSTRUÇÕES
Gere um plano de ação completo para os riscos fornecidos. Retorne JSON:
{
  "actionPlan": [
    {
      "riskId": "id do risco (ou 'new' para riscos sugeridos)",
      "riskTitle": "título",
      "preventiveActions": [{"action": "descrição", "responsible": "sugestão de responsável", "deadline": "prazo sugerido", "priority": "alta|media|baixa"}],
      "correctiveActions": [{"action": "descrição", "trigger": "gatilho para ativação", "responsible": "responsável"}],
      "milestones": [{"date": "YYYY-MM-DD", "description": "marco/entrega"}]
    }
  ],
  "calendarActions": [
    {"date": "YYYY-MM-DD", "title": "ação", "type": "preventiva|corretiva|monitoramento", "riskTitle": "risco associado"}
  ],
  "summary": "resumo executivo do plano (1-2 parágrafos)"
}

Para datas, use datas realistas a partir de hoje (${new Date().toISOString().split("T")[0]}).
Retorne APENAS o JSON.`;

      const risksData = (risks || []).map((r: any) =>
        `- [${r.id}] "${r.title}" [${r.category}] P:${r.probability} I:${r.impact} Status:${r.status}${r.description ? ` — ${r.description}` : ""}${r.mitigation_plan ? ` | Mitigação atual: ${r.mitigation_plan}` : ""}${r.contingency_plan ? ` | Contingência: ${r.contingency_plan}` : ""}${r.responsible ? ` | Resp: ${r.responsible}` : ""}${r.due_date ? ` | Prazo: ${r.due_date}` : ""}`
      ).join("\n");

      userPrompt = `Gere um plano de ação completo para os riscos do projeto "${projectName}".

Objeto: ${projectObject || "Não informado"}
${projectSummary ? `Resumo: ${projectSummary}` : ""}

RISCOS:
${risksData || "Nenhum risco cadastrado — sugira riscos potenciais e ações preventivas."}

Retorne APENAS o JSON.`;

    } else if (mode === "suggest_risks") {
      systemPrompt = `Você é um analista de riscos especializado em projetos sociais do terceiro setor no Brasil.

${CEAP_RISK_CONTEXT}

## INSTRUÇÕES
Com base nos dados do projeto, sugira riscos potenciais que ainda não foram identificados. Retorne JSON:
{
  "suggestedRisks": [
    {
      "title": "título do risco",
      "description": "descrição detalhada",
      "category": "financeiro|operacional|cronograma|equipe|externo|legal|tecnico|outro",
      "probability": "muito_baixa|baixa|media|alta|muito_alta",
      "impact": "insignificante|menor|moderado|maior|catastrofico",
      "mitigation_plan": "sugestão de mitigação",
      "contingency_plan": "sugestão de contingência"
    }
  ],
  "rationale": "explicação geral de por que esses riscos foram identificados (1-2 parágrafos)"
}

Sugira entre 3 e 6 riscos realistas e contextualizados. Retorne APENAS o JSON.`;

      const existingRisks = (risks || []).map((r: any) => `"${r.title}" [${r.category}]`).join(", ");

      userPrompt = `Sugira riscos potenciais para o projeto "${projectName}".

Objeto: ${projectObject || "Não informado"}
${projectSummary ? `Resumo: ${projectSummary}` : ""}

Riscos já cadastrados: ${existingRisks || "Nenhum"}

Não repita riscos já existentes. Retorne APENAS o JSON.`;
    } else {
      return new Response(JSON.stringify({ error: "Modo inválido" }), { status: 400, headers: corsHeaders });
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
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: corsHeaders });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: corsHeaders });
      }
      const errText = await response.text();
      console.error("AI Gateway error:", errText);
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";

    try {
      const cleaned = resultText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify({ result: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (parseErr) {
      console.error("Failed to parse JSON:", parseErr, "Raw:", resultText);
      return new Response(JSON.stringify({ error: "Falha ao processar resposta da IA.", raw: resultText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
