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
    const { event_id, form_id, lat, lng } = body ?? {};

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return new Response(
        JSON.stringify({ allowed: false, error: 'Coordenadas inválidas.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!event_id && !form_id) {
      return new Response(
        JSON.stringify({ allowed: false, error: 'event_id ou form_id obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let target: { lat: number | null; lng: number | null; radius: number } | null = null;

    if (event_id) {
      const { data } = await supabase
        .from('events')
        .select('geofence_lat, geofence_lng, geofence_radius_meters')
        .eq('id', event_id)
        .maybeSingle();
      if (data) target = { lat: data.geofence_lat, lng: data.geofence_lng, radius: data.geofence_radius_meters ?? 200 };
    } else if (form_id) {
      const { data } = await supabase
        .from('forms')
        .select('geofence_lat, geofence_lng, geofence_radius_meters')
        .eq('id', form_id)
        .maybeSingle();
      if (data) target = { lat: data.geofence_lat, lng: data.geofence_lng, radius: data.geofence_radius_meters ?? 200 };
    }

    if (!target || target.lat == null || target.lng == null) {
      return new Response(
        JSON.stringify({
          allowed: false,
          error: 'Localização do evento não configurada. Solicite ao organizador.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const distance = haversine(Number(target.lat), Number(target.lng), lat, lng);
    const allowed = distance <= target.radius;

    return new Response(
      JSON.stringify({
        allowed,
        distance_meters: distance,
        radius_meters: target.radius,
        message: allowed
          ? `Você está dentro da área (a ${Math.round(distance)} m do ponto central).`
          : `Você está a aproximadamente ${Math.round(distance)} m do local. Aproxime-se até estar dentro de ${target.radius} m para fazer check-in.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ allowed: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
