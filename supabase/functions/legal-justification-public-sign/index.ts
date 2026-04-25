// Public endpoint for external supplier signature via token (no auth)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || '';
    if (!token || token.length < 16) {
      return json({ error: 'Token inválido' }, 400);
    }

    // Fetch the signature record by token
    const { data: sig, error: sigErr } = await supabase
      .from('legal_justification_signatures')
      .select('*')
      .eq('signature_token', token)
      .maybeSingle();

    if (sigErr || !sig) return json({ error: 'Convite de assinatura não encontrado' }, 404);

    // Fetch justification + project context
    const { data: just, error: jErr } = await supabase
      .from('legal_justifications')
      .select('id, project_id, type, status, document_title, document_body, legal_basis, document_hash, qr_verification_code, is_sealed, reference_period_start, reference_period_end')
      .eq('id', sig.justification_id)
      .maybeSingle();

    if (jErr || !just) return json({ error: 'Documento não encontrado' }, 404);

    const { data: project } = await supabase
      .from('projects')
      .select('name, fomento_number, funder, organization_name')
      .eq('id', just.project_id)
      .maybeSingle();

    if (req.method === 'GET') {
      return json({
        signature: {
          id: sig.id,
          signer_name: sig.signer_name,
          signer_role: sig.signer_role,
          signer_cpf_cnpj: sig.signer_cpf_cnpj,
          signer_email: sig.signer_email,
          signer_type: sig.signer_type,
          signed: sig.signed,
          signed_at: sig.signed_at,
        },
        justification: just,
        project,
      });
    }

    if (req.method === 'POST') {
      if (sig.signed) return json({ error: 'Documento já foi assinado por este signatário' }, 400);
      if (just.is_sealed) return json({ error: 'Documento já lacrado — assinatura encerrada' }, 400);

      const body = await req.json().catch(() => ({}));
      const accept = body?.accept === true;
      const declared_name = String(body?.declared_name || '').trim();

      if (!accept) return json({ error: 'Aceite obrigatório' }, 400);
      if (!declared_name || declared_name.length < 3) {
        return json({ error: 'Confirme seu nome completo' }, 400);
      }
      // Light name match — must contain at least 1 word from registered name
      const regWords = sig.signer_name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const declWords = declared_name.toLowerCase().split(/\s+/);
      const matches = regWords.filter(w => declWords.includes(w)).length;
      if (matches < 1) {
        return json({ error: 'Nome digitado não confere com o cadastrado' }, 400);
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || 'unknown';

      const { error: upErr } = await supabase
        .from('legal_justification_signatures')
        .update({
          signed: true,
          signed_at: new Date().toISOString(),
          signed_ip: ip,
          signature_method: 'public_token_link',
        })
        .eq('id', sig.id);

      if (upErr) throw upErr;

      // Recalc justification status
      const { data: allSigs } = await supabase
        .from('legal_justification_signatures')
        .select('signed')
        .eq('justification_id', just.id);

      const total = allSigs?.length || 0;
      const signedCount = allSigs?.filter((s: any) => s.signed).length || 0;
      let newStatus = just.status;
      if (signedCount === total && total > 0) newStatus = 'finalizado';
      else if (signedCount > 0) newStatus = 'parcialmente_assinado';

      await supabase.from('legal_justifications').update({ status: newStatus }).eq('id', just.id);

      return json({ success: true, status: newStatus });
    }

    return json({ error: 'Método não suportado' }, 405);
  } catch (e) {
    console.error('public-sign error', e);
    return json({ error: (e as Error).message || 'Erro interno' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
