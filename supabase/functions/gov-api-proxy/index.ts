import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GOV_APIS: Record<string, { baseUrl: string; needsAuth?: boolean }> = {
  transferegov_especiais: {
    baseUrl: 'https://api.transferegov.gestao.gov.br/transferenciasespeciais',
  },
  transferegov_fundo: {
    baseUrl: 'https://api.transferegov.gestao.gov.br/fundoafundo',
  },
  cgu: {
    baseUrl: 'https://api.portaldatransparencia.gov.br/api-de-dados',
    needsAuth: true,
  },
  ibge: {
    baseUrl: 'https://servicodados.ibge.gov.br/api/v1/localidades',
  },
  compras: {
    baseUrl: 'https://api.compras.dados.gov.br',
  },
};

if (import.meta.main) {
  Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Auth check
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
        authHeader.replace('Bearer ', '')
      );
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { source, endpoint, params } = await req.json();

      if (!source || !GOV_APIS[source]) {
        return new Response(
          JSON.stringify({ error: 'Fonte inválida', sources: Object.keys(GOV_APIS) }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const api = GOV_APIS[source];
      const path = endpoint ? `/${endpoint.replace(/^\//, '')}` : '';
      const queryString = params
        ? '?' + new URLSearchParams(params).toString()
        : '';

      const url = `${api.baseUrl}${path}${queryString}`;

      const fetchHeaders: Record<string, string> = {
        'Accept': 'application/json',
      };

      // CGU API requires API key
      if (api.needsAuth) {
        const cguKey = Deno.env.get('CGU_API_KEY');
        if (!cguKey) {
          return new Response(
            JSON.stringify({ error: 'Chave da API CGU não configurada' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        fetchHeaders['chave-api-dados'] = cguKey;
      }

      console.log(`[gov-api-proxy] Fetching: ${url}`);

      const response = await fetch(url, { headers: fetchHeaders });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Erro desconhecido');
        console.error(`[gov-api-proxy] Error ${response.status}: ${errorText}`);
        return new Response(
          JSON.stringify({ error: `Erro na API (${response.status})`, details: errorText.substring(0, 500) }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();

      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[gov-api-proxy] Function error:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar requisição' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  });
}
