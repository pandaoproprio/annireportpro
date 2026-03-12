import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DigestConfig {
  id: string;
  form_id: string;
  recipients: string[];
  frequency: string;
  is_active: boolean;
  last_sent_at: string | null;
}

interface FormResponse {
  id: string;
  answers: Record<string, any>;
  respondent_name: string | null;
  respondent_email: string | null;
  submitted_at: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  sort_order: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function buildResponseRow(response: FormResponse, fields: FormField[]): string {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
  const cells = sorted.map(f => {
    let val = response.answers?.[f.id] ?? '—';
    if (Array.isArray(val)) val = val.join(', ');
    if (typeof val === 'object') val = JSON.stringify(val);
    return `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#334155">${String(val)}</td>`;
  });
  return `<tr>
    <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#64748b;white-space:nowrap">${formatDate(response.submitted_at)}</td>
    ${response.respondent_name ? `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px">${response.respondent_name}</td>` : ''}
    ${cells.join('')}
  </tr>`;
}

function buildDigestHtml(formTitle: string, responses: FormResponse[], fields: FormField[], periodLabel: string): string {
  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);
  const hasName = responses.some(r => r.respondent_name);

  const headerCells = sorted.map(f =>
    `<th style="padding:8px 12px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;text-align:left">${f.label}</th>`
  ).join('');

  const rows = responses.map(r => buildResponseRow(r, fields)).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table width="700" cellpadding="0" cellspacing="0" style="max-width:700px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#1e3a6e 0%,#2a7ab5 60%,#2d7a4f 100%)">
          <p style="margin:0 0 8px 0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.6);font-family:monospace">GIRA FORMS · Resumo Diário</p>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3">${formTitle}</h1>
        </td></tr>
        <!-- Brand bar -->
        <tr><td style="padding:12px 32px;border-bottom:3px solid #4a9e3f">
          <span style="font-size:18px;font-weight:800;color:#1e3a6e">GIRA</span>
          <span style="color:#ccc;margin:0 8px">|</span>
          <span style="font-size:13px;font-weight:700;color:#4a9e3f">Formulários</span>
        </td></tr>
        <!-- Summary -->
        <tr><td style="padding:24px 32px">
          <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.6">
            Período: <strong>${periodLabel}</strong><br/>
            Total de respostas: <strong style="color:#1e3a6e">${responses.length}</strong>
          </p>
          ${responses.length === 0
            ? '<p style="margin:16px 0;padding:24px;background:#f8fafc;border-radius:6px;text-align:center;color:#94a3b8;font-size:14px">Nenhuma resposta recebida neste período.</p>'
            : `<div style="overflow-x:auto">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px">
                <thead><tr>
                  <th style="padding:8px 12px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;text-align:left">Data</th>
                  ${hasName ? '<th style="padding:8px 12px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;text-align:left">Respondente</th>' : ''}
                  ${headerCells}
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>`
          }
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#1e3a6e;text-align:center">
          <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:0.15em;text-transform:uppercase;font-family:monospace">GIRA Forms · Diário de Bordo · CEAP</p>
          <p style="margin:4px 0 0;font-size:10px;color:rgba(255,255,255,0.3)">E-mail automático — não responda.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Get all active digest configs
    const { data: configs, error: cfgErr } = await supabase
      .from('form_digest_config')
      .select('*')
      .eq('is_active', true)
      .eq('frequency', 'daily');

    if (cfgErr) throw cfgErr;
    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ message: 'No active digests', sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;
    const errors: string[] = [];

    for (const config of configs as DigestConfig[]) {
      if (!config.recipients || config.recipients.length === 0) continue;

      // Get form info
      const { data: form } = await supabase
        .from('forms')
        .select('title')
        .eq('id', config.form_id)
        .single();

      if (!form) continue;

      // Get fields
      const { data: fields } = await supabase
        .from('form_fields')
        .select('id, label, type, sort_order')
        .eq('form_id', config.form_id)
        .order('sort_order');

      // Get responses since last sent (or last 24h)
      const since = config.last_sent_at
        ? new Date(config.last_sent_at).toISOString()
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: responses } = await supabase
        .from('form_responses')
        .select('id, answers, respondent_name, respondent_email, submitted_at')
        .eq('form_id', config.form_id)
        .gte('submitted_at', since)
        .order('submitted_at', { ascending: true });

      const now = new Date();
      const responseList = (responses || []) as FormResponse[];
      // Use first response date as period start (not last_sent_at which may be artificially old)
      const periodStart = responseList.length > 0
        ? new Date(responseList[0].submitted_at)
        : now;
      const periodLabel = responseList.length > 0
        ? `${periodStart.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} — ${now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
        : now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const html = buildDigestHtml(
        form.title,
        responseList,
        (fields || []) as FormField[],
        periodLabel
      );

      // Send email via Resend
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GIRA Forms <diario@giraerp.com.br>',
          to: config.recipients,
          subject: `📋 Resumo diário — ${form.title} (${(responses || []).length} resposta${(responses || []).length !== 1 ? 's' : ''})`,
          html,
        }),
      });

      if (emailRes.ok) {
        totalSent++;
        // Update last_sent_at
        await supabase
          .from('form_digest_config')
          .update({ last_sent_at: now.toISOString(), updated_at: now.toISOString() })
          .eq('id', config.id);
      } else {
        const err = await emailRes.json();
        errors.push(`Form ${config.form_id}: ${err.message || 'Send failed'}`);
      }
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent, errors }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Digest error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
