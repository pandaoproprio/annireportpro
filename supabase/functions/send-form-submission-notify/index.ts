import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  formId: string;
  responseId: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

function buildEmailHtml(
  formTitle: string,
  respondentName: string | null,
  respondentEmail: string | null,
  answers: Record<string, any>,
  fields: { id: string; label: string; sort_order: number; type: string }[],
  submittedAt: string,
  totalResponses: number,
): string {
  const dataFields = fields
    .filter(f => f.type !== 'section_header' && f.type !== 'info_text')
    .sort((a, b) => a.sort_order - b.sort_order);

  const answerRows = dataFields.map(f => {
    let val = answers?.[f.id] ?? '—';
    if (Array.isArray(val)) val = val.join(', ');
    if (typeof val === 'object') val = JSON.stringify(val);
    return `<tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;background:#f8fafc">${f.label}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#334155">${String(val)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
        <tr><td style="padding:24px 32px;background:linear-gradient(135deg,#1e3a6e 0%,#2a7ab5 60%,#2d7a4f 100%)">
          <p style="margin:0 0 6px 0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.6);font-family:monospace">GIRA FORMS · Nova Resposta</p>
          <h1 style="margin:0;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3">${formTitle}</h1>
        </td></tr>
        <tr><td style="padding:12px 32px;border-bottom:3px solid #4a9e3f">
          <span style="font-size:18px;font-weight:800;color:#1e3a6e">GIRA</span>
          <span style="color:#ccc;margin:0 8px">|</span>
          <span style="font-size:13px;font-weight:700;color:#4a9e3f">Formulários</span>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
            <tr>
              <td style="background:#1e3a6e;color:#fff;padding:12px 20px;border-radius:6px;text-align:center">
                <p style="margin:0;font-size:28px;font-weight:800">${totalResponses}</p>
                <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.8">Respostas acumuladas</p>
              </td>
            </tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#64748b">
            <strong>Data:</strong> ${formatDate(submittedAt)}
            ${respondentName ? `<br/><strong>Respondente:</strong> ${respondentName}` : ''}
            ${respondentEmail ? `<br/><strong>E-mail:</strong> ${respondentEmail}` : ''}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;margin-top:16px">
            <thead><tr>
              <th style="padding:8px 12px;border:1px solid #cbd5e1;background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#475569;text-align:left" colspan="2">Dados da Resposta</th>
            </tr></thead>
            <tbody>${answerRows}</tbody>
          </table>
        </td></tr>
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
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');

  if (!brevoApiKey) {
    return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { formId, responseId }: RequestBody = await req.json();
    if (!formId || !responseId) {
      return new Response(JSON.stringify({ error: 'formId and responseId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if this form has per_submission mode
    const { data: digestConfig } = await supabase
      .from('form_digest_config')
      .select('recipients, notify_mode')
      .eq('form_id', formId)
      .eq('notify_mode', 'per_submission')
      .maybeSingle();

    if (!digestConfig || !digestConfig.recipients?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No per_submission config' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get form, response, fields, and total count in parallel
    const [formRes, responseRes, fieldsRes, countRes] = await Promise.all([
      supabase.from('forms').select('title').eq('id', formId).single(),
      supabase.from('form_responses').select('answers, respondent_name, respondent_email, submitted_at').eq('id', responseId).single(),
      supabase.from('form_fields').select('id, label, type, sort_order').eq('form_id', formId).order('sort_order'),
      supabase.from('form_responses').select('id', { count: 'exact', head: true }).eq('form_id', formId),
    ]);

    if (!formRes.data || !responseRes.data) {
      return new Response(JSON.stringify({ error: 'Form or response not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalResponses = countRes.count ?? 0;
    const html = buildEmailHtml(
      formRes.data.title,
      responseRes.data.respondent_name,
      responseRes.data.respondent_email,
      responseRes.data.answers as Record<string, any>,
      (fieldsRes.data || []) as any[],
      responseRes.data.submitted_at,
      totalResponses,
    );

    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'GIRA Forms', email: 'diario@giraerp.com.br' },
        to: (digestConfig.recipients as string[]).map((email: string) => ({ email })),
        subject: `📋 Nova resposta — ${formRes.data.title} (Total: ${totalResponses})`,
        htmlContent: html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error('Email send failed:', err);
      return new Response(JSON.stringify({ error: err.message || 'Send failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✓ Per-submission notification sent for form ${formId} to ${digestConfig.recipients.join(', ')}`);
    return new Response(JSON.stringify({ success: true, totalResponses }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
