import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

interface RateLimitOptions {
  key: string;
  maxRequests?: number;
  windowSeconds?: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, maxRequests = 60, windowSeconds = 60 } = options;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  // Clean expired entries occasionally (1% chance per request)
  if (Math.random() < 0.01) {
    await supabaseAdmin.rpc("cleanup_expired_rate_limits");
  }

  // Count requests in current window
  const { count } = await supabaseAdmin
    .from("rate_limit_entries")
    .select("*", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", windowStart.toISOString());

  const currentCount = count || 0;

  if (currentCount >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: windowSeconds,
    };
  }

  // Record this request
  await supabaseAdmin.from("rate_limit_entries").insert({
    key,
    expires_at: new Date(now.getTime() + windowSeconds * 1000).toISOString(),
  });

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
  };
}

export function rateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>) {
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(result.retryAfter || 60),
        },
      },
    );
  }
  return null;
}
