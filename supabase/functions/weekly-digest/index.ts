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
const FROM_ADDRESS = `${SITE_NAME} <digest@${FROM_DOMAIN}>`;

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface DigestData {
  activitiesThisWeek: number;
  pendingDrafts: number;
  slaOverdue: number;
  slaWarning: number;
  workflowsStuck: number;
  workflowsCompleted: number;
  projectsSummary: { name: string; activities: number }[];
}

function buildDigestHtml(name: string, data: DigestData, weekLabel: string): string {
  const projectRows = data.projectsSummary.slice(0, 10).map(p =>
    `<tr><td style="padding:8px 12px;color:#1e293b;font-size:13px;border-bottom:1px solid #f1f5f9;">${escapeHtml(p.name)}</td>
         <td style="padding:8px 12px;color:#475569;font-size:13px;text-align:center;border-bottom:1px solid #f1f5f9;">${p.activities}</td></tr>`
  ).join("");

  const slaBlock = (data.slaOverdue + data.slaWarning) > 0
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">⚠️ <strong>${data.slaOverdue}</strong> SLA(s) atrasado(s) · <strong>${data.slaWarning}</strong> em atenção</p>
      </div>`
    : `<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px;margin-bottom:16px;">
        <p style="margin:0;font-size:14px;color:#166534;">✅ Todos os SLAs em dia!</p>
      </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'DM Sans',Arial,sans-serif;background-color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:32px;">
    <div style="background-color:#f8fafc;border-radius:12px;padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#0DA3E7;font-size:22px;margin:0 0 4px 0;">📊 Resumo Semanal</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">${escapeHtml(weekLabel)}</p>
      </div>
      <p style="color:#1e293b;font-size:15px;margin-bottom:20px;">Olá, ${escapeHtml(name)}!</p>

      <!-- Key Metrics -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center;width:33%;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#1e40af;">${data.activitiesThisWeek}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#3b82f6;">Atividades</p>
          </td>
          <td style="width:8px;"></td>
          <td style="background:#fefce8;border-radius:8px;padding:16px;text-align:center;width:33%;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#a16207;">${data.pendingDrafts}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#ca8a04;">Rascunhos</p>
          </td>
          <td style="width:8px;"></td>
          <td style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;width:33%;">
            <p style="margin:0;font-size:24px;font-weight:700;color:#166534;">${data.workflowsCompleted}</p>
            <p style="margin:4px 0 0;font-size:11px;color:#16a34a;">Publicados</p>
          </td>
        </tr>
      </table>

      ${slaBlock}

      ${data.workflowsStuck > 0
        ? `<div style="background:#fffbeb;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-bottom:16px;">
            <p style="margin:0;font-size:14px;color:#92400e;">🔄 <strong>${data.workflowsStuck}</strong> workflow(s) aguardando ação</p>
          </div>`
        : ''}

      ${projectRows
        ? `<h3 style="color:#1e293b;font-size:14px;margin:20px 0 8px;">Atividades por Projeto</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 12px;color:#475569;font-size:12px;text-align:left;">Projeto</th>
              <th style="padding:8px 12px;color:#475569;font-size:12px;text-align:center;">Atividades</th>
            </tr>
            ${projectRows}
          </table>`
        : ''}

      <div style="margin-top:28px;text-align:center;">
        <a href="https://relatorios.giraerp.com.br/dashboard" style="display:inline-block;background-color:#0DA3E7;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Ver Dashboard</a>
      </div>
      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">Resumo semanal automático — ${SITE_NAME}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLabel = `${weekAgo.toLocaleDateString("pt-BR")} a ${now.toLocaleDateString("pt-BR")}`;

    // Get admin/super_admin/coordenador users (digest recipients)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["super_admin", "admin", "coordenador"]);

    const recipientIds = [...new Set((roles || []).map(r => r.user_id))];
    if (recipientIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, name")
      .in("user_id", recipientIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // Gather global metrics
    const weekAgoStr = weekAgo.toISOString();

    const [activitiesRes, teamDraftsRes, justDraftsRes, slaRes, workflowsRes, projectsRes] = await Promise.all([
      supabase.from("activities").select("project_id", { count: "exact" }).is("deleted_at", null).gte("created_at", weekAgoStr),
      supabase.from("team_reports").select("id", { count: "exact", head: true }).eq("is_draft", true).is("deleted_at", null),
      supabase.from("justification_reports").select("id", { count: "exact", head: true }).eq("is_draft", true).is("deleted_at", null),
      supabase.from("report_sla_tracking").select("status"),
      supabase.from("report_workflows").select("status"),
      supabase.from("projects").select("id, name").is("deleted_at", null),
    ]);

    const activities = activitiesRes.data || [];
    const pendingDrafts = (teamDraftsRes.count || 0) + (justDraftsRes.count || 0);

    const slaData = slaRes.data || [];
    const slaOverdue = slaData.filter(s => s.status === "atrasado" || s.status === "bloqueado").length;
    const slaWarning = slaData.filter(s => s.status === "atencao").length;

    const wfData = workflowsRes.data || [];
    const workflowsStuck = wfData.filter(w => w.status === "em_revisao" || w.status === "aprovado").length;
    const workflowsCompleted = wfData.filter(w => w.status === "publicado").length;

    // Activities per project
    const projectNames = new Map((projectsRes.data || []).map(p => [p.id, p.name]));
    const projectCounts: Record<string, number> = {};
    for (const a of activities) {
      projectCounts[a.project_id] = (projectCounts[a.project_id] || 0) + 1;
    }
    const projectsSummary = Object.entries(projectCounts)
      .map(([id, count]) => ({ name: projectNames.get(id) || "Projeto", activities: count }))
      .sort((a, b) => b.activities - a.activities);

    const digestData: DigestData = {
      activitiesThisWeek: activities.length,
      pendingDrafts,
      slaOverdue,
      slaWarning,
      workflowsStuck,
      workflowsCompleted,
      projectsSummary,
    };

    // Send to each recipient
    let sent = 0;
    for (const userId of recipientIds) {
      const profile = profileMap.get(userId);
      if (!profile?.email) continue;

      const html = buildDigestHtml(profile.name || "Gestor", digestData, weekLabel);
      const text = `Resumo Semanal GIRA (${weekLabel})\n\nAtividades: ${digestData.activitiesThisWeek}\nRascunhos pendentes: ${digestData.pendingDrafts}\nSLAs atrasados: ${digestData.slaOverdue}\nWorkflows publicados: ${digestData.workflowsCompleted}\n\nAcesse: https://relatorios.giraerp.com.br/dashboard`;

      const res = await fetch("https://email-api.lovable.dev/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableApiKey}` },
        body: JSON.stringify({
          to: profile.email,
          from: FROM_ADDRESS,
          sender_domain: SENDER_DOMAIN,
          subject: `📊 Resumo Semanal — ${SITE_NAME}`,
          html,
          text,
          purpose: "transactional",
        }),
      });

      if (res.ok) sent++;
      else console.error(`[digest] Failed for ${profile.email}: ${res.status}`);
    }

    console.log(`[weekly-digest] Sent ${sent}/${recipientIds.length} digests`);

    return new Response(JSON.stringify({ success: true, sent, recipients: recipientIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("[weekly-digest] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
