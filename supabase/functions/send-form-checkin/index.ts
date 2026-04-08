import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

    const {
      respondent_name,
      respondent_email,
      form_title,
      checkin_code,
      qr_token,
      form_id,
      registration_number,
      event_date,
      event_location,
    } = await req.json();

    if (!respondent_email || !checkin_code || !qr_token) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const APP_URL = 'https://relatorios.giraerp.com.br';
    const checkinUrl = `${APP_URL}/form-checkin/${form_id}?token=${qr_token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}&format=png&margin=8`;

    const formattedDate = event_date
      ? new Date(event_date).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : null;

    const regNumberFormatted = registration_number
      ? `Nº ${String(registration_number).padStart(3, '0')}`
      : null;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f7fa; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0ea5e9; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">GIRA Forms</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #1e293b;">Olá, <strong>${respondent_name || 'Participante'}</strong>!</p>
      <p style="font-size: 14px; color: #475569;">
        Sua inscrição em <strong>${form_title}</strong> foi confirmada.
      </p>
      
      ${regNumberFormatted ? `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
        <p style="font-size: 24px; font-weight: bold; color: #0ea5e9; margin: 0;">${regNumberFormatted}</p>
        <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0;">Número de inscrição</p>
      </div>
      ` : ''}

      ${formattedDate ? `
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; font-size: 13px; color: #334155;">📅 <strong>Data:</strong> ${formattedDate}</p>
        ${event_location ? `<p style="margin: 4px 0; font-size: 13px; color: #334155;">📍 <strong>Local:</strong> ${event_location}</p>` : ''}
      </div>
      ` : ''}

      <div style="text-align: center; margin: 24px 0;">
        <p style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 12px;">
          Seu QR Code de Check-in
        </p>
        <img src="${qrImageUrl}" alt="QR Code" width="200" height="200" style="border-radius: 8px; border: 1px solid #e2e8f0;" />
      </div>

      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
        <p style="font-size: 12px; font-weight: bold; color: #92400e; margin: 0 0 4px;">Código de Check-in</p>
        <p style="font-size: 28px; font-weight: bold; color: #92400e; margin: 0; letter-spacing: 6px; font-family: monospace;">${checkin_code}</p>
        <p style="font-size: 10px; color: #b45309; margin: 4px 0 0;">
          Use este código caso não consiga ler o QR Code
        </p>
      </div>

      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 16px;">
        Apresente o QR Code ou informe o código de 6 dígitos na entrada.
      </p>
    </div>
    <div style="padding: 16px 24px; background: #f8fafc; text-align: center;">
      <p style="font-size: 10px; color: #94a3b8; margin: 0;">
        GIRA Diário de Bordo — Gestão de Projetos Sociais
      </p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GIRA Diário de Bordo <diario@giraerp.com.br>',
        to: [respondent_email],
        cc: ['juanpablorj@gmail.com', 'rapha.araujo.cultura@gmail.com'],
        subject: `✅ Inscrição Confirmada — ${form_title}`,
        html,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify({ success: res.ok, id: data.id }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
