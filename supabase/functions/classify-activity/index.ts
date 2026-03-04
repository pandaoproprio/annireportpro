import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTIVITY_TYPES = [
  "Execução de Meta",
  "Reunião de Equipe",
  "Ocorrência/Imprevisto",
  "Divulgação/Mídia",
  "Administrativo/Financeiro",
  "Outras Ações",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Descrição muito curta para classificar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um classificador de atividades de projetos socioculturais. Dada a descrição de uma atividade, retorne EXATAMENTE uma das categorias abaixo (sem aspas, sem explicação):

${ACTIVITY_TYPES.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Regras:
- Oficinas, aulas, workshops, apresentações artísticas, ensaios → "Execução de Meta"
- Reuniões internas, alinhamentos, encontros de equipe → "Reunião de Equipe"
- Problemas, imprevistos, cancelamentos, emergências → "Ocorrência/Imprevisto"
- Postagens, redes sociais, matérias, entrevistas, divulgação → "Divulgação/Mídia"
- Compras, pagamentos, contratos, prestação de contas → "Administrativo/Financeiro"
- Qualquer outra coisa → "Outras Ações"

Responda SOMENTE com o nome exato da categoria.`,
          },
          { role: "user", content: description.trim().substring(0, 500) },
        ],
        temperature: 0,
        max_tokens: 30,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Erro no gateway de IA");
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content || "").trim();

    // Match to valid type
    const matched = ACTIVITY_TYPES.find(
      (t) => raw.toLowerCase().includes(t.toLowerCase())
    );

    return new Response(
      JSON.stringify({ type: matched || "Outras Ações", raw }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("classify-activity error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
