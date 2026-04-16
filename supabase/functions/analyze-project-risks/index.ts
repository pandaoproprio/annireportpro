import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROB_SCORE: Record<string, number> = { muito_baixa: 1, baixa: 2, media: 3, alta: 4, muito_alta: 5 };
const IMPACT_SCORE: Record<string, number> = { insignificante: 1, menor: 2, moderado: 3, maior: 4, catastrofico: 5 };

function riskScore(p: string, i: string): number {
  return (PROB_SCORE[p] || 3) * (IMPACT_SCORE[i] || 3);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRole);
    const body = await req.json();
    const { action, project_id } = body;

    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: corsHeaders });
    }

    // ── ACTION: auto_detect ──
    if (action === "auto_detect") {
      // Gather project data
      const [projectRes, risksRes, activitiesRes, slaRes] = await Promise.all([
        supabaseAdmin.from("projects").select("*").eq("id", project_id).single(),
        supabaseAdmin.from("project_risks").select("*").eq("project_id", project_id),
        supabaseAdmin.from("activities").select("id, description, date, type, attendees_count, is_draft, challenges, results").eq("project_id", project_id).is("deleted_at", null).order("date", { ascending: false }).limit(50),
        supabaseAdmin.from("report_sla_tracking").select("*").eq("project_id", project_id).in("status", ["atrasado", "atencao", "bloqueado"]),
      ]);

      const project = projectRes.data;
      const existingRisks = risksRes.data || [];
      const activities = activitiesRes.data || [];
      const slaIssues = slaRes.data || [];

      // Build context for AI
      const existingTitles = existingRisks.map((r: any) => r.title).join("; ");
      const overdueActivities = activities.filter((a: any) => a.is_draft).length;
      const lowAttendance = activities.filter((a: any) => a.attendees_count === 0).length;

      const contextData = `
Projeto: ${project?.name || "N/A"}
Objeto: ${project?.object || "N/A"}
Riscos existentes: ${existingRisks.length} (${existingTitles || "nenhum"})
Atividades recentes: ${activities.length} (${overdueActivities} rascunhos pendentes, ${lowAttendance} sem participantes)
SLAs em alerta: ${slaIssues.length} (${slaIssues.map((s: any) => `${s.report_type}: ${s.status}`).join(", ") || "nenhum"})
Desafios reportados: ${activities.slice(0, 10).map((a: any) => a.challenges).filter(Boolean).join("; ") || "nenhum"}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Você é um analista de riscos de projetos sociais do terceiro setor no Brasil (CEAP - Rio de Janeiro).
Analise os dados do projeto e identifique riscos potenciais que AINDA NÃO estão cadastrados.
Considere: atrasos em relatórios, falta de participação, SLAs em risco, padrões nos desafios reportados.

Retorne JSON:
{
  "suggestions": [
    {
      "title": "título curto",
      "description": "descrição detalhada",
      "category": "financeiro|operacional|cronograma|equipe|externo|legal|tecnico|outro",
      "probability": "muito_baixa|baixa|media|alta|muito_alta",
      "impact": "insignificante|menor|moderado|maior|catastrofico",
      "mitigation_plan": "sugestão de mitigação",
      "contingency_plan": "sugestão de contingência",
      "source_reasoning": "por que este risco foi identificado"
    }
  ],
  "health_score": 0-100,
  "health_trend": "improving|stable|declining",
  "key_findings": ["achado 1", "achado 2"]
}
Sugira 2-5 riscos. NÃO repita riscos já existentes. Retorne APENAS JSON.`,
            },
            { role: "user", content: contextData },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), { status: 429, headers: corsHeaders });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: corsHeaders });
        throw new Error(`AI Gateway returned ${status}`);
      }

      const aiData = await aiResponse.json();
      const rawText = aiData.choices?.[0]?.message?.content || "";
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Save suggestions to DB
      const suggestions = parsed.suggestions || [];
      for (const s of suggestions) {
        await supabaseAdmin.from("risk_suggestions").insert({
          project_id,
          title: s.title,
          description: s.description,
          category: s.category,
          probability: s.probability,
          impact: s.impact,
          mitigation_plan: s.mitigation_plan || "",
          contingency_plan: s.contingency_plan || "",
          source: "ai_scan",
          source_data: { reasoning: s.source_reasoning },
          status: "pending",
        });
      }

      return new Response(JSON.stringify({
        suggestions,
        health_score: parsed.health_score,
        health_trend: parsed.health_trend,
        key_findings: parsed.key_findings,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── ACTION: recalculate_scores ──
    if (action === "recalculate_scores") {
      const { data: risks } = await supabaseAdmin
        .from("project_risks")
        .select("*")
        .eq("project_id", project_id)
        .neq("status", "resolvido");

      if (!risks || risks.length === 0) {
        return new Response(JSON.stringify({ updated: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get project context for scoring adjustments
      const { data: slaIssues } = await supabaseAdmin
        .from("report_sla_tracking")
        .select("status")
        .eq("project_id", project_id)
        .in("status", ["atrasado", "bloqueado"]);

      const slaCount = slaIssues?.length || 0;
      let updated = 0;

      for (const risk of risks) {
        const baseScore = riskScore(risk.probability, risk.impact);
        let dynamicScore = baseScore;
        let reason = "";

        // Boost for overdue
        if (risk.due_date && new Date(risk.due_date) < new Date()) {
          dynamicScore += 3;
          reason += "Risco atrasado (+3). ";
        }

        // Boost for materialized
        if (risk.status === "materializado") {
          dynamicScore += 5;
          reason += "Risco materializado (+5). ";
        }

        // Boost if SLAs are at risk
        if (slaCount > 0 && ["cronograma", "operacional", "legal"].includes(risk.category)) {
          dynamicScore += Math.min(slaCount * 2, 6);
          reason += `${slaCount} SLAs em risco (+${Math.min(slaCount * 2, 6)}). `;
        }

        const oldScore = risk.dynamic_score || baseScore;
        if (dynamicScore !== oldScore) {
          await supabaseAdmin.from("project_risks").update({
            dynamic_score: dynamicScore,
            last_recalculated_at: new Date().toISOString(),
          }).eq("id", risk.id);

          await supabaseAdmin.from("risk_score_history").insert({
            risk_id: risk.id,
            old_score: oldScore,
            new_score: dynamicScore,
            old_probability: risk.probability,
            new_probability: risk.probability,
            old_impact: risk.impact,
            new_impact: risk.impact,
            change_reason: reason.trim() || "Recálculo periódico",
            changed_by: "system",
          });

          // Generate alert if score crossed critical threshold
          if (dynamicScore >= 15 && oldScore < 15) {
            const { data: projectData } = await supabaseAdmin.from("projects").select("user_id").eq("id", project_id).single();
            if (projectData) {
              await supabaseAdmin.from("risk_alerts").insert({
                project_id,
                risk_id: risk.id,
                alert_type: "critical_threshold",
                title: `Risco "${risk.title}" atingiu nível CRÍTICO`,
                description: `Score dinâmico subiu de ${oldScore} para ${dynamicScore}. ${reason}`,
                severity: "high",
                notified_user_id: projectData.user_id,
              });
            }
          }

          updated++;
        }
      }

      return new Response(JSON.stringify({ updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
