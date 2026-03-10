import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CEAP_SYSTEM_PROMPT = `Você é um redator institucional especializado do CEAP (Centro de Educação e Assessoria Popular).

Sua função é transformar registros operacionais do Diário de Bordo em narrativas institucionais prontas para relatórios oficiais.

ESTILO NARRATIVO CEAP:
- Linguagem formal e institucional, mas acessível
- Descrição objetiva e precisa das ações realizadas
- Valorização do impacto social e comunitário
- Conexão explícita com os objetivos do projeto
- Uso de verbos na terceira pessoa do singular ou na voz passiva institucional
- Parágrafos bem estruturados com transições claras
- Evitar jargões técnicos desnecessários
- Destacar resultados quantitativos quando disponíveis

ESTRUTURA DA NARRATIVA:
1. Contextualização: situar a atividade no contexto do projeto
2. Descrição das ações: detalhar o que foi realizado de forma objetiva
3. Participação e engajamento: mencionar público-alvo e participantes
4. Resultados e impacto: destacar resultados alcançados e impacto social
5. Conexão com objetivos: vincular a atividade às metas do projeto
6. Desafios e aprendizados (quando relevante): mencionar dificuldades enfrentadas

REGRAS:
- Não inventar dados que não existem no registro
- Usar os dados fornecidos fielmente
- Manter entre 150 e 400 palavras
- Produzir texto corrido, sem bullets ou listas
- Não incluir títulos ou cabeçalhos no texto
- Retornar APENAS o texto da narrativa, sem explicações adicionais`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader || "" } },
  });

  try {
    const { activity_id } = await req.json();
    if (!activity_id) {
      return new Response(JSON.stringify({ error: "activity_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get activity data
    const { data: activity, error: actError } = await supabase
      .from("activities")
      .select("*")
      .eq("id", activity_id)
      .single();

    if (actError || !activity) {
      return new Response(JSON.stringify({ error: "Activity not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project context
    const { data: project } = await supabase
      .from("projects")
      .select("name, object, summary, goals, funder, organization_name")
      .eq("id", activity.project_id)
      .single();

    // Build goals text
    let goalsText = "";
    if (project?.goals && Array.isArray(project.goals)) {
      goalsText = (project.goals as any[])
        .map((g: any) => `- ${g.title}: ${g.description || ""}`)
        .join("\n");
    }

    // Find matching goal
    let matchingGoal = "";
    if (activity.goal_id && project?.goals && Array.isArray(project.goals)) {
      const goal = (project.goals as any[]).find((g: any) => g.id === activity.goal_id);
      if (goal) matchingGoal = `Meta vinculada: ${goal.title} — ${goal.description || ""}`;
    }

    const prompt = `DADOS DO REGISTRO (Diário de Bordo):

Projeto: ${project?.name || "Não informado"}
Organização: ${project?.organization_name || "Não informada"}
Financiador: ${project?.funder || "Não informado"}
Objeto do Projeto: ${project?.object || "Não informado"}
Resumo do Projeto: ${project?.summary || "Não informado"}

Metas do Projeto:
${goalsText || "Não informadas"}

${matchingGoal}

Data da Atividade: ${activity.date}${activity.end_date ? ` a ${activity.end_date}` : ""}
Tipo: ${activity.type}
Local: ${activity.location}
Participantes: ${activity.attendees_count}
Equipe envolvida: ${(activity.team_involved || []).join(", ") || "Não informada"}
Setor responsável: ${activity.setor_responsavel || "Não informado"}

Descrição da Atividade:
${activity.description}

Resultados Alcançados:
${activity.results}

Desafios Enfrentados:
${activity.challenges}

---

Com base nessas informações, gere uma narrativa institucional no padrão CEAP para inclusão no Relatório do Objeto.`;

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: CEAP_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.error("[narrative] AI error:", aiResponse.status, errBody);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Falha na geração da narrativa" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const narrativeText = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!narrativeText) {
      return new Response(JSON.stringify({ error: "Narrativa vazia retornada pela IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert into activity_narratives
    const { data: narrative, error: upsertError } = await supabase
      .from("activity_narratives")
      .upsert({
        activity_id,
        project_id: activity.project_id,
        user_id: activity.user_id,
        narrative_text: narrativeText,
        status: "rascunho",
        ai_model: "google/gemini-2.5-flash",
        generation_prompt_summary: `Atividade: ${activity.description?.substring(0, 100)}`,
        target_reports: ["report_object"],
      } as any, { onConflict: "activity_id" })
      .select()
      .single();

    if (upsertError) {
      console.error("[narrative] Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[narrative] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
