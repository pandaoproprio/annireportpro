// Upload de um documento assinado para um projeto
// - Calcula SHA-256
// - Verifica duplicidade (mesmo hash já anexado ao mesmo projeto)
// - Salva no bucket privado project-signed-docs
// - Cria registro em project_signed_documents
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_CATEGORIES = new Set([
  "termo_fomento",
  "plano_trabalho",
  "contrato_rh",
  "contrato_servico",
  "contrato_fornecedor",
  "declaracao_justificativa",
  "aditivo",
  "outro",
]);

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function inferCategory(filename: string): string {
  const f = filename.toLowerCase();
  if (f.includes("termo_ceap") || f.includes("termo de fomento") || f.includes("termo_de_fomento")) return "termo_fomento";
  if (f.includes("proposta") || f.includes("plano_trabalho") || f.includes("plano de trabalho")) return "plano_trabalho";
  if (f.includes("declaracao_de_justificativa") || f.includes("declaracao_justificativa") || f.includes("justificativa")) return "declaracao_justificativa";
  if (f.includes("aditivo")) return "aditivo";
  if (f.includes("locacao") || f.includes("transporte") || f.includes("alimentacao") || f.includes("ecobag") || f.includes("camisa")) return "contrato_fornecedor";
  if (f.match(/^\d+\.\d+/) || f.includes("contrato")) return "contrato_rh";
  return "outro";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userResp, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userResp?.user) {
      return new Response(JSON.stringify({ error: "invalid_user" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userResp.user.id;

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const projectId = (form.get("project_id") as string) ?? "";
    let category = (form.get("category") as string) ?? "";
    const displayName = (form.get("display_name") as string) ?? (file?.name ?? "documento.pdf");
    const signatureProvider = (form.get("signature_provider") as string) ?? "gov.br";
    const notes = (form.get("notes") as string) ?? null;

    if (!file || !projectId) {
      return new Response(JSON.stringify({ error: "missing_file_or_project" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!category || !VALID_CATEGORIES.has(category)) {
      category = inferCategory(file.name);
    }

    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const sha256 = hex(hashBuf);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Duplicidade
    const { data: existing } = await admin
      .from("project_signed_documents")
      .select("id, display_name")
      .eq("project_id", projectId)
      .eq("sha256_hash", sha256)
      .maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ status: "duplicate", id: existing.id, display_name: existing.display_name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Caminho no bucket: <project_id>/<sha256-curto>__<safe_name>
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
    const storagePath = `${projectId}/${sha256.slice(0, 12)}__${safeName}`;

    const { error: upErr } = await admin.storage
      .from("project-signed-docs")
      .upload(storagePath, buf, { contentType: file.type || "application/pdf", upsert: false });
    if (upErr && !`${upErr.message}`.toLowerCase().includes("already exists")) {
      return new Response(JSON.stringify({ error: "storage_upload_failed", details: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await admin
      .from("project_signed_documents")
      .insert({
        project_id: projectId,
        uploaded_by: userId,
        category,
        display_name: displayName,
        original_filename: file.name,
        storage_path: storagePath,
        file_size_bytes: buf.byteLength,
        sha256_hash: sha256,
        signature_provider: signatureProvider,
        notes,
      })
      .select("id, category, display_name, sha256_hash, storage_path, file_size_bytes, created_at")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: "db_insert_failed", details: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "ok", document: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "unexpected", details: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
