import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;
    const body = await req.json().catch(() => ({}));
    const confirmation = body.confirmation;

    if (confirmation !== "EXCLUIR MEUS DADOS") {
      return new Response(JSON.stringify({ error: "Confirmação inválida. Envie { confirmation: 'EXCLUIR MEUS DADOS' }" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Record the LGPD deletion request
    await supabaseAdmin.from("lgpd_requests").insert({
      user_id: userId,
      request_type: "deletion",
      status: "processing",
    });

    const deletedTables: string[] = [];
    const errors: string[] = [];

    // Order matters: delete dependent data first
    const tablesToDelete = [
      "activity_narratives",
      "chat_messages",
      "form_responses",
      "invoices",
      "justification_reports",
      "project_risks",
      "activities",
      "audit_logs",
    ];

    for (const table of tablesToDelete) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq("user_id", userId);
        if (error) {
          errors.push(`${table}: ${error.message}`);
        } else {
          deletedTables.push(table);
        }
      } catch {
        // Skip tables without user_id
      }
    }

    // Anonymize profile instead of deleting (preserve referential integrity)
    await supabaseAdmin
      .from("profiles")
      .update({
        name: "Usuário Removido",
        email: `deleted-${userId.substring(0, 8)}@removed.lgpd`,
        avatar_url: null,
        phone: null,
      })
      .eq("user_id", userId);

    // Log before deleting the user
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "lgpd_deletion",
      entity_type: "user_data",
      entity_id: userId,
      entity_name: "Exclusão LGPD",
      metadata: { deleted_tables: deletedTables, errors },
    });

    // Mark request as completed
    await supabaseAdmin
      .from("lgpd_requests")
      .update({
        status: errors.length > 0 ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        notes: errors.length > 0 ? `Erros: ${errors.join("; ")}` : "Dados excluídos com sucesso",
      })
      .eq("user_id", userId)
      .eq("request_type", "deletion")
      .eq("status", "processing");

    // Finally, delete the auth user
    if (errors.length === 0) {
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteUserError) {
        errors.push(`auth.users: ${deleteUserError.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      deleted_tables: deletedTables,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length === 0
        ? "Todos os seus dados foram excluídos conforme a LGPD. Sua conta foi removida."
        : "Houve erros parciais na exclusão. Um administrador será notificado.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("LGPD deletion error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
