import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // 1. Database check
  try {
    const dbStart = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.from("profiles").select("user_id").limit(1);
    checks["database"] = {
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    };
  } catch (e: any) {
    checks["database"] = { status: "unhealthy", error: e.message };
  }

  // 2. Auth check
  try {
    const authStart = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    checks["auth"] = {
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - authStart,
      ...(error && { error: error.message }),
    };
  } catch (e: any) {
    checks["auth"] = { status: "unhealthy", error: e.message };
  }

  // 3. Storage check
  try {
    const storageStart = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await supabase.storage.listBuckets();
    checks["storage"] = {
      status: error ? "degraded" : "healthy",
      latency_ms: Date.now() - storageStart,
      ...(error && { error: error.message }),
    };
  } catch (e: any) {
    checks["storage"] = { status: "unhealthy", error: e.message };
  }

  const overallStatus = Object.values(checks).every(c => c.status === "healthy")
    ? "healthy"
    : Object.values(checks).some(c => c.status === "unhealthy")
      ? "unhealthy"
      : "degraded";

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    total_latency_ms: Date.now() - startTime,
    version: "1.0.0",
    checks,
  };

  return new Response(JSON.stringify(response), {
    status: overallStatus === "unhealthy" ? 503 : 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
