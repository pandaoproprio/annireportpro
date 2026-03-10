import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ────────────── Email HTML Builder ──────────────
function buildAlertEmailHtml(alerts: Alert[], userName: string): string {
  const alertCards = alerts.map(alert => {
    const bgColor = alert.severity === "critical" ? "#fef2f2" : "#fffbeb";
    const borderColor = alert.severity === "critical" ? "#fecaca" : "#fed7aa";
    const icon = alert.severity === "critical" ? "🔴" : "⚠️";
    return `
      <div style="background-color:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="margin-bottom:8px;">
          <span style="font-size:16px;">${icon}</span>
          <strong style="color:#1e293b;font-size:14px;margin-left:6px;">${escapeHtml(alert.title)}</strong>
        </div>
        <p style="color:#475569;font-size:13px;margin:0;">${escapeHtml(alert.description)}</p>
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'DM Sans',Arial,sans-serif;background-color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:32px;">
    <div style="background-color:#f8fafc;border-radius:12px;padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#0DA3E7;font-size:24px;margin:0 0 8px 0;">🤖 Automato GIRA</h1>
        <p style="color:#64748b;font-size:14px;margin:0;">Monitoramento Automático do Sistema</p>
      </div>
      <p style="color:#1e293b;font-size:16px;margin-bottom:16px;">Olá, ${escapeHtml(userName)}!</p>
      <p style="color:#475569;font-size:14px;margin-bottom:24px;">O sistema detectou <strong>${alerts.length} alerta(s)</strong> que requerem sua atenção:</p>
      ${alertCards}
      <div style="margin-top:32px;text-align:center;">
        <a href="https://relatorios.giraerp.com.br/automato" style="display:inline-block;background-color:#0DA3E7;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Ver Alertas no Sistema</a>
      </div>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Este é um email automático do sistema ${SITE_NAME}.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildAlertEmailText(alerts: Alert[], userName: string): string {
  const alertLines = alerts.map(a => `[${a.severity === "critical" ? "CRÍTICO" : "AVISO"}] ${a.title}\n${a.description}`).join("\n\n");
  return `Olá, ${userName}!\n\nO sistema detectou ${alerts.length} alerta(s):\n\n${alertLines}\n\nAcesse: https://relatorios.giraerp.com.br/automato`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

// ────────────── Email Sending ──────────────
async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://email-api.lovable.dev/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[automato-email] Failed to send to ${to}: ${res.status} ${body}`);
      return { success: false, error: `HTTP ${res.status}: ${body}` };
    }

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[automato-email] Exception sending to ${to}: ${msg}`);
    return { success: false, error: msg };
  }
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
    // ── 4. Workflow escalation ──
    console.log(`[automato-monitor] Run ${runId}: Checking workflow escalation...`);
    const ESCALATION_THRESHOLD_HOURS = 48;
    const escalationCutoff = new Date(Date.now() - ESCALATION_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

    const { data: stuckWorkflows, error: wfError } = await supabase
      .from("report_workflows")
      .select("*")
      .in("status", ["em_revisao", "aprovado"])
      .lt("status_changed_at", escalationCutoff);

    if (wfError) {
      errors.push(`Workflow query error: ${wfError.message}`);
    } else if (stuckWorkflows && stuckWorkflows.length > 0) {
      console.log(`[automato-monitor] Found ${stuckWorkflows.length} stuck workflows to escalate`);
      for (const wf of stuckWorkflows) {
        const hoursSince = Math.round((Date.now() - new Date(wf.status_changed_at).getTime()) / (1000 * 60 * 60));
        const newLevel = wf.escalation_level + 1;

        // Update escalation level
        await supabase
          .from("report_workflows")
          .update({
            escalation_level: newLevel,
            escalated_at: new Date().toISOString(),
          })
          .eq("id", wf.id);

        const statusLabel = wf.status === "em_revisao" ? "Em Revisão" : "Aprovado";
        const typeLabel =
          wf.report_type === "report_object" ? "Relatório do Objeto" :
          wf.report_type === "report_team" ? "Relatório da Equipe" : "Justificativa";

        // Alert the report owner
        allAlerts.push({
          alert_type: "workflow_stuck",
          severity: newLevel >= 3 ? "critical" : "warning",
          title: `Workflow parado: ${typeLabel} — ${statusLabel}`,
          description: `O relatório está no status "${statusLabel}" há ${hoursSince}h sem avanço. Escalação nível ${newLevel}.`,
          target_user_id: wf.user_id,
          entity_type: wf.report_type,
          entity_id: wf.report_id,
          project_id: wf.project_id,
        });

        // If assigned_to exists, alert them too
        if (wf.assigned_to && wf.assigned_to !== wf.user_id) {
          allAlerts.push({
            alert_type: "workflow_stuck",
            severity: newLevel >= 3 ? "critical" : "warning",
            title: `Ação necessária: ${typeLabel} aguardando sua revisão`,
            description: `Este relatório aguarda sua ação há ${hoursSince}h. Escalação nível ${newLevel}.`,
            target_user_id: wf.assigned_to,
            entity_type: wf.report_type,
            entity_id: wf.report_id,
            project_id: wf.project_id,
          });
        }
      }
    }

    // ── 5. Deduplicate: skip alerts already sent in last 24h ──
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
      }
    }

    // ── 7. Send email alerts (grouped by user) ──
    let emailsSent = 0;

    if (lovableApiKey && newAlerts.length > 0) {
      // Group alerts by user
      const userAlertsMap = new Map<string, UserAlerts>();

      for (const alert of newAlerts) {
        const profile = profileMap.get(alert.target_user_id);
        if (!profile?.email) continue;

        if (!userAlertsMap.has(alert.target_user_id)) {
          userAlertsMap.set(alert.target_user_id, {
            user_id: alert.target_user_id,
            email: profile.email,
            name: profile.name || "Usuário",
            alerts: [],
          });
        }
        userAlertsMap.get(alert.target_user_id)!.alerts.push(alert);
      }

      console.log(`[automato-monitor] Sending emails to ${userAlertsMap.size} users...`);

      for (const [userId, userAlerts] of userAlertsMap) {
        const criticalCount = userAlerts.alerts.filter(a => a.severity === "critical").length;
        const subject = criticalCount > 0
          ? `🔴 ${criticalCount} alerta(s) crítico(s) — Automato GIRA`
          : `⚠️ ${userAlerts.alerts.length} alerta(s) — Automato GIRA`;

        const html = buildAlertEmailHtml(userAlerts.alerts, userAlerts.name);
        const text = buildAlertEmailText(userAlerts.alerts, userAlerts.name);

        const result = await sendTransactionalEmail(
          userAlerts.email,
          subject,
          html,
          text,
          lovableApiKey
        );

        if (result.success) {
          emailsSent++;
          console.log(`[automato-monitor] Email sent to ${userAlerts.email}`);

          // Mark alerts as email_sent
          await supabase
            .from("automation_alerts")
            .update({ email_sent: true } as any)
            .eq("run_id", runId)
            .eq("target_user_id", userId);
        } else {
          errors.push(`Email to ${userAlerts.email}: ${result.error}`);

          // Store error on alerts
          await supabase
            .from("automation_alerts")
            .update({ email_error: result.error } as any)
            .eq("run_id", runId)
            .eq("target_user_id", userId);
        }
      }
    } else if (!lovableApiKey) {
      console.warn("[automato-monitor] LOVABLE_API_KEY not set, skipping email sending");
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
