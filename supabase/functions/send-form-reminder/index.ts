import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const {
      form_id,
      subject,
      heading,
      message_html,
      program_url,
      program_label,
      test_email,
    } = await req.json();

    if (!form_id || !subject || !message_html) {
      return new Response(JSON.stringify({ error: 'form_id, subject e message_html são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Carrega formulário
    const { data: form, error: formErr } = await supabase
      .from('forms')
      .select('id, title, public_slug, event_address, geofence_lat, geofence_lng')
      .eq('id', form_id)
      .maybeSingle();
    if (formErr) throw formErr;
    if (!form) throw new Error('Formulário não encontrado');

    // Carrega inscritos com email
    let recipients: Array<{ name: string | null; email: string; reg: number | null; checkin_code: string | null; qr_token: string | null }> = [];

    if (test_email) {
      recipients = [{ name: 'Teste', email: test_email, reg: 0, checkin_code: null, qr_token: null }];
    } else {
      const { data: rows, error: respErr } = await supabase
        .from('form_responses')
        .select('respondent_name, respondent_email, registration_number, checkin_code, qr_token')
        .eq('form_id', form_id)
        .not('respondent_email', 'is', null);
      if (respErr) throw respErr;
      recipients = (rows || [])
        .filter((r: any) => r.respondent_email && r.respondent_email.trim() !== '')
        .map((r: any) => ({
          name: r.respondent_name,
          email: r.respondent_email,
          reg: r.registration_number,
          checkin_code: r.checkin_code,
          qr_token: r.qr_token,
        }));
    }

    const APP_URL = 'https://relatorios.giraerp.com.br';

    const results: Array<{ email: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;

    for (const r of recipients) {
      const checkinUrl = r.checkin_code && r.qr_token
        ? `${APP_URL}/c/${r.checkin_code}?token=${r.qr_token}`
        : null;
      const qrImageUrl = checkinUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}&format=png&margin=8`
        : null;

      const regNumberFormatted = r.reg ? `Nº ${String(r.reg).padStart(3, '0')}` : null;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f7fa; padding: 20px;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0ea5e9; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">${heading || 'Lembrete do evento'}</h1>
      <p style="color: #e0f2fe; font-size: 13px; margin: 6px 0 0;">${form.title}</p>
    </div>

    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #1e293b; margin: 0 0 12px;">
        Olá, <strong>${r.name || 'Participante'}</strong>!
      </p>

      <div style="font-size: 14px; color: #334155; line-height: 1.6;">
        ${message_html}
      </div>

      ${program_url ? `
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="font-size: 13px; font-weight: bold; color: #92400e; margin: 0 0 10px;">📋 Programação completa do evento</p>
        <a href="${program_url}" target="_blank" style="display: inline-block; padding: 10px 22px; background: #92400e; color: #ffffff; font-size: 13px; font-weight: bold; border-radius: 6px; text-decoration: none;">
          ${program_label || 'Ver programação'}
        </a>
      </div>
      ` : ''}

      ${regNumberFormatted ? `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
        <p style="font-size: 22px; font-weight: bold; color: #0ea5e9; margin: 0;">${regNumberFormatted}</p>
        <p style="font-size: 11px; color: #64748b; margin: 4px 0 0;">Número da sua inscrição</p>
      </div>
      ` : ''}

      ${qrImageUrl ? `
      <div style="text-align: center; margin: 22px 0;">
        <p style="font-size: 13px; font-weight: bold; color: #1e293b; margin: 0 0 10px;">Seu QR Code de Check-in</p>
        <img src="${qrImageUrl}" alt="QR Code" width="180" height="180" style="border-radius: 8px; border: 1px solid #e2e8f0;" />
        ${r.checkin_code ? `<p style="font-size: 11px; color: #64748b; margin: 8px 0 0;">Código: <strong style="font-family: monospace; letter-spacing: 2px;">${r.checkin_code}</strong></p>` : ''}
      </div>
      ` : ''}

      ${form.event_address ? `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 16px 0; text-align: center;">
        <p style="font-size: 13px; font-weight: bold; color: #0c4a6e; margin: 0 0 6px;">📍 Local</p>
        <p style="font-size: 12px; color: #475569; margin: 0 0 10px;">${form.event_address}</p>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.event_address)}" target="_blank" style="display: inline-block; padding: 8px 18px; background: #0ea5e9; color: #ffffff; font-size: 12px; font-weight: bold; border-radius: 6px; text-decoration: none;">
          🗺️ Abrir no Google Maps
        </a>
      </div>
      ` : ''}

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 20px 0 0;">
        Apresente o QR Code ou o código de 6 dígitos na entrada.
      </p>
    </div>

    <div style="padding: 16px 24px; background: #f8fafc; text-align: center;">
      <p style="font-size: 10px; color: #94a3b8; margin: 0;">
        GIRA Forms — Lembrete enviado pela organização do evento
      </p>
    </div>
  </div>
</body>
</html>`;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'GIRA Diário de Bordo <diario@giraerp.com.br>',
            to: [r.email],
            cc: ['juanpablorj@gmail.com', 'rapha.araujo.cultura@gmail.com'],
            subject,
            html,
          }),
        });
        if (res.ok) {
          sent++;
          results.push({ email: r.email, success: true });
        } else {
          failed++;
          const txt = await res.text();
          results.push({ email: r.email, success: false, error: txt.slice(0, 200) });
        }
      } catch (err) {
        failed++;
        results.push({ email: r.email, success: false, error: String(err).slice(0, 200) });
      }

      // pequena pausa para evitar rate limit (Resend ~10/s)
      await new Promise((r) => setTimeout(r, 120));
    }

    return new Response(JSON.stringify({ total: recipients.length, sent, failed, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
