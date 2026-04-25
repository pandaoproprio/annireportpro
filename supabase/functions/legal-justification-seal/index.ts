import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { justification_id } = await req.json();
    if (!justification_id) throw new Error("justification_id obrigatório");

    const { data: just, error: jErr } = await supabase
      .from("legal_justifications")
      .select("*")
      .eq("id", justification_id)
      .maybeSingle();

    if (jErr || !just) throw new Error("Justificativa não encontrada");
    if (just.is_sealed) throw new Error("Documento já está lacrado");

    // Verificar se todas as assinaturas necessárias foram coletadas
    const { data: sigs } = await supabase
      .from("legal_justification_signatures")
      .select("signed")
      .eq("justification_id", justification_id);

    const total = sigs?.length || 0;
    const signed = sigs?.filter((s: any) => s.signed).length || 0;

    if (total === 0) throw new Error("Adicione ao menos um signatário antes de lacrar");
    if (signed < total) {
      return new Response(JSON.stringify({
        error: `Faltam ${total - signed} assinatura(s) para lacrar o documento`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Calcula hash determinístico do conteúdo + metadados
    const payload = JSON.stringify({
      id: just.id,
      project_id: just.project_id,
      type: just.type,
      title: just.document_title,
      body: just.document_body,
      legal_basis: just.legal_basis,
      context: just.context_snapshot,
      parameters: {
        period: [just.reference_period_start, just.reference_period_end],
        lines: just.involved_budget_lines,
        prev: just.previous_value,
        new: just.new_value,
        reason: just.user_reason,
      },
      signatures: sigs,
      sealed_at: new Date().toISOString(),
    });

    const hash = await sha256(payload);
    const qrCode = hash.substring(0, 16).toUpperCase();

    const { error: uErr } = await supabase
      .from("legal_justifications")
      .update({
        document_hash: hash,
        hash_generated_at: new Date().toISOString(),
        qr_verification_code: qrCode,
        is_sealed: true,
        sealed_at: new Date().toISOString(),
        status: "finalizado",
      })
      .eq("id", justification_id);

    if (uErr) throw uErr;

    // Se vinculado a budget_adjustment, atualiza ra_status
    if (just.budget_adjustment_id) {
      await supabase
        .from("budget_adjustments")
        .update({ ra_status: "justificativa_assinada" })
        .eq("id", just.budget_adjustment_id);
    }

    return new Response(JSON.stringify({
      hash, qr_verification_code: qrCode, sealed: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("seal error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
