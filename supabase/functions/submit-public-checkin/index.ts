import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { code, token, lat, lng } = body ?? {};

    if (!code && !token) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Código de check-in é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Look up the form_response by checkin_code or qr_token
    let query = supabase.from('form_responses').select('id, form_id, respondent_name, checked_in_at, checkin_code, qr_token').limit(1);
    if (token) {
      query = query.eq('qr_token', token);
    } else {
      query = query.eq('checkin_code', String(code).toUpperCase().trim());
    }
    const { data: response, error: respErr } = await query.maybeSingle();

    if (respErr || !response) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Inscrição não encontrada. Verifique o código.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (response.checked_in_at) {
      return new Response(
        JSON.stringify({
          ok: false,
          alreadyCheckedIn: true,
          checked_in_at: response.checked_in_at,
          respondent_name: response.respondent_name,
          error: 'Você já fez check-in para este evento.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Load form geofence + event window
    const { data: form } = await supabase
      .from('forms')
      .select('id, title, geofence_lat, geofence_lng, geofence_radius_meters, status, event_starts_at, event_ends_at')
      .eq('id', response.form_id)
      .maybeSingle();

    if (!form) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Formulário não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (form.status !== 'ativo') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Este evento não está mais aceitando check-in.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate event time window (if configured)
    if (form.event_starts_at && form.event_ends_at) {
      const now = new Date();
      const starts = new Date(form.event_starts_at);
      const ends = new Date(form.event_ends_at);
      if (now < starts || now > ends) {
        const fmt = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit',
        });
        const startStr = fmt.format(starts);
        const endStr = fmt.format(ends);
        return new Response(
          JSON.stringify({
            ok: false,
            outOfWindow: true,
            error: `O check-in está disponível apenas entre ${startStr} e ${endStr} (horário de Brasília).`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Geofence validation
    let distance: number | null = null;
    if (form.geofence_lat != null && form.geofence_lng != null) {
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return new Response(
          JSON.stringify({
            ok: false,
            needsLocation: true,
            error: 'Localização é obrigatória para confirmar presença neste evento.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      distance = haversine(Number(form.geofence_lat), Number(form.geofence_lng), lat, lng);
      const radius = form.geofence_radius_meters ?? 200;
      if (distance > radius) {
        return new Response(
          JSON.stringify({
            ok: false,
            outOfRange: true,
            distance_meters: distance,
            radius_meters: radius,
            error: `Você está a aproximadamente ${Math.round(distance)} m do local. Aproxime-se até estar dentro de ${radius} m do ponto do evento.`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Confirm checkin (service role bypasses RLS)
    const { error: updErr } = await supabase
      .from('form_responses')
      .update({
        checked_in_at: new Date().toISOString(),
      })
      .eq('id', response.id);

    if (updErr) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Falha ao registrar check-in. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        respondent_name: response.respondent_name,
        form_title: form.title,
        distance_meters: distance,
        checked_in_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
