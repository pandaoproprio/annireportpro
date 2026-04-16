import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const TABLES_TO_EXPORT = [
  "profiles",
  "activities",
  "activity_narratives",
  "justification_reports",
  "project_risks",
  "audit_logs",
  "form_responses",
  "chat_messages",
  "invoices",
];

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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Record the LGPD request
    await supabaseAdmin.from("lgpd_requests").insert({
      user_id: userId,
      request_type: "export",
      status: "processing",
    });

    // Collect all user data
    const exportData: Record<string, unknown[]> = {};

    for (const table of TABLES_TO_EXPORT) {
      try {
        const { data } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq("user_id", userId)
          .limit(10000);
        if (data && data.length > 0) {
          exportData[table] = data;
        }
      } catch {
        // Table might not have user_id column, skip
      }
    }

    // Also export auth user metadata
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUser?.user) {
      exportData["auth_user"] = [{
        email: authUser.user.email,
        phone: authUser.user.phone,
        created_at: authUser.user.created_at,
        last_sign_in_at: authUser.user.last_sign_in_at,
        user_metadata: authUser.user.user_metadata,
      }];
    }

    // Mark request as completed
    await supabaseAdmin
      .from("lgpd_requests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("request_type", "export")
      .eq("status", "processing");

    // Log the action
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "lgpd_export",
      entity_type: "user_data",
      entity_id: userId,
      entity_name: "Exportação LGPD",
      metadata: { tables_exported: Object.keys(exportData), record_counts: Object.fromEntries(Object.entries(exportData).map(([k, v]) => [k, v.length])) },
    });

    return new Response(JSON.stringify({
      export_date: new Date().toISOString(),
      user_id: userId,
      data: exportData,
      record_counts: Object.fromEntries(Object.entries(exportData).map(([k, v]) => [k, v.length])),
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lgpd-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("LGPD export error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
