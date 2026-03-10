import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_NAME = "GIRA Relatórios";
const SENDER_DOMAIN = "notify.relatorios.giraerp.com.br";
const FROM_DOMAIN = "relatorios.giraerp.com.br";
const FROM_ADDRESS = `${SITE_NAME} <automato@${FROM_DOMAIN}>`;

// Default thresholds
const STALE_DRAFT_THRESHOLD_HOURS = 168; // 7 days
const INACTIVITY_THRESHOLD_DAYS = 7;

// ────────────── Email Template ──────────────
function AlertEmailTemplate({ alerts, userName }: { alerts: Alert[]; userName: string }) {
  return React.createElement("div", {
    style: { fontFamily: "'DM Sans', Arial, sans-serif", backgroundColor: "#ffffff", padding: "32px" }
  },
    React.createElement("div", {
      style: { maxWidth: "600px", margin: "0 auto", backgroundColor: "#f8fafc", borderRadius: "12px", padding: "32px" }
    },
      // Header
      React.createElement("div", {
        style: { textAlign: "center" as const, marginBottom: "24px" }
      },
        React.createElement("h1", {
          style: { color: "#0DA3E7", fontSize: "24px", margin: "0 0 8px 0" }
        }, "🤖 Automato GIRA"),
        React.createElement("p", {
          style: { color: "#64748b", fontSize: "14px", margin: 0 }
        }, "Monitoramento Automático do Sistema")
      ),
      // Greeting
      React.createElement("p", {
        style: { color: "#1e293b", fontSize: "16px", marginBottom: "16px" }
      }, `Olá, ${userName}!`),
      React.createElement("p", {
        style: { color: "#475569", fontSize: "14px", marginBottom: "24px" }
      }, `O sistema detectou ${alerts.length} alerta(s) que requerem sua atenção:`),
      // Alerts list
      ...alerts.map((alert, i) =>
        React.createElement("div", {
          key: i,
          style: {
            backgroundColor: alert.severity === "critical" ? "#fef2f2" : "#fffbeb",
            border: `1px solid ${alert.severity === "critical" ? "#fecaca" : "#fed7aa"}`,
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
          }
        },
          React.createElement("div", {
            style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }
          },
            React.createElement("span", {
              style: { fontSize: "16px" }
            }, alert.severity === "critical" ? "🔴" : "⚠️"),
            React.createElement("strong", {
              style: { color: "#1e293b", fontSize: "14px" }
            }, alert.title)
          ),
          React.createElement("p", {
            style: { color: "#475569", fontSize: "13px", margin: 0 }
          }, alert.description)
        )
      ),
      // Footer
      React.createElement("div", {
        style: { marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", textAlign: "center" as const }
      },
        React.createElement("p", {
          style: { color: "#94a3b8", fontSize: "12px", margin: 0 }
        }, `Este é um email automático do sistema ${SITE_NAME}. Acesse o sistema para tomar as ações necessárias.`)
      )
    )
  );
}

// ────────────── Types ──────────────
interface Alert {
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  target_user_id: string;
  target_email?: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
}

interface UserAlerts {
  user_id: string;
  email: string;
  name: string;
  alerts: Alert[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Create run record
  const { data: run, error: runError } = await supabase
    .from("automation_runs")
    .insert({ run_type: "monitor", status: "running" })
    .select("id")
    .single();

  if (runError) {
    console.error("Failed to create run record:", runError);
    return new Response(
      JSON.stringify({ error: "Failed to create run record" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const runId = run.id;
  const allAlerts: Alert[] = [];
  const errors: string[] = [];

  try {
    // ── 1. Check overdue SLAs ──
    console.log(`[automato-monitor] Run ${runId}: Checking overdue SLAs...`);
    const { data: overdueSlAs, error: slaError } = await supabase
      .from("report_sla_tracking")
      .select("*")
      .in("status", ["atrasado", "bloqueado"]);

    if (slaError) {
      errors.push(`SLA query error: ${slaError.message}`);
      console.error("SLA query error:", slaError);
    } else if (overdueSlAs && overdueSlAs.length > 0) {
      console.log(`[automato-monitor] Found ${overdueSlAs.length} overdue SLAs`);
      for (const sla of overdueSlAs) {
        const severity = sla.status === "bloqueado" ? "critical" : "warning";
        const typeLabel =
          sla.report_type === "report_object" ? "Relatório do Objeto" :
          sla.report_type === "report_team" ? "Relatório da Equipe" :
          "Justificativa de Prorrogação";

        allAlerts.push({
          alert_type: "sla_overdue",
          severity,
          title: `SLA ${sla.status === "bloqueado" ? "BLOQUEADO" : "Atrasado"}: ${typeLabel}`,
          description: `O relatório tipo "${typeLabel}" ultrapassou o prazo (deadline: ${new Date(sla.deadline_at).toLocaleDateString("pt-BR")}). Status: ${sla.status}.`,
          target_user_id: sla.user_id,
          entity_type: sla.report_type,
          entity_id: sla.report_id,
          project_id: sla.project_id,
        });
      }
    }

    // ── 2. Check stale drafts ──
    console.log(`[automato-monitor] Run ${runId}: Checking stale drafts...`);

    // Fetch config for threshold
    const { data: perfConfig } = await supabase
      .from("performance_config")
      .select("stale_draft_threshold_hours")
      .limit(1)
      .single();

    const thresholdHours = perfConfig?.stale_draft_threshold_hours ?? STALE_DRAFT_THRESHOLD_HOURS;
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

    const [teamDrafts, justDrafts] = await Promise.all([
      supabase
        .from("team_reports")
        .select("id, user_id, project_id, created_at, provider_name")
        .eq("is_draft", true)
        .is("deleted_at", null)
        .lt("created_at", cutoff),
      supabase
        .from("justification_reports")
        .select("id, user_id, project_id, created_at")
        .eq("is_draft", true)
        .is("deleted_at", null)
        .lt("created_at", cutoff),
    ]);

    if (teamDrafts.error) errors.push(`Team drafts query: ${teamDrafts.error.message}`);
    if (justDrafts.error) errors.push(`Just drafts query: ${justDrafts.error.message}`);

    const staleDrafts = [
      ...(teamDrafts.data || []).map(d => ({ ...d, type: "report_team" })),
      ...(justDrafts.data || []).map(d => ({ ...d, type: "justification" })),
    ];

    if (staleDrafts.length > 0) {
      console.log(`[automato-monitor] Found ${staleDrafts.length} stale drafts`);
      for (const draft of staleDrafts) {
        const hoursAge = Math.round((Date.now() - new Date(draft.created_at).getTime()) / (1000 * 60 * 60));
        const daysAge = Math.floor(hoursAge / 24);
        const typeLabel = draft.type === "report_team" ? "Relatório da Equipe" : "Justificativa";
        
        allAlerts.push({
          alert_type: "stale_draft",
          severity: daysAge > 14 ? "critical" : "warning",
          title: `Rascunho estagnado: ${typeLabel}`,
          description: `Rascunho criado há ${daysAge} dias sem finalizar. ${(draft as any).provider_name ? `Prestador: ${(draft as any).provider_name}` : ""}`.trim(),
          target_user_id: draft.user_id,
          entity_type: draft.type,
          entity_id: draft.id,
          project_id: draft.project_id,
        });
      }
    }

    // ── 3. Check project inactivity ──
    console.log(`[automato-monitor] Run ${runId}: Checking project inactivity...`);
    const inactivityCutoff = new Date(Date.now() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, user_id")
      .is("deleted_at", null);

    if (projects) {
      for (const project of projects) {
        const { count } = await supabase
          .from("activities")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id)
          .is("deleted_at", null)
          .gte("created_at", inactivityCutoff);

        if (count === 0) {
          // Check last activity date
          const { data: lastActivity } = await supabase
            .from("activities")
            .select("date")
            .eq("project_id", project.id)
            .is("deleted_at", null)
            .order("date", { ascending: false })
            .limit(1);

          const lastDate = lastActivity?.[0]?.date;
          const daysSince = lastDate
            ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          allAlerts.push({
            alert_type: "project_inactivity",
            severity: daysSince && daysSince > 14 ? "critical" : "warning",
            title: `Projeto inativo: ${project.name}`,
            description: lastDate
              ? `Nenhuma atividade nos últimos ${INACTIVITY_THRESHOLD_DAYS} dias. Última atividade: ${new Date(lastDate).toLocaleDateString("pt-BR")} (${daysSince} dias atrás).`
              : `Nenhuma atividade registrada no projeto "${project.name}".`,
            target_user_id: project.user_id,
            entity_type: "project",
            entity_id: project.id,
            project_id: project.id,
          });
        }
      }
    }

    // ── 4. Deduplicate: skip alerts already sent in last 24h ──
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from("automation_alerts")
      .select("alert_type, target_user_id, entity_id")
      .gte("created_at", twentyFourHoursAgo);

    const recentKeys = new Set(
      (recentAlerts || []).map(a => `${a.alert_type}:${a.target_user_id}:${a.entity_id}`)
    );

    const newAlerts = allAlerts.filter(
      a => !recentKeys.has(`${a.alert_type}:${a.target_user_id}:${a.entity_id}`)
    );

    console.log(`[automato-monitor] Run ${runId}: ${allAlerts.length} total, ${newAlerts.length} new (after dedup)`);

    // ── 5. Resolve user emails ──
    const userIds = [...new Set(newAlerts.map(a => a.target_user_id))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("user_id, email, name").in("user_id", userIds)
      : { data: [] };

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Enrich alerts with emails
    for (const alert of newAlerts) {
      const profile = profileMap.get(alert.target_user_id);
      alert.target_email = profile?.email || undefined;
    }

    // ── 6. Insert alerts into DB ──
    if (newAlerts.length > 0) {
      const { error: insertError } = await supabase
        .from("automation_alerts")
        .insert(
          newAlerts.map(a => ({
            run_id: runId,
            alert_type: a.alert_type,
            severity: a.severity,
            title: a.title,
            description: a.description,
            target_user_id: a.target_user_id,
            target_email: a.target_email,
            entity_type: a.entity_type,
            entity_id: a.entity_id,
            project_id: a.project_id,
          }))
        );
      if (insertError) {
        errors.push(`Alert insert error: ${insertError.message}`);
        console.error("Alert insert error:", insertError);
      }
    }

    // ── 7. Send email alerts (grouped by user) ──
    let emailsSent = 0;

    // Note: Email sending via sendLovableEmail requires auth hook context (run_id from Lovable).
    // For standalone transactional emails, alerts are stored in DB and shown in-app.
    // Email integration will be enabled when transactional email infrastructure is configured.
    if (newAlerts.length > 0) {
      console.log(`[automato-monitor] ${newAlerts.length} alerts stored in DB (in-app notifications)`);
    }

    // ── 8. Finalize run record ──
    await supabase
      .from("automation_runs")
      .update({
        status: errors.length > 0 ? "completed_with_errors" : "completed",
        finished_at: new Date().toISOString(),
        alerts_generated: newAlerts.length,
        emails_sent: emailsSent,
        errors: errors.length > 0 ? errors : null,
        metadata: {
          total_detected: allAlerts.length,
          deduplicated: allAlerts.length - newAlerts.length,
          sla_overdue: allAlerts.filter(a => a.alert_type === "sla_overdue").length,
          stale_drafts: allAlerts.filter(a => a.alert_type === "stale_draft").length,
          inactive_projects: allAlerts.filter(a => a.alert_type === "project_inactivity").length,
        },
      })
      .eq("id", runId);

    const summary = {
      run_id: runId,
      total_detected: allAlerts.length,
      new_alerts: newAlerts.length,
      emails_sent: emailsSent,
      errors: errors.length,
    };

    console.log(`[automato-monitor] Run ${runId} completed:`, summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error(`[automato-monitor] Run ${runId} FAILED:`, e);

    await supabase
      .from("automation_runs")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        errors: [e instanceof Error ? e.message : "Unknown error"],
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", run_id: runId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
