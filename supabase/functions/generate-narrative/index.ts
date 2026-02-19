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
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { activities, goalTitle, goalAudience, sectionType, projectName, projectObject } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = `Você é um redator especializado em relatórios de prestação de contas de projetos sociais no Brasil. 
Escreva textos em português brasileiro formal, objetivos e adequados para relatórios institucionais enviados a órgãos financiadores.
Use linguagem técnica mas acessível. Não invente dados — baseie-se exclusivamente nas informações fornecidas.
Não use markdown, bullet points ou formatação especial. Escreva em parágrafos corridos.`;

    let userPrompt = "";

    if (sectionType === "goal") {
      userPrompt = `Gere um relato narrativo para a seguinte meta de um projeto social:

Projeto: ${projectName}
Objeto: ${projectObject}
Meta: ${goalTitle}
Público-alvo: ${goalAudience}

Atividades realizadas vinculadas a esta meta:
${activities.map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}${a.attendeesCount ? ` | ${a.attendeesCount} participantes` : ""}`).join("\n")}

Escreva um relato narrativo de 2-4 parágrafos descrevendo as realizações, metodologia utilizada, resultados alcançados e impacto no público-alvo.`;
    } else if (sectionType === "summary") {
      userPrompt = `Gere um resumo executivo para o seguinte projeto social:

Projeto: ${projectName}
Objeto: ${projectObject}

Total de atividades realizadas: ${activities.length}
Total de participantes: ${activities.reduce((sum: number, a: any) => sum + (a.attendeesCount || 0), 0)}

Tipos de atividades:
${Object.entries(activities.reduce((acc: any, a: any) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {})).map(([type, count]) => `- ${type}: ${count}`).join("\n")}

Escreva um resumo executivo de 2-3 parágrafos com visão geral das atividades realizadas, contexto e principais realizações.`;
    } else if (sectionType === "other") {
      userPrompt = `Gere um texto narrativo sobre outras ações desenvolvidas no projeto:

Projeto: ${projectName}

Atividades registradas (ocorrências, administrativo, outras):
${activities.map((a: any) => `- ${a.date} (${a.type}): ${a.description}${a.challenges ? ` | Desafios: ${a.challenges}` : ""}`).join("\n")}

Escreva 1-3 parágrafos descrevendo essas ações complementares, imprevistos enfrentados e soluções adotadas.`;
    } else if (sectionType === "communication") {
      userPrompt = `Gere um texto narrativo sobre as ações de divulgação e comunicação do projeto:

Projeto: ${projectName}

Atividades de divulgação registradas:
${activities.map((a: any) => `- ${a.date}: ${a.description}${a.results ? ` | Resultados: ${a.results}` : ""}`).join("\n")}

Escreva 1-2 parágrafos descrevendo as estratégias de comunicação utilizadas e seus resultados.`;
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
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI Gateway error:", error);
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
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
