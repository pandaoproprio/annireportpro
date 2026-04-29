import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { response_id, admin_name, admin_user_id, action } = body ?? {};

    if (!response_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'response_id é obrigatório.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: response, error: respErr } = await supabase
      .from('form_responses')
      .select('id, respondent_name, checked_in_at')
      .eq('id', response_id)
      .maybeSingle();

    if (respErr || !response) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Inscrição não encontrada.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Revert checkin
    if (action === 'revert') {
      if (!response.checked_in_at) {
        return new Response(
          JSON.stringify({ ok: true, reverted: false, message: 'Esta pessoa ainda não fez check-in.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const { error: revErr } = await supabase
        .from('form_responses')
        .update({ checked_in_at: null, checked_in_by: null })
        .eq('id', response_id);
      if (revErr) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Falha ao reverter check-in.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, reverted: true, respondent_name: response.respondent_name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (response.checked_in_at) {
      return new Response(
        JSON.stringify({
          ok: false,
          alreadyCheckedIn: true,
          checked_in_at: response.checked_in_at,
          respondent_name: response.respondent_name,
          error: 'Esta pessoa já fez check-in.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: updErr } = await supabase
      .from('form_responses')
      .update({
        checked_in_at: new Date().toISOString(),
        checked_in_by: admin_user_id && /^[0-9a-f-]{36}$/i.test(String(admin_user_id)) ? String(admin_user_id) : null,
      })
      .eq('id', response_id);

    if (updErr) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Falha ao registrar check-in.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        respondent_name: response.respondent_name,
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
