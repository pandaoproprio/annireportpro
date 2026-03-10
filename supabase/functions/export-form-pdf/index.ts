import { createClient } from "@supabase/supabase-js";

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

interface Field {
  id: string;
  label: string;
  sort_order: number;
}

interface FormResponse {
  id: string;
  respondent_name: string | null;
  respondent_email: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatAnswer(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

function buildHtml(
  formTitle: string,
  fields: Field[],
  responses: FormResponse[]
): string {
  const now = formatDate(new Date().toISOString());

  const headerCells = [
    "<th>Data</th>",
    "<th>Respondente</th>",
    "<th>E-mail</th>",
    ...fields.map((f) => `<th>${escapeHtml(f.label)}</th>`),
  ].join("");

  const rows = responses
    .map((r) => {
      const cells = [
        `<td>${formatDate(r.submitted_at)}</td>`,
        `<td>${escapeHtml(r.respondent_name || "—")}</td>`,
        `<td>${escapeHtml(r.respondent_email || "—")}</td>`,
        ...fields.map(
          (f) => `<td>${escapeHtml(formatAnswer(r.answers?.[f.id]))}</td>`
        ),
      ];
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("\n");

  // Dynamic font sizing based on column count
  const totalCols = fields.length + 3; // Data, Respondente, E-mail + fields
  const baseFontTh = totalCols > 12 ? 6.5 : totalCols > 8 ? 7.5 : 9;
  const baseFontTd = totalCols > 12 ? 7 : totalCols > 8 ? 8 : 9.5;
  const cellPad = totalCols > 12 ? '3px 4px' : totalCols > 8 ? '4px 5px' : '5px 8px';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #1a1a1a;
    font-size: 9px;
    line-height: 1.3;
    padding: 0;
    width: 100%;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 3px solid #0DA3E7;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .header h1 {
    font-size: 14px;
    font-weight: 700;
    color: #0DA3E7;
    text-transform: uppercase;
    max-width: 75%;
    line-height: 1.2;
  }
  .header .meta {
    text-align: right;
    font-size: 8px;
    color: #666;
    white-space: nowrap;
  }
  .meta span { display: block; }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    word-wrap: break-word;
  }
  th {
    background: #0DA3E7;
    color: #fff;
    font-weight: 600;
    font-size: ${baseFontTh}px;
    text-transform: uppercase;
    padding: ${cellPad};
    text-align: left;
    border: 1px solid #0b8ec9;
    overflow-wrap: break-word;
    word-break: break-word;
    hyphens: auto;
  }
  td {
    padding: ${cellPad};
    border: 1px solid #e0e0e0;
    font-size: ${baseFontTd}px;
    vertical-align: top;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  tr:nth-child(even) { background: #f7fafc; }
  tr:hover { background: #eef6fb; }
  .footer {
    margin-top: 16px;
    text-align: center;
    font-size: 9px;
    color: #999;
  }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(formTitle)}</h1>
    <div class="meta">
      <span><strong>${responses.length}</strong> resposta${responses.length !== 1 ? "s" : ""}</span>
      <span>Exportado em ${now}</span>
    </div>
  </div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Relatório gerado automaticamente pelo GIRA Forms</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { formId } = await req.json();
    if (!formId) {
      return new Response(JSON.stringify({ error: "formId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch form
    const { data: form, error: formErr } = await supabase
      .from("forms")
      .select("id, title")
      .eq("id", formId)
      .single();
    if (formErr || !form) {
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch fields
    const { data: fields } = await supabase
      .from("form_fields")
      .select("id, label, sort_order, type")
      .eq("form_id", formId)
      .order("sort_order", { ascending: true });

    // Filter out non-data fields
    const dataFields = (fields || []).filter(
      (f: any) => f.type !== "section_header" && f.type !== "info_text"
    );

    // Fetch responses
    const { data: responses } = await supabase
      .from("form_responses")
      .select("*")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false });

    const html = buildHtml(form.title, dataFields as Field[], (responses || []) as FormResponse[]);

    const browserlessApiKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (!browserlessApiKey) {
      return new Response(
        JSON.stringify({ error: "BROWSERLESS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const browserlessResponse = await fetch(
      `https://chrome.browserless.io/pdf?token=${browserlessApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          options: {
            landscape: true,
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
          },
        }),
      }
    );

    if (!browserlessResponse.ok) {
      const errText = await browserlessResponse.text();
      console.error("Browserless error:", errText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pdfBuffer = await browserlessResponse.arrayBuffer();

    const safeFilename = encodeURIComponent(`${form.title} - Respostas.pdf`);
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${safeFilename}`,
      },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
