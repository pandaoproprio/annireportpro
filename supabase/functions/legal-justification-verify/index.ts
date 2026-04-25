import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TYPE_LABEL: Record<string, string> = {
  ajuste_pt: "Ajuste de Plano de Trabalho",
  prorrogacao_vigencia: "Prorrogação de Vigência",
  execucao_financeira: "Execução Financeira",
  despesa_nao_prevista: "Despesa Não Prevista",
  atraso_execucao: "Atraso de Execução",
  substituicao_fornecedor: "Substituição de Fornecedor",
  cancelamento_meta: "Cancelamento de Meta",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code") || url.searchParams.get("hash");
    if (!code) throw new Error("Código de verificação ausente");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Busca por hash completo OU por qr_verification_code (16 chars)
    const { data, error } = await supabase
      .from("legal_justifications")
      .select(`
        id, type, status, document_title, document_hash, qr_verification_code,
        sealed_at, hash_generated_at, is_sealed,
        project:projects(name, fomento_number, organization_name, funder),
        signatures:legal_justification_signatures(signer_name, signer_role, signer_cpf_cnpj, signed, signed_at, signature_method)
      `)
      .or(`document_hash.eq.${code},qr_verification_code.eq.${code.toUpperCase()}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ valid: false, message: "Documento não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      sealed: data.is_sealed,
      title: data.document_title,
      type_label: TYPE_LABEL[data.type] || data.type,
      hash: data.document_hash,
      qr_code: data.qr_verification_code,
      sealed_at: data.sealed_at,
      project: data.project,
      signatures: data.signatures,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ valid: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
