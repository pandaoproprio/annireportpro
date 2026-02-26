import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(data: any): string {
  const { header, title, object, summary, activities } = data;
  const hasLogos = header?.logoLeft || header?.logoCenter || header?.logoRight;

  const logoHtml = hasLogos
    ? `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a1a1a;padding-bottom:12px;margin-bottom:24px;">
        <div style="flex:1;display:flex;justify-content:flex-start;">${header.logoLeft ? `<img src="${header.logoLeft}" style="height:60px;object-fit:contain;"/>` : ""}</div>
        <div style="flex:1;display:flex;justify-content:center;">${header.logoCenter ? `<img src="${header.logoCenter}" style="height:60px;object-fit:contain;"/>` : ""}</div>
        <div style="flex:1;display:flex;justify-content:flex-end;">${header.logoRight ? `<img src="${header.logoRight}" style="height:60px;object-fit:contain;"/>` : ""}</div>
      </div>`
    : "";

  const titleHtml = title
    ? `<div style="text-align:center;"><h1 style="font-size:24px;font-weight:bold;text-transform:uppercase;margin:0;">${escapeHtml(title)}</h1></div>`
    : "";

  const sectionBlock = (heading: string, content: string) =>
    content
      ? `<div style="break-inside:avoid;margin-top:24px;">
          <h2 style="font-size:16px;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">${heading}</h2>
          <p style="font-size:14px;text-align:justify;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(content)}</p>
        </div>`
      : "";

  const activitiesHtml = (activities || [])
    .map((act: any, i: number) => {
      if (!act.title && !act.description && (!act.media || act.media.length === 0)) return "";
      const mediaHtml =
        act.media && act.media.length > 0
          ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px;">
              ${act.media
                .map((m: any) =>
                  m.type === "image"
                    ? `<img src="${m.url}" style="width:100%;height:160px;object-fit:cover;border-radius:6px;"/>`
                    : `<div style="width:100%;height:160px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#6b7280;">▶ Vídeo</div>`
                )
                .join("")}
            </div>`
          : "";
      const dateStr = act.date ? `<p style="font-size:12px;color:#6b7280;margin:0 0 8px 0;">Data: ${act.date}</p>` : "";
      return `<div style="${i > 0 ? "page-break-before:always;" : ""}break-inside:avoid;">
        ${act.title ? `<h2 style="font-size:16px;font-weight:bold;text-transform:uppercase;margin-bottom:4px;">${escapeHtml(act.title)}</h2>` : ""}
        ${dateStr}
        ${act.description ? `<p style="font-size:14px;text-align:justify;line-height:1.6;margin:0 0 12px 0;white-space:pre-wrap;">${escapeHtml(act.description)}</p>` : ""}
        ${mediaHtml}
      </div>`;
    })
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; color: #000; margin: 0; padding: 0; }
    .page { width: 210mm; min-height: 297mm; padding: 20mm; }
  </style>
</head>
<body>
  <div class="page">
    ${logoHtml}
    ${titleHtml}
    ${sectionBlock("OBJETO", object || "")}
    ${sectionBlock("RESUMO", summary || "")}
    ${activitiesHtml}
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reportData = await req.json();
    const html = buildHtml(reportData);

    const browserlessApiKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (!browserlessApiKey) {
      return new Response(JSON.stringify({ error: "BROWSERLESS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Browserless /pdf endpoint
    const browserlessResponse = await fetch(
      `https://chrome.browserless.io/pdf?token=${browserlessApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          options: {
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
          },
        }),
      }
    );

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      console.error("Browserless error:", errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar PDF via Browserless" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const pdfBuffer = await browserlessResponse.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=relatorio.pdf",
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
