import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(JSON.stringify({ error: "slug is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("short_links")
      .select("original_url")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      return new Response("Link não encontrado", { status: 404, headers: corsHeaders });
    }

    // Increment click count (fire and forget)
    supabase.from("short_links").update({ click_count: undefined }).eq("slug", slug)
      .then(() => {});
    // Actually use rpc or raw increment — simpler: just redirect
    await supabase.rpc("increment_short_link_clicks", { _slug: slug }).catch(() => {});

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: data.original_url },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
