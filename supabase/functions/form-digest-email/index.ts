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

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Safe base64 encoding for large ArrayBuffers (avoids call stack overflow)
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
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
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#1e3a6e 0%,#2a7ab5 60%,#2d7a4f 100%)">
          <p style="margin:0 0 8px 0;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.6);font-family:monospace">GIRA FORMS · Resumo Diário</p>
          <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;line-height:1.3">${formTitle}</h1>
        </td></tr>
        <tr><td style="padding:12px 32px;border-bottom:3px solid #4a9e3f">
          <span style="font-size:18px;font-weight:800;color:#1e3a6e">GIRA</span>
          <span style="color:#ccc;margin:0 8px">|</span>
          <span style="font-size:13px;font-weight:700;color:#4a9e3f">Formulários</span>
        </td></tr>
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

// Generate XLS (XML Spreadsheet) server-side
function generateXlsBuffer(formTitle: string, fields: FormField[], responses: FormResponse[]): Uint8Array {
  const dataFields = fields.filter(f => f.type !== 'section_header' && f.type !== 'info_text')
    .sort((a, b) => a.sort_order - b.sort_order);
  const headers = ['Data', 'Respondente', 'E-mail', ...dataFields.map(f => f.label)];

  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += `<Worksheet ss:Name="Respostas"><Table>\n`;

  xml += '<Row>';
  headers.forEach(h => { xml += `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`; });
  xml += '</Row>\n';

  responses.forEach(r => {
    const dateStr = formatDate(r.submitted_at);
    xml += '<Row>';
    xml += `<Cell><Data ss:Type="String">${escapeXml(dateStr)}</Data></Cell>`;
    xml += `<Cell><Data ss:Type="String">${escapeXml(r.respondent_name || '')}</Data></Cell>`;
    xml += `<Cell><Data ss:Type="String">${escapeXml(r.respondent_email || '')}</Data></Cell>`;
    dataFields.forEach(f => {
      const val = r.answers?.[f.id];
      const fmt = (v: unknown): string => typeof v === 'string' && v.startsWith('__other__:') ? `Outros: ${v.replace('__other__:', '')}` : String(v ?? '');
      const cellVal = Array.isArray(val) ? val.map(fmt).join(', ') : fmt(val);
      xml += `<Cell><Data ss:Type="String">${escapeXml(cellVal)}</Data></Cell>`;
    });
    xml += '</Row>\n';
  });

  xml += '</Table></Worksheet></Workbook>';
  return new TextEncoder().encode(xml);
}

// Fetch PDF from export-form-pdf function
async function fetchPdfAttachment(
  supabaseUrl: string,
  serviceRoleKey: string,
  formId: string,
  mode: string,
): Promise<ArrayBuffer | null> {
  try {
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || serviceRoleKey;
    const url = `${supabaseUrl}/functions/v1/export-form-pdf`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ formId, mode }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`PDF ${mode} generation failed (${res.status}):`, errText);
      return null;
    }

    return await res.arrayBuffer();
  } catch (e) {
    console.error(`Failed to generate PDF (${mode}):`, e);
    return null;
  }
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
    // Parse optional body params
    let bodyFormId: string | null = null;
    let overrideRecipients: string[] | null = null;
    let force = false;

    try {
      const body = await req.json();
      bodyFormId = body.formId || null;
      overrideRecipients = body.overrideRecipients || null;
      force = body.force === true;
    } catch { /* no body or invalid json */ }

    // Get active digest configs
    let configQuery = supabase
      .from('form_digest_config')
      .select('*')
      .eq('is_active', true)
      .eq('frequency', 'daily');

    if (bodyFormId) {
      configQuery = configQuery.eq('form_id', bodyFormId);
    }

    const { data: configs, error: cfgErr } = await configQuery;

    if (cfgErr) throw cfgErr;

    // If formId specified but no config exists, create a virtual config
    let configList: DigestConfig[] = (configs || []) as DigestConfig[];
    if (bodyFormId && configList.length === 0 && overrideRecipients) {
      configList = [{
        id: 'virtual',
        form_id: bodyFormId,
        recipients: overrideRecipients,
        frequency: 'daily',
        is_active: true,
        last_sent_at: null,
      }];
    }

    if (configList.length === 0) {
      return new Response(JSON.stringify({ message: 'No active digests', sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;
    const errors: string[] = [];

    for (const config of configList) {
      const recipients = overrideRecipients || config.recipients;
      if (!recipients || recipients.length === 0) continue;

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
        .not('type', 'in', '("section_header","info_text")')
        .order('sort_order');

      // Get responses — if force, get ALL; otherwise since last_sent_at
      let responseQuery = supabase
        .from('form_responses')
        .select('id, answers, respondent_name, respondent_email, submitted_at')
        .eq('form_id', config.form_id)
        .order('submitted_at', { ascending: true });

      if (!force && config.last_sent_at) {
        responseQuery = responseQuery.gte('submitted_at', new Date(config.last_sent_at).toISOString());
      }

      const { data: responses } = await responseQuery;

      const now = new Date();
      const responseList = (responses || []) as FormResponse[];
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

      // Generate attachments dynamically in parallel
      console.log(`Generating attachments for form ${config.form_id} (${responseList.length} responses)...`);

      const [tablePdfBuf, aiPdfBuf] = await Promise.all([
        fetchPdfAttachment(supabaseUrl, serviceRoleKey, config.form_id, 'table'),
        fetchPdfAttachment(supabaseUrl, serviceRoleKey, config.form_id, 'ai-report'),
      ]);

      const xlsBuf = generateXlsBuffer(form.title, (fields || []) as FormField[], responseList);

      // Brevo: campo `attachment` (singular) com { name, content (base64) }
      const attachments: { name: string; content: string }[] = [];

      if (aiPdfBuf && aiPdfBuf.byteLength > 0) {
        attachments.push({ name: 'Relatório_IA.pdf', content: arrayBufferToBase64(aiPdfBuf) });
        console.log(`✓ AI Report: ${Math.round(aiPdfBuf.byteLength / 1024)}KB`);
      } else {
        errors.push(`Form ${config.form_id}: AI Report generation failed`);
        console.error('✗ AI Report generation failed');
      }

      if (tablePdfBuf && tablePdfBuf.byteLength > 0) {
        attachments.push({ name: 'Respostas.pdf', content: arrayBufferToBase64(tablePdfBuf) });
        console.log(`✓ Table PDF: ${Math.round(tablePdfBuf.byteLength / 1024)}KB`);
      } else {
        errors.push(`Form ${config.form_id}: Table PDF generation failed`);
        console.error('✗ Table PDF generation failed');
      }

      if (xlsBuf.byteLength > 0) {
        attachments.push({ name: 'Respostas.xls', content: arrayBufferToBase64(xlsBuf.buffer as ArrayBuffer) });
        console.log(`✓ XLS: ${Math.round(xlsBuf.byteLength / 1024)}KB`);
      }

      console.log(`Sending email to ${recipients.join(', ')} with ${attachments.length} attachment(s)...`);

      // Send email via Brevo
      const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'GIRA Forms', email: 'diario@giraerp.com.br' },
          to: recipients.map((email: string) => ({ email })),
          subject: `📋 Resumo — ${form.title} (${responseList.length} resposta${responseList.length !== 1 ? 's' : ''})`,
          htmlContent: html,
          attachment: attachments,
        }),
      });

      if (emailRes.ok) {
        totalSent++;
        console.log(`✓ Email sent successfully to ${recipients.join(', ')}`);
        // Update last_sent_at only for real configs
        if (config.id !== 'virtual') {
          await supabase
            .from('form_digest_config')
            .update({ last_sent_at: now.toISOString(), updated_at: now.toISOString() })
            .eq('id', config.id);
        }
      } else {
        const err = await emailRes.json();
        const msg = `Form ${config.form_id}: ${err.message || 'Send failed'}`;
        errors.push(msg);
        console.error('✗ Email send failed:', err);
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
