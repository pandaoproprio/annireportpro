import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { event, payload, project_id } = await req.json();

    if (!event || !project_id) {
      return new Response(JSON.stringify({ error: "Missing event or project_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active webhooks for this project and event
    const { data: webhooks, error: whError } = await supabase
      .from("webhook_config")
      .select("*")
      .eq("is_active", true)
      .or(`project_id.eq.${project_id},project_id.is.null`)
      .contains("events", [event]);

    if (whError) throw whError;

    const results = [];

    for (const wh of webhooks || []) {
      const body = JSON.stringify({
        event,
        project_id,
        payload,
        timestamp: new Date().toISOString(),
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add HMAC signature if secret is set
      if (wh.secret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(wh.secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
        const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
        headers["X-Webhook-Signature"] = `sha256=${hex}`;
      }

      try {
        const res = await fetch(wh.url, { method: "POST", headers, body });
        const responseBody = await res.text();

        // Log the webhook delivery
        await supabase.from("webhook_logs").insert({
          webhook_id: wh.id,
          event,
          payload,
          response_status: res.status,
          response_body: responseBody.substring(0, 1000),
        });

        results.push({ webhook_id: wh.id, status: res.status, ok: res.ok });
      } catch (err) {
        await supabase.from("webhook_logs").insert({
          webhook_id: wh.id,
          event,
          payload,
          response_status: 0,
          response_body: err instanceof Error ? err.message : "Unknown error",
        });
        results.push({ webhook_id: wh.id, status: 0, ok: false, error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    return new Response(JSON.stringify({ success: true, delivered: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[webhook-dispatch] Error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
