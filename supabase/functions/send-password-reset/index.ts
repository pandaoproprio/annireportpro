import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_REDIRECT_ORIGINS = [
  'https://annireportpro.lovable.app',
  'https://id-preview--a407ccf0-0b77-49f0-a842-b87f8ef15ed4.lovable.app',
];

function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECT_ORIGINS.some(origin => parsed.origin === origin);
  } catch {
    return false;
  }
}

if (import.meta.main) {
  const handler = async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { email, redirectUrl } = await req.json();

      if (!email || typeof email !== 'string' || email.length > 255) {
        return new Response(
          JSON.stringify({ error: 'Email é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Basic email format validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(
          JSON.stringify({ error: 'Formato de email inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate redirect URL against allowlist — reject arbitrary domains
      const defaultRedirect = 'https://annireportpro.lovable.app/reset-password';
      const finalRedirect = (redirectUrl && isAllowedRedirect(redirectUrl))
        ? redirectUrl
        : defaultRedirect;

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      // Rate limiting: max 3 requests per email per 15 minutes
      const { count } = await supabase
        .from('rate_limit_entries')
        .select('*', { count: 'exact', head: true })
        .eq('key', `pwd_reset:${email.toLowerCase()}`)
        .gt('expires_at', new Date().toISOString());

      if ((count ?? 0) >= 3) {
        // Return success anyway to avoid email enumeration
        return new Response(
          JSON.stringify({ success: true, message: 'Email de recuperação enviado' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record rate limit entry
      await supabase.from('rate_limit_entries').insert({
        key: `pwd_reset:${email.toLowerCase()}`,
        count: 1,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: finalRedirect,
      });

      if (error) {
        console.error('Password reset error:', error);
      }

      // Always return success to prevent email enumeration
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
