import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    if (!BREVO_API_KEY) throw new Error('BREVO_API_KEY ausente');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const { form_id, dry_run, test_email, skip_already_sent } = await req.json();
    const ERRATA_KEY = 'labrd-data-2026-04-29';
    if (!form_id) {
      return new Response(JSON.stringify({ error: 'form_id obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: form, error: formErr } = await supabase
      .from('forms')
      .select('id, title')
      .eq('id', form_id)
      .maybeSingle();
    if (formErr) throw formErr;
    if (!form) throw new Error('Formulário não encontrado');

    let recipients: Array<{ name: string | null; email: string }> = [];
    if (test_email) {
      recipients = [{ name: 'Teste', email: test_email }];
    } else {
      const { data: rows, error: respErr } = await supabase
        .from('form_responses')
        .select('respondent_name, respondent_email')
        .eq('form_id', form_id)
        .not('respondent_email', 'is', null);
      if (respErr) throw respErr;
      const seen = new Set<string>();
      recipients = (rows || [])
        .filter((r: any) => r.respondent_email && r.respondent_email.trim() !== '')
        .filter((r: any) => {
          const e = r.respondent_email.toLowerCase().trim();
          if (seen.has(e)) return false;
          seen.add(e);
          return true;
        })
        .map((r: any) => ({ name: r.respondent_name, email: r.respondent_email.trim() }));
    }

    let alreadySentCount = 0;
    if (skip_already_sent && !test_email) {
      const { data: sentRows } = await supabase
        .from('form_errata_sends')
        .select('recipient_email')
        .eq('form_id', form_id)
        .eq('errata_key', ERRATA_KEY);
      const sentSet = new Set((sentRows || []).map((r: any) => r.recipient_email.toLowerCase().trim()));
      const before = recipients.length;
      recipients = recipients.filter(r => !sentSet.has(r.email.toLowerCase().trim()));
      alreadySentCount = before - recipients.length;
    }

    if (dry_run) {
      return new Response(JSON.stringify({ total: recipients.length, already_sent: alreadySentCount, dry_run: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const PROGRAM_URL = 'https://www.instagram.com/p/DXe516aERmE/?utm_source=ig_web_copy_link';

    const buildHtml = (firstName: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f7fa; padding: 20px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0d9488 100%); padding: 24px; text-align: center;">
      <p style="color: #fef3c7; font-size: 12px; font-weight: bold; letter-spacing: 1px; margin: 0 0 6px;">⚠️ ERRATA</p>
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">Correção do lembrete enviado</h1>
      <p style="color: #e0f2fe; font-size: 13px; margin: 6px 0 0;">1º Seminário LabRD da Baixada Fluminense</p>
    </div>
    <div style="padding: 26px 24px;">
      <p style="font-size: 15px; color: #1e293b; margin: 0 0 14px;">Olá, <strong>${firstName}</strong>!</p>

      <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 14px 16px; margin: 0 0 18px;">
        <p style="font-size: 14px; color: #991b1b; margin: 0; line-height: 1.55;">
          <strong>Pedimos desculpas:</strong> o lembrete enviado anteriormente continha uma informação incorreta sobre a data do evento. Segue abaixo a informação correta.
        </p>
      </div>

      <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 16px;">
        Reforçamos nosso compromisso com a clareza e a organização do evento. Agradecemos a sua compreensão.
      </p>

      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 0 0 18px;">
        <p style="font-size: 13px; font-weight: bold; color: #0c4a6e; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.5px;">📅 Data e horário corretos</p>
        <p style="font-size: 16px; font-weight: bold; color: #0ea5e9; margin: 0 0 4px;">29 de abril de 2026 (quarta-feira)</p>
        <p style="font-size: 14px; color: #0f172a; margin: 0;">Das <strong>8h às 16h</strong></p>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 18px;">
        <p style="font-size: 13px; font-weight: bold; color: #0c4a6e; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">📍 Local</p>
        <p style="font-size: 14px; color: #1e293b; margin: 0 0 4px;"><strong>Casa do Professor</strong></p>
        <p style="font-size: 13px; color: #475569; margin: 0 0 12px; line-height: 1.5;">Av. Abílio Augusto Távora, 1806<br/>Bairro da Luz, Nova Iguaçu - RJ</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Casa do Professor, Av. Abílio Augusto Távora, 1806, Bairro da Luz, Nova Iguaçu - RJ')}" target="_blank" style="display: inline-block; padding: 8px 16px; background: #0ea5e9; color: #ffffff; font-size: 12px; font-weight: bold; border-radius: 6px; text-decoration: none;">🗺️ Abrir no Google Maps</a>
      </div>

      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 16px; text-align: center;">
        <p style="font-size: 13px; font-weight: bold; color: #92400e; margin: 0 0 10px;">📋 Programação completa do evento</p>
        <a href="${PROGRAM_URL}" target="_blank" style="display: inline-block; padding: 10px 22px; background: #92400e; color: #ffffff; font-size: 13px; font-weight: bold; border-radius: 6px; text-decoration: none; margin: 0 4px 8px;">Programação completa</a>
        <a href="${PROGRAM_URL}" target="_blank" style="display: inline-block; padding: 10px 22px; background: #ffffff; color: #92400e; font-size: 13px; font-weight: bold; border-radius: 6px; text-decoration: none; border: 1px solid #92400e; margin: 0 4px 8px;">Ver programação no Instagram</a>
      </div>

      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 18px 0 0;">
        Mais uma vez, pedimos desculpas pelo equívoco e contamos com sua presença.
      </p>
      <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 8px 0 0;">
        Atenciosamente,<br/><strong>Organização do 1º Seminário LabRD da Baixada Fluminense</strong>
      </p>
    </div>
    <div style="padding: 14px 24px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 10px; color: #94a3b8; margin: 0;">GIRA Forms — Enviado pela organização do evento</p>
    </div>
  </div>
</body></html>`;

    const results: Array<{ email: string; success: boolean; error?: string }> = [];
    let sent = 0, failed = 0;

    const sendOne = async (r: typeof recipients[number]) => {
      const firstName = (r.name || 'Participante').trim().split(/\s+/)[0];
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json',
            'accept': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'GIRA Forms', email: 'diario@giraerp.com.br' },
            to: [{ email: r.email, name: r.name || 'Participante' }],
            bcc: [{ email: 'juanpablorj@gmail.com' }],
            subject: '[ERRATA] Lembrete incorreto — 1º Seminário LabRD da Baixada Fluminense',
            htmlContent: buildHtml(firstName),
          }),
        });
        if (res.ok) {
          sent++;
          const json = await res.json().catch(() => ({}));
          results.push({ email: r.email, success: true });
          if (!test_email) {
            await supabase.from('form_errata_sends').upsert({
              form_id, errata_key: ERRATA_KEY,
              recipient_email: r.email.toLowerCase().trim(),
              resend_id: json?.messageId ?? null,
            }, { onConflict: 'form_id,errata_key,recipient_email' });
          }
        }
        else {
          failed++;
          const txt = await res.text();
          results.push({ email: r.email, success: false, error: txt.slice(0, 200) });
        }
      } catch (err) {
        failed++;
        results.push({ email: r.email, success: false, error: String(err).slice(0, 200) });
      }
    };

    // Brevo permite ~10 req/s no plano free. Mantemos folga.
    const CONCURRENCY = 5;
    const DELAY_MS = 600;
    for (let i = 0; i < recipients.length; i += CONCURRENCY) {
      const batch = recipients.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(sendOne));
      if (i + CONCURRENCY < recipients.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    return new Response(JSON.stringify({ total: recipients.length, sent, failed, results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
