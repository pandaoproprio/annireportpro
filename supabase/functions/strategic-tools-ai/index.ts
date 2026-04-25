import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body {
  type: "sroi" | "tows";
  projectId: string;
  payload: Record<string, unknown>;
}

async function callAi(messages: any[], tools?: any[]) {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
  }
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns minutos.");
  if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Erro IA: ${resp.status} ${t.slice(0, 200)}`);
  }
  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Não autenticado");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const body: Body = await req.json();
    const { type, projectId, payload } = body;

    // Buscar contexto do projeto
    const { data: project } = await supabase
      .from("projects")
      .select("name, object, summary, funder, start_date, end_date")
      .eq("id", projectId)
      .single();

    if (!project) throw new Error("Projeto não encontrado");

    if (type === "sroi") {
      const { totalInvested, totalImpactValue, sroiRatio, beneficiaries, mode } = payload as any;
      const messages = [
        {
          role: "system",
          content: "Você é especialista em avaliação de impacto social pelo método SROI (Social Return on Investment). Responda em português do Brasil, tom institucional, sem marketing exagerado. Cite limitações da estimativa.",
        },
        {
          role: "user",
          content: `Projeto: ${project.name}\nObjeto: ${project.object || "—"}\nFinanciador: ${project.funder || "—"}\n\nSROI calculado (${mode}):\n- Investimento total: R$ ${Number(totalInvested).toFixed(2)}\n- Valor de impacto estimado: R$ ${Number(totalImpactValue).toFixed(2)}\n- Beneficiários considerados: ${beneficiaries}\n- Razão SROI: ${Number(sroiRatio).toFixed(2)}\n\nGere um parágrafo único (3-5 frases) com a frase-síntese ("Cada R$ 1 investido gerou R$ X de impacto social..."), interpretação contextualizada e ressalvas metodológicas.`,
        },
      ];
      const result = await callAi(messages);
      const text = result.choices?.[0]?.message?.content || "";
      return new Response(JSON.stringify({ summary: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "tows") {
      const { strengths, weaknesses, opportunities, threats } = payload as any;
      const tools = [
        {
          type: "function",
          function: {
            name: "build_tows_strategies",
            description: "Gera estratégias cruzando os 4 quadrantes da matriz TOWS",
            parameters: {
              type: "object",
              properties: {
                so: { type: "array", items: { type: "string" }, description: "Estratégias ofensivas (Forças × Oportunidades)" },
                st: { type: "array", items: { type: "string" }, description: "Estratégias de defesa (Forças × Ameaças)" },
                wo: { type: "array", items: { type: "string" }, description: "Estratégias de reforço (Fraquezas × Oportunidades)" },
                wt: { type: "array", items: { type: "string" }, description: "Estratégias de sobrevivência (Fraquezas × Ameaças)" },
              },
              required: ["so", "st", "wo", "wt"],
              additionalProperties: false,
            },
          },
        },
      ];
      const messages = [
        {
          role: "system",
          content: "Você é consultor estratégico aplicando a Matriz TOWS para projetos sociais. Gere de 2 a 4 estratégias por quadrante, em frases curtas e acionáveis em português do Brasil.",
        },
        {
          role: "user",
          content: `Projeto: ${project.name}\nObjeto: ${project.object || "—"}\n\nForças:\n${(strengths || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "—"}\n\nFraquezas:\n${(weaknesses || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "—"}\n\nOportunidades:\n${(opportunities || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "—"}\n\nAmeaças:\n${(threats || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n") || "—"}\n\nGere as 4 categorias de estratégias.`,
        },
      ];
      const result = await callAi(messages, tools);
      const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
      const args = toolCall ? JSON.parse(toolCall.function.arguments) : { so: [], st: [], wo: [], wt: [] };
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Tipo inválido");
  } catch (e) {
    console.error("strategic-tools-ai error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
