import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch all active projects (not deleted)
    const { data: projects, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("id, name, organization_name, fomento_number, funder, start_date, end_date, goals, locations")
      .is("deleted_at", null);

    if (projErr) throw projErr;
    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum projeto ativo encontrado", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let generated = 0;
    const errors: string[] = [];

    for (const project of projects) {
      try {
        // Check if already generated today
        const today = new Date().toISOString().split("T")[0];
        const { data: existing } = await supabaseAdmin
          .from("proactive_summaries")
          .select("id")
          .eq("project_id", project.id)
          .eq("summary_type", "daily")
          .gte("generated_at", `${today}T00:00:00Z`)
          .limit(1);

        if (existing && existing.length > 0) {
          continue; // Already generated today
        }

        // Fetch activity stats
        const { count: totalActivities } = await supabaseAdmin
          .from("activities")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id)
          .is("deleted_at", null);

        const { data: activitiesData } = await supabaseAdmin
          .from("activities")
          .select("type, attendees_count, is_draft, date")
          .eq("project_id", project.id)
          .is("deleted_at", null);

        const totalAttendees = activitiesData?.reduce((sum, a) => sum + (a.attendees_count || 0), 0) || 0;
        const draftsCount = activitiesData?.filter((a) => a.is_draft).length || 0;

        const activitiesByType: Record<string, number> = {};
        activitiesData?.forEach((a) => {
          activitiesByType[a.type] = (activitiesByType[a.type] || 0) + 1;
        });

        // SLA stats
        const { data: slaData } = await supabaseAdmin
          .from("report_sla_tracking")
          .select("status")
          .eq("project_id", project.id);

        const slaOnTime = slaData?.filter((s) => s.status === "no_prazo").length || 0;
        const slaOverdue = slaData?.filter((s) => s.status === "atrasado" || s.status === "bloqueado").length || 0;

        // Goals count
        const goals = Array.isArray(project.goals) ? project.goals : [];
        const daysRemaining = Math.ceil(
          (new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        const systemPrompt = `Você é um analista executivo especializado em projetos socioculturais brasileiros.
Gere um resumo proativo diário em português do Brasil com base nos dados do projeto.

Estrutura (markdown):
1. **Visão Geral** — contexto em 2 frases
2. **Indicadores-Chave** — números importantes
3. **Análise de Progresso** — avaliação qualitativa
4. **Pontos de Atenção** — riscos ou alertas
5. **Recomendações** — 2-3 ações sugeridas

Seja objetivo e conciso. Máximo 300 palavras.`;

        const userPrompt = `Projeto: ${project.name}
Organização: ${project.organization_name}
Fomento: ${project.fomento_number}
Financiador: ${project.funder}
Período: ${project.start_date} a ${project.end_date}
Dias restantes: ${daysRemaining}
Total atividades: ${totalActivities || 0}
Pessoas impactadas: ${totalAttendees}
Metas: ${goals.length}
Rascunhos: ${draftsCount}
SLA no prazo: ${slaOnTime}, atrasados: ${slaOverdue}
Por tipo: ${JSON.stringify(activitiesByType)}
Locais: ${project.locations?.join(", ") || "Não informado"}`;

        // Call AI
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          errors.push(`Projeto ${project.name}: AI error ${aiResponse.status} - ${errText}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const summaryText = aiData.choices?.[0]?.message?.content || "";

        if (!summaryText) {
          errors.push(`Projeto ${project.name}: Resposta vazia da IA`);
          continue;
        }

        // Persist summary using service role (bypasses RLS)
        const { error: insertErr } = await supabaseAdmin
          .from("proactive_summaries")
          .insert({
            project_id: project.id,
            summary_text: summaryText,
            summary_type: "daily",
            ai_model: "google/gemini-2.5-flash-lite",
            metadata: {
              total_activities: totalActivities || 0,
              total_attendees: totalAttendees,
              sla_on_time: slaOnTime,
              sla_overdue: slaOverdue,
              days_remaining: daysRemaining,
            },
          });

        if (insertErr) {
          errors.push(`Projeto ${project.name}: Insert error - ${insertErr.message}`);
          continue;
        }

        generated++;

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 2000));
      } catch (projError) {
        errors.push(`Projeto ${project.name}: ${projError instanceof Error ? projError.message : "Erro desconhecido"}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Resumos proativos gerados: ${generated}/${projects.length}`,
        generated,
        total_projects: projects.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("daily-proactive-summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
