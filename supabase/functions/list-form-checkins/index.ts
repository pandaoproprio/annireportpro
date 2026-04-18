import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { form_id } = body ?? {};

    if (!form_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'form_id é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: form, error: formErr } = await supabase
      .from('forms')
      .select('id, title, geofence_lat, geofence_lng, geofence_radius_meters, status')
      .eq('id', form_id)
      .maybeSingle();

    if (formErr || !form) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Formulário não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: responses, error: respErr } = await supabase
      .from('form_responses')
      .select('id, form_id, respondent_name, respondent_email, answers, submitted_at, checkin_code, qr_token, checked_in_at, checked_in_by')
      .eq('form_id', form_id)
      .order('submitted_at', { ascending: false });

    if (respErr) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Falha ao listar inscrições.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, form, responses: responses ?? [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
