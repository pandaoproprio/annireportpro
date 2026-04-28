// Notifica administradores quando um usuário troca a senha ou faz login após troca.
// Destinatários fixos (memória institucional): juanpablorj@gmail.com, rapha.araujo.cultura@gmail.com

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_RECIPIENTS = ['juanpablorj@gmail.com', 'rapha.araujo.cultura@gmail.com'];
const FROM_EMAIL = 'GIRA Relatórios <onboarding@resend.dev>';

type EventType = 'password_changed' | 'login_after_reset';

interface Payload {
  event: EventType;
  userEmail: string;
  userName?: string;
  timestamp?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { event, userEmail, userName, timestamp } = (await req.json()) as Payload;
    if (!event || !userEmail) {
      return new Response(JSON.stringify({ error: 'event e userEmail são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const when = timestamp ? new Date(timestamp) : new Date();
    const whenBR = when.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const subject =
      event === 'password_changed'
        ? `[GIRA] Senha alterada — ${userEmail}`
        : `[GIRA] Login após redefinição — ${userEmail}`;

    const titulo =
      event === 'password_changed'
        ? 'Usuário alterou a senha'
        : 'Usuário logou após redefinir a senha';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e2a3a">
        <h2 style="margin:0 0 12px;color:#0DA3E7">${titulo}</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#4b5563">
          Evento de segurança registrado no GIRA Relatórios.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280">Usuário</td><td style="padding:6px 0"><strong>${userName || '—'}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">E-mail</td><td style="padding:6px 0">${userEmail}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Data/Hora</td><td style="padding:6px 0">${whenBR}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Evento</td><td style="padding:6px 0">${event}</td></tr>
        </table>
        <p style="margin:24px 0 0;font-size:12px;color:#999">Notificação automática — GIRA Relatórios</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_RECIPIENTS,
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Resend error', data);
      return new Response(JSON.stringify({ error: 'Falha ao enviar', details: data }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-admin-password-event error', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
