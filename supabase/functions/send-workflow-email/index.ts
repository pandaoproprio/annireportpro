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

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  em_revisao: "Em Revisão",
  aprovado: "Aprovado",
  publicado: "Publicado",
  devolvido: "Devolvido",
};

const REPORT_TYPE_LABELS: Record<string, string> = {
  report_object: "Relatório do Objeto",
  report_team: "Relatório da Equipe",
  justification: "Justificativa",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getStatusColor(status: string): { bg: string; border: string; text: string } {
  switch (status) {
    case "aprovado": return { bg: "#f0fdf4", border: "#86efac", text: "#166534" };
    case "publicado": return { bg: "#eff6ff", border: "#93c5fd", text: "#1e40af" };
    case "devolvido": return { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" };
    case "em_revisao": return { bg: "#fffbeb", border: "#fed7aa", text: "#92400e" };
    default: return { bg: "#f8fafc", border: "#e2e8f0", text: "#475569" };
  }
}

function buildWorkflowEmailHtml(
  recipientName: string,
  changedByName: string,
  reportType: string,
  fromStatus: string | null,
  toStatus: string,
  notes: string | null,
): string {
  const statusColor = getStatusColor(toStatus);
  const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType;
  const toLabel = STATUS_LABELS[toStatus] || toStatus;
  const fromLabel = fromStatus ? (STATUS_LABELS[fromStatus] || fromStatus) : null;

  const statusTransition = fromLabel
    ? `<span style="color:#64748b;">${escapeHtml(fromLabel)}</span> → <strong style="color:${statusColor.text};">${escapeHtml(toLabel)}</strong>`
    : `<strong style="color:${statusColor.text};">${escapeHtml(toLabel)}</strong>`;

  const notesBlock = notes
    ? `<div style="background:#f1f5f9;border-radius:6px;padding:12px;margin-top:16px;">
        <p style="color:#64748b;font-size:12px;margin:0 0 4px 0;">Observação:</p>
        <p style="color:#1e293b;font-size:14px;margin:0;">${escapeHtml(notes)}</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'DM Sans',Arial,sans-serif;background-color:#ffffff;">
  <div style="max-width:600px;margin:0 auto;padding:32px;">
    <div style="background-color:#f8fafc;border-radius:12px;padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#0DA3E7;font-size:22px;margin:0 0 4px 0;">📋 Atualização de Workflow</h1>
        <p style="color:#64748b;font-size:13px;margin:0;">${SITE_NAME}</p>
      </div>
      <p style="color:#1e293b;font-size:15px;margin-bottom:16px;">Olá, ${escapeHtml(recipientName)}!</p>
      <p style="color:#475569;font-size:14px;margin-bottom:20px;">
        <strong>${escapeHtml(changedByName)}</strong> alterou o status do <strong>${escapeHtml(typeLabel)}</strong>:
      </p>
      <div style="background:${statusColor.bg};border:1px solid ${statusColor.border};border-radius:8px;padding:16px;text-align:center;">
        <p style="font-size:16px;margin:0;">${statusTransition}</p>
      </div>
      ${notesBlock}
      <div style="margin-top:28px;text-align:center;">
        <a href="https://relatorios.giraerp.com.br" style="display:inline-block;background-color:#0DA3E7;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Abrir no Sistema</a>
      </div>
      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">E-mail automático do sistema ${SITE_NAME}.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string, text: string, apiKey: string) {
  const res = await fetch("https://email-api.lovable.dev/v1/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      to,
      from: `${SITE_NAME} <workflow@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[workflow-email] Failed: ${res.status} ${body}`);
  }
  return res.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { workflow_id, from_status, to_status, changed_by, notes } = await req.json();

    if (!workflow_id || !to_status || !changed_by) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get workflow details
    const { data: wf } = await supabase
      .from("report_workflows")
      .select("*")
      .eq("id", workflow_id)
      .single();

    if (!wf) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for all relevant users
    const userIds = [wf.user_id, changed_by, wf.assigned_to].filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const changedByProfile = profileMap.get(changed_by);
    const changedByName = changedByProfile?.name || "Sistema";

    // Determine recipients (owner + assignee, exclude the changer)
    const recipients: string[] = [];
    if (wf.user_id !== changed_by) recipients.push(wf.user_id);
    if (wf.assigned_to && wf.assigned_to !== changed_by && wf.assigned_to !== wf.user_id) {
      recipients.push(wf.assigned_to);
    }

    let sent = 0;
    const toLabel = STATUS_LABELS[to_status] || to_status;
    const typeLabel = REPORT_TYPE_LABELS[wf.report_type] || wf.report_type;

    for (const recipientId of recipients) {
      const profile = profileMap.get(recipientId);
      if (!profile?.email) continue;

      const subject = `📋 ${typeLabel} → ${toLabel} — ${SITE_NAME}`;
      const html = buildWorkflowEmailHtml(
        profile.name || "Usuário",
        changedByName,
        wf.report_type,
        from_status,
        to_status,
        notes,
      );
      const text = `Olá, ${profile.name}!\n\n${changedByName} alterou o status do ${typeLabel}: ${from_status ? STATUS_LABELS[from_status] + ' → ' : ''}${toLabel}\n${notes ? `\nObservação: ${notes}` : ''}\n\nAcesse: https://relatorios.giraerp.com.br`;

      const ok = await sendEmail(profile.email, subject, html, text, lovableApiKey);
      if (ok) sent++;
    }

    return new Response(JSON.stringify({ success: true, emails_sent: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[workflow-email] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
