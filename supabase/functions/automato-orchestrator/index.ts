import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Automato Orchestrator — Central engine for all automations.
 * Priorities: 1-Critical, 2-High, 3-Medium, 4-Low
 * 
 * Tasks:
 * - Auto-adjust SLA/WIP thresholds (3.1)
 * - Anomaly detection (3.3)
 * - Auto-remediation (3.4)
 * - Standard monitoring (existing)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const runId = crypto.randomUUID();

  try {
    // Create run record
    await supabase.from("automation_runs").insert({
      id: runId,
      run_type: "orchestrator",
      status: "running",
    });

    const errors: string[] = [];
    let alertsGenerated = 0;

    // ────────────────────────────────────────────
    // 1. ANOMALY DETECTION (3.3)
    // ────────────────────────────────────────────
    try {
      const { data: snapshots } = await supabase
        .from("performance_snapshots")
        .select("*")
        .order("snapshot_month", { ascending: false })
        .limit(200);

      if (snapshots && snapshots.length >= 3) {
        // Group by project
        const byProject = new Map<string, typeof snapshots>();
        snapshots.forEach(s => {
          const arr = byProject.get(s.project_id) || [];
          arr.push(s);
          byProject.set(s.project_id, arr);
        });

        for (const [projectId, projectSnapshots] of byProject) {
          if (projectSnapshots.length < 3) continue;

          // Check activity count anomaly
          const activityCounts = projectSnapshots.map(s => s.total_activities);
          const mean = activityCounts.reduce((a, b) => a + b, 0) / activityCounts.length;
          const stdDev = Math.sqrt(activityCounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / activityCounts.length);

          const latest = projectSnapshots[0];
          if (stdDev > 0 && Math.abs(latest.total_activities - mean) > 2 * stdDev) {
            const direction = latest.total_activities < mean ? "queda" : "pico";
            // Get admin users
            const { data: admins } = await supabase
              .from("user_roles")
              .select("user_id")
              .in("role", ["super_admin", "admin"]);

            for (const admin of admins || []) {
              await supabase.from("automation_alerts").insert({
                run_id: runId,
                alert_type: "anomaly_detected",
                severity: "high",
                title: `Anomalia detectada: ${direction} de atividades`,
                description: `O projeto registrou ${latest.total_activities} atividades no mês (média: ${Math.round(mean)}, desvio: ${Math.round(stdDev)}). Isso representa um desvio significativo (>2σ).`,
                target_user_id: admin.user_id,
                entity_type: "project",
                entity_id: projectId,
                project_id: projectId,
              });
              alertsGenerated++;
            }
          }
        }
      }
    } catch (e) {
      errors.push(`anomaly: ${e instanceof Error ? e.message : "error"}`);
    }

    // ────────────────────────────────────────────
    // 2. AUTO-ADJUST THRESHOLDS (3.1)
    // ────────────────────────────────────────────
    try {
      const { data: config } = await supabase
        .from("performance_config")
        .select("*")
        .limit(1)
        .single();

      if (config) {
        // Calculate optimal WIP limit based on completed workflows
        const { data: completedWf } = await supabase
          .from("report_workflows")
          .select("user_id, status")
          .eq("status", "publicado");

        if (completedWf && completedWf.length >= 10) {
          // Count max concurrent drafts per user historically
          const { data: allDrafts } = await supabase
            .from("report_performance_tracking")
            .select("user_id, calculated_lead_time")
            .not("calculated_lead_time", "is", null);

          if (allDrafts && allDrafts.length >= 10) {
            const leadTimes = allDrafts.map(d => d.calculated_lead_time!).filter(t => t > 0);
            const avgLeadTime = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
            const p90LeadTime = leadTimes.sort((a, b) => a - b)[Math.floor(leadTimes.length * 0.9)];

            // Optimal stale threshold: 2x P90 lead time
            const optimalStaleHours = Math.round(p90LeadTime * 2);
            const currentStaleHours = config.stale_draft_threshold_hours;

            // Only adjust if significant difference (>20%)
            if (Math.abs(optimalStaleHours - currentStaleHours) / currentStaleHours > 0.2) {
              await supabase
                .from("performance_config")
                .update({ stale_draft_threshold_hours: optimalStaleHours } as any)
                .eq("id", config.id);

              // Alert admins
              const { data: admins } = await supabase
                .from("user_roles")
                .select("user_id")
                .in("role", ["super_admin"]);

              for (const admin of admins || []) {
                await supabase.from("automation_alerts").insert({
                  run_id: runId,
                  alert_type: "threshold_adjusted",
                  severity: "medium",
                  title: "Threshold auto-ajustado",
                  description: `Limiar de rascunho parado ajustado de ${currentStaleHours}h para ${optimalStaleHours}h baseado no P90 de lead time (${Math.round(p90LeadTime)}h).`,
                  target_user_id: admin.user_id,
                });
                alertsGenerated++;
              }
            }
          }
        }
      }
    } catch (e) {
      errors.push(`threshold: ${e instanceof Error ? e.message : "error"}`);
    }

    // ────────────────────────────────────────────
    // 3. AUTO-REMEDIATION (3.4)
    // ────────────────────────────────────────────
    try {
      // 3a. Auto-escalate stuck workflows (>48h in em_revisao)
      const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: stuckWorkflows } = await supabase
        .from("report_workflows")
        .select("id, user_id, assigned_to, project_id, status, status_changed_at, escalation_level")
        .eq("status", "em_revisao")
        .lt("status_changed_at", cutoff48h)
        .lt("escalation_level", 3);

      for (const wf of stuckWorkflows || []) {
        await supabase
          .from("report_workflows")
          .update({
            escalation_level: (wf.escalation_level || 0) + 1,
            escalated_at: new Date().toISOString(),
          } as any)
          .eq("id", wf.id);

        // Notify the assigned reviewer
        if (wf.assigned_to) {
          await supabase.from("automation_alerts").insert({
            run_id: runId,
            alert_type: "auto_escalation",
            severity: "high",
            title: "Workflow auto-escalado",
            description: `Um relatório em revisão excedeu 48h sem ação. Nível de escalação aumentado para ${(wf.escalation_level || 0) + 1}.`,
            target_user_id: wf.assigned_to,
            entity_type: "workflow",
            entity_id: wf.id,
            project_id: wf.project_id,
          });
          alertsGenerated++;
        }
      }

      // 3b. Auto-reopen stale drafts that have been stuck too long (>30 days)
      const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: veryOldDrafts } = await supabase
        .from("team_reports")
        .select("id, user_id, project_id")
        .eq("is_draft", true)
        .is("deleted_at", null)
        .lt("created_at", cutoff30d);

      for (const draft of veryOldDrafts || []) {
        await supabase.from("automation_alerts").insert({
          run_id: runId,
          alert_type: "stale_draft_critical",
          severity: "critical",
          title: "Rascunho crítico (>30 dias)",
          description: `Um relatório de equipe está em rascunho há mais de 30 dias. Considere finalizar ou descartar.`,
          target_user_id: draft.user_id,
          entity_type: "team_report",
          entity_id: draft.id,
          project_id: draft.project_id,
        });
        alertsGenerated++;
      }

      // 3c. Auto-notify chain for SLA breaches
      const { data: blockedSla } = await supabase
        .from("report_sla_tracking")
        .select("id, user_id, project_id, report_type, status")
        .eq("status", "bloqueado");

      if (blockedSla && blockedSla.length > 0) {
        const { data: superAdmins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin");

        for (const sla of blockedSla) {
          for (const admin of superAdmins || []) {
            if (admin.user_id === sla.user_id) continue;
            await supabase.from("automation_alerts").insert({
              run_id: runId,
              alert_type: "sla_chain_notification",
              severity: "critical",
              title: "SLA bloqueado — cadeia de notificação",
              description: `Um ${sla.report_type} está com SLA bloqueado. Intervenção administrativa necessária.`,
              target_user_id: admin.user_id,
              entity_type: "sla",
              entity_id: sla.id,
              project_id: sla.project_id,
            });
            alertsGenerated++;
          }
        }
      }
    } catch (e) {
      errors.push(`remediation: ${e instanceof Error ? e.message : "error"}`);
    }

    // ────────────────────────────────────────────
    // 4. STANDARD MONITORING (existing automato logic)
    // ────────────────────────────────────────────
    try {
      // SLA overdue check
      const { data: overdueSla } = await supabase
        .from("report_sla_tracking")
        .select("id, user_id, project_id, report_type")
        .in("status", ["atrasado", "bloqueado"]);

      for (const sla of overdueSla || []) {
        await supabase.from("automation_alerts").insert({
          run_id: runId,
          alert_type: "sla_overdue",
          severity: "high",
          title: `SLA atrasado: ${sla.report_type}`,
          description: `Relatório com SLA vencido requer atenção imediata.`,
          target_user_id: sla.user_id,
          entity_type: "sla",
          entity_id: sla.id,
          project_id: sla.project_id,
        });
        alertsGenerated++;
      }

      // Workflow stuck check
      const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data: stuckWf } = await supabase
        .from("report_workflows")
        .select("id, user_id, assigned_to, project_id")
        .in("status", ["em_revisao", "aprovado"])
        .lt("status_changed_at", cutoff72h);

      for (const wf of stuckWf || []) {
        const targetUser = wf.assigned_to || wf.user_id;
        await supabase.from("automation_alerts").insert({
          run_id: runId,
          alert_type: "workflow_stuck",
          severity: "medium",
          title: "Workflow parado há mais de 72h",
          description: "Um relatório está aguardando ação no fluxo de aprovação há mais de 3 dias.",
          target_user_id: targetUser,
          entity_type: "workflow",
          entity_id: wf.id,
          project_id: wf.project_id,
        });
        alertsGenerated++;
      }
    } catch (e) {
      errors.push(`monitoring: ${e instanceof Error ? e.message : "error"}`);
    }

    // Finalize run
    await supabase.from("automation_runs").update({
      status: errors.length > 0 ? "partial" : "completed",
      finished_at: new Date().toISOString(),
      alerts_generated: alertsGenerated,
      errors: errors.length > 0 ? errors : null,
    } as any).eq("id", runId);

    console.log(`[orchestrator] Run ${runId}: ${alertsGenerated} alerts, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      run_id: runId,
      alerts_generated: alertsGenerated,
      errors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("[orchestrator] Fatal:", msg);

    await supabase.from("automation_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      errors: [msg],
    } as any).eq("id", runId);

    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
