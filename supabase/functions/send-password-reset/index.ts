import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

if (import.meta.main) {
  const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { email, redirectUrl } = await req.json();

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Use the frontend-provided redirect URL so the user lands on the app's reset page
      const finalRedirect = redirectUrl || 'https://annireportpro.lovable.app/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: finalRedirect,
      });

      if (error) {
        console.error('Password reset error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Email de recuperação enviado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Function error:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar requisição' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };

  Deno.serve(handler);
}
