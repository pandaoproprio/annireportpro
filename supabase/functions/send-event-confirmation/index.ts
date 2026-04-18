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
      event_id,
      event_title,
      event_date,
      event_location,
      registrations,
      geofence_lat,
      geofence_lng,
    } = await req.json();

    if (!event_id || !registrations?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formattedDate = new Date(event_date).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    // Build "Como chegar" block
    const hasCoords = typeof geofence_lat === 'number' && typeof geofence_lng === 'number';
    const mapsQuery = hasCoords
      ? `${geofence_lat},${geofence_lng}`
      : (event_location ? encodeURIComponent(event_location) : null);
    const googleMapsUrl = mapsQuery ? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}` : null;
    const wazeUrl = hasCoords
      ? `https://waze.com/ul?ll=${geofence_lat},${geofence_lng}&navigate=yes`
      : (event_location ? `https://waze.com/ul?q=${encodeURIComponent(event_location)}` : null);
    const staticMapUrl = hasCoords
      ? `https://staticmap.openstreetmap.de/staticmap.php?center=${geofence_lat},${geofence_lng}&zoom=16&size=500x250&maptype=mapnik&markers=${geofence_lat},${geofence_lng},red-pushpin`
      : null;

    const locationBlock = (googleMapsUrl || staticMapUrl) ? `
      <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="padding: 10px 14px; background: #f8fafc; font-size: 12px; font-weight: bold; color: #334155;">
          📍 Como chegar
        </div>
        ${staticMapUrl ? `<img src="${staticMapUrl}" alt="Mapa do local do evento" width="500" style="display: block; width: 100%; max-width: 500px; height: auto;" />` : ''}
        <div style="padding: 12px 14px; text-align: center; background: #ffffff;">
          ${googleMapsUrl ? `<a href="${googleMapsUrl}" style="display: inline-block; margin: 4px; padding: 8px 14px; background: #1a73e8; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: bold;">Abrir no Google Maps</a>` : ''}
          ${wazeUrl ? `<a href="${wazeUrl}" style="display: inline-block; margin: 4px; padding: 8px 14px; background: #33ccff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: bold;">Abrir no Waze</a>` : ''}
        </div>
      </div>
    ` : '';

    const results = [];

    for (const reg of registrations) {
      if (!reg.email) continue;

      const checkinUrl = `https://annireportpro.lovable.app/checkin/${event_id}?token=${reg.qr_token}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}&format=png&margin=8`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f4f7fa; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0ea5e9; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">Confirmação de Inscrição</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #1e293b;">Olá, <strong>${reg.name}</strong>!</p>
      <p style="font-size: 14px; color: #475569;">
        Sua inscrição no evento <strong>${event_title}</strong> foi confirmada.
      </p>
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0; font-size: 13px; color: #334155;">📅 <strong>Data:</strong> ${formattedDate}</p>
        ${event_location ? `<p style="margin: 4px 0; font-size: 13px; color: #334155;">📍 <strong>Local:</strong> ${event_location}</p>` : ''}
      </div>
      ${locationBlock}
      <div style="text-align: center; margin: 24px 0;">
        <p style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 12px;">
          Seu QR Code de Check-in
        </p>
        <img src="${qrImageUrl}" alt="QR Code" width="200" height="200" style="border-radius: 8px; border: 1px solid #e2e8f0;" />
        <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
          Apresente este QR Code na entrada do evento.
        </p>
      </div>
      <div style="text-align: center; margin: 16px 0;">
        <a href="${checkinUrl}" style="display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold;">
          Fazer Check-in Online
        </a>
      </div>
    </div>
    <div style="padding: 16px 24px; background: #f8fafc; text-align: center;">
      <p style="font-size: 11px; color: #64748b; margin: 0;">
        Este e-mail confirma sua inscrição no evento. Em caso de dúvida, responda a esta mensagem.
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
            from: 'Confirmação de Inscrição <diario@giraerp.com.br>',
            to: [reg.email],
            cc: ['juanpablorj@gmail.com', 'rapha.araujo.cultura@gmail.com'],
            subject: `✅ Inscrição Confirmada — ${event_title}`,
            html,
          }),
        });

        const data = await res.json();
        results.push({ email: reg.email, success: res.ok, id: data.id });
      } catch (err) {
        results.push({ email: reg.email, success: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ sent: results.filter(r => r.success).length, results }), {
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
