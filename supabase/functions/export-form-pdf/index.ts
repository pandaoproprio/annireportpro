import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface Field { id: string; label: string; sort_order: number; type: string; options?: unknown[]; }
interface FormResponse { id: string; respondent_name: string | null; respondent_email: string | null; answers: Record<string, unknown>; submitted_at: string; }

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

function formatAnswer(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.join(", ");
  return String(val);
}

// ═══════════════════════════════════════════════════════════
// TABLE MODE — existing tabular PDF
// ═══════════════════════════════════════════════════════════
function buildTableHtml(formTitle: string, fields: Field[], responses: FormResponse[]): string {
  const now = formatDate(new Date().toISOString());
  const totalCols = fields.length + 3;
  const baseFontTh = totalCols > 12 ? 6.5 : totalCols > 8 ? 7.5 : 9;
  const baseFontTd = totalCols > 12 ? 7 : totalCols > 8 ? 8 : 9.5;
  const cellPad = totalCols > 12 ? '3px 4px' : totalCols > 8 ? '4px 5px' : '5px 8px';

  const headerCells = ["<th>Data</th>","<th>Respondente</th>","<th>E-mail</th>",...fields.map(f=>`<th>${escapeHtml(f.label)}</th>`)].join("");
  const rows = responses.map(r => {
    const cells = [`<td>${formatDate(r.submitted_at)}</td>`,`<td>${escapeHtml(r.respondent_name||"—")}</td>`,`<td>${escapeHtml(r.respondent_email||"—")}</td>`,...fields.map(f=>`<td>${escapeHtml(formatAnswer(r.answers?.[f.id]))}</td>`)];
    return `<tr>${cells.join("")}</tr>`;
  }).join("\n");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><style>
@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:9px;line-height:1.3;width:100%}
.header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #0DA3E7;padding-bottom:8px;margin-bottom:10px}
.header h1{font-size:14px;font-weight:700;color:#0DA3E7;text-transform:uppercase;max-width:75%;line-height:1.2}
.header .meta{text-align:right;font-size:8px;color:#666;white-space:nowrap}.meta span{display:block}
table{width:100%;border-collapse:collapse;table-layout:fixed;word-wrap:break-word}
th{background:#0DA3E7;color:#fff;font-weight:600;font-size:${baseFontTh}px;text-transform:uppercase;padding:${cellPad};text-align:left;border:1px solid #0b8ec9;overflow-wrap:break-word;word-break:break-word;hyphens:auto}
td{padding:${cellPad};border:1px solid #e0e0e0;font-size:${baseFontTd}px;vertical-align:top;overflow-wrap:break-word;word-break:break-word}
tr:nth-child(even){background:#f7fafc}tr:hover{background:#eef6fb}
.footer{margin-top:16px;text-align:center;font-size:9px;color:#999}
</style></head><body>
<div class="header"><h1>${escapeHtml(formTitle)}</h1><div class="meta"><span><strong>${responses.length}</strong> resposta${responses.length!==1?"s":""}</span><span>Exportado em ${now}</span></div></div>
<table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Relatório gerado automaticamente pelo GIRA Forms</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════
// INDIVIDUAL MODE — one "ficha" per response
// ═══════════════════════════════════════════════════════════
function buildIndividualHtml(formTitle: string, fields: Field[], responses: FormResponse[]): string {
  const now = formatDate(new Date().toISOString());

  const pages = responses.map((r, idx) => {
    const rows = fields.map(f => `
      <tr>
        <td class="label">${escapeHtml(f.label)}</td>
        <td class="value">${escapeHtml(formatAnswer(r.answers?.[f.id]))}</td>
      </tr>
    `).join("");

    return `
    <div class="ficha${idx > 0 ? ' page-break' : ''}">
      <div class="ficha-header">
        <h2>${escapeHtml(formTitle)}</h2>
        <div class="ficha-meta">
          <span><strong>Respondente:</strong> ${escapeHtml(r.respondent_name || r.respondent_email || 'Anônimo')}</span>
          <span><strong>Data:</strong> ${formatDate(r.submitted_at)}</span>
          ${r.respondent_email ? `<span><strong>E-mail:</strong> ${escapeHtml(r.respondent_email)}</span>` : ''}
        </div>
      </div>
      <table><tbody>${rows}</tbody></table>
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><style>
@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:10px;line-height:1.4}
.page-break{page-break-before:always}
.ficha{padding:4px 0}
.ficha-header{border-bottom:3px solid #0DA3E7;padding-bottom:10px;margin-bottom:12px}
.ficha-header h2{font-size:16px;font-weight:700;color:#0DA3E7;text-transform:uppercase;margin-bottom:8px}
.ficha-meta{display:flex;flex-wrap:wrap;gap:16px;font-size:10px;color:#444}
.ficha-meta span{white-space:nowrap}
table{width:100%;border-collapse:collapse}
td{padding:8px 10px;border:1px solid #e0e0e0;font-size:10px;vertical-align:top}
td.label{background:#f1f5f9;font-weight:600;width:35%;color:#334155}
td.value{width:65%}
tr:hover{background:#f8fafc}
.footer{margin-top:20px;text-align:center;font-size:8px;color:#999}
</style></head><body>
${pages}
<div class="footer">Fichas geradas automaticamente pelo GIRA Forms — ${now}</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════
// AI REPORT MODE — charts + AI narrative
// ═══════════════════════════════════════════════════════════
function buildChartData(fields: Field[], responses: FormResponse[]) {
  const charts: { label: string; type: string; data: Record<string, number> }[] = [];
  const chartableTypes = ['single_select', 'multi_select', 'checkbox', 'scale'];

  for (const f of fields) {
    if (!chartableTypes.includes(f.type)) continue;
    const counts: Record<string, number> = {};
    for (const r of responses) {
      const val = r.answers?.[f.id];
      if (val === null || val === undefined) continue;
      const items = Array.isArray(val) ? val : [val];
      for (const item of items) {
        const key = String(item);
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    if (Object.keys(counts).length > 0) {
      charts.push({ label: f.label, type: f.type, data: counts });
    }
  }
  return charts;
}

function buildSvgBarChart(label: string, data: Record<string, number>): string {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxVal = Math.max(...entries.map(e => e[1]), 1);
  const barH = 22;
  const gap = 4;
  const labelW = 140;
  const chartW = 400;
  const svgH = entries.length * (barH + gap) + 40;
  const colors = ['#0DA3E7', '#0b8ec9', '#38bdf8', '#7dd3fc', '#0284c7', '#0369a1', '#06b6d4', '#14b8a6', '#10b981', '#059669'];

  let bars = '';
  entries.forEach(([key, count], i) => {
    const y = i * (barH + gap) + 30;
    const w = (count / maxVal) * (chartW - labelW - 50);
    const truncLabel = key.length > 22 ? key.slice(0, 20) + '…' : key;
    bars += `<text x="${labelW - 4}" y="${y + barH/2 + 4}" text-anchor="end" font-size="9" fill="#334155">${escapeHtml(truncLabel)}</text>`;
    bars += `<rect x="${labelW}" y="${y}" width="${Math.max(w, 2)}" height="${barH}" rx="3" fill="${colors[i % colors.length]}"/>`;
    bars += `<text x="${labelW + w + 6}" y="${y + barH/2 + 4}" font-size="9" fill="#64748b">${count}</text>`;
  });

  return `<div class="chart-block">
    <h3>${escapeHtml(label)}</h3>
    <svg width="${chartW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">
      <style>text{font-family:'Segoe UI',Arial,sans-serif}</style>
      ${bars}
    </svg>
  </div>`;
}

function buildAiReportHtml(formTitle: string, fields: Field[], responses: FormResponse[], aiNarrative: string): string {
  const now = formatDate(new Date().toISOString());
  const charts = buildChartData(fields, responses);
  const chartsHtml = charts.map(c => buildSvgBarChart(c.label, c.data)).join('\n');

  // Summary stats
  const totalResps = responses.length;
  const withName = responses.filter(r => r.respondent_name).length;
  const dateRange = responses.length > 0
    ? `${formatDate(responses[responses.length-1].submitted_at)} — ${formatDate(responses[0].submitted_at)}`
    : '—';

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><style>
@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;line-height:1.5}
.cover{text-align:center;padding:60px 20px;page-break-after:always}
.cover h1{font-size:24px;font-weight:700;color:#0DA3E7;text-transform:uppercase;margin-bottom:12px}
.cover .subtitle{font-size:14px;color:#64748b;margin-bottom:40px}
.cover .stats{display:flex;justify-content:center;gap:32px;margin-top:24px}
.stat-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px 24px;text-align:center}
.stat-box .num{font-size:28px;font-weight:700;color:#0DA3E7;display:block}
.stat-box .lbl{font-size:10px;color:#64748b;text-transform:uppercase}
h2{font-size:16px;font-weight:700;color:#0DA3E7;border-bottom:2px solid #0DA3E7;padding-bottom:6px;margin:24px 0 12px}
.chart-block{margin-bottom:20px;break-inside:avoid}
.chart-block h3{font-size:12px;font-weight:600;color:#334155;margin-bottom:6px}
.narrative{background:#f8fafc;border-left:4px solid #0DA3E7;padding:16px 20px;border-radius:0 8px 8px 0;font-size:11px;line-height:1.6;white-space:pre-wrap}
.footer{margin-top:30px;text-align:center;font-size:8px;color:#999;border-top:1px solid #e2e8f0;padding-top:8px}
</style></head><body>

<div class="cover">
  <h1>Relatório de Análise</h1>
  <div class="subtitle">${escapeHtml(formTitle)}</div>
  <div class="stats">
    <div class="stat-box"><span class="num">${totalResps}</span><span class="lbl">Respostas</span></div>
    <div class="stat-box"><span class="num">${withName}</span><span class="lbl">Identificados</span></div>
    <div class="stat-box"><span class="num">${responses.length > 0 ? Math.round((withName/totalResps)*100) : 0}%</span><span class="lbl">Taxa Identificação</span></div>
  </div>
  <div style="margin-top:20px;font-size:10px;color:#94a3b8">Período: ${dateRange}</div>
</div>

${charts.length > 0 ? `<h2>📊 Distribuição das Respostas</h2>${chartsHtml}` : ''}

<h2>🤖 Análise Inteligente</h2>
<div class="narrative">${escapeHtml(aiNarrative)}</div>

<div class="footer">Relatório gerado com inteligência artificial pelo GIRA Forms — ${now}</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { formId, mode = 'table', responseIds } = await req.json();
    if (!formId) {
      return new Response(JSON.stringify({ error: "formId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch form
    const { data: form, error: formErr } = await supabaseClient
      .from("forms").select("id, title").eq("id", formId).single();
    if (formErr || !form) {
      return new Response(JSON.stringify({ error: "Form not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch fields
    const { data: fields } = await supabaseClient
      .from("form_fields").select("id, label, sort_order, type, options")
      .eq("form_id", formId).order("sort_order", { ascending: true });

    const dataFields = (fields || []).filter(
      (f: any) => f.type !== "section_header" && f.type !== "info_text"
    ) as Field[];

    // Fetch responses
    let query = supabaseClient.from("form_responses").select("*").eq("form_id", formId);
    if (responseIds && Array.isArray(responseIds) && responseIds.length > 0) {
      query = query.in("id", responseIds);
    }
    const { data: responses } = await query.order("submitted_at", { ascending: false });
    const resps = (responses || []) as FormResponse[];

    // Build HTML based on mode
    let html: string;
    let landscape = true;
    let filename = `${form.title} - Respostas.pdf`;

    if (mode === 'individual') {
      html = buildIndividualHtml(form.title, dataFields, resps);
      landscape = false;
      filename = `${form.title} - Fichas Individuais.pdf`;
    } else if (mode === 'ai-report') {
      // Call Lovable AI for narrative
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "AI não configurada" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prepare data summary for AI
      const chartData = buildChartData(dataFields, resps);
      const dataSummary = {
        formTitle: form.title,
        totalResponses: resps.length,
        fields: dataFields.map(f => f.label),
        distributions: chartData.map(c => ({ field: c.label, counts: c.data })),
        sampleResponses: resps.slice(0, 5).map(r => ({
          name: r.respondent_name || 'Anônimo',
          date: formatDate(r.submitted_at),
          answers: Object.fromEntries(
            dataFields.map(f => [f.label, formatAnswer(r.answers?.[f.id])])
          ),
        })),
      };

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Você é um analista de dados especializado em pesquisas e formulários. 
Gere um relatório executivo em português brasileiro analisando as respostas do formulário.

Estruture assim:
1. VISÃO GERAL — resumo quantitativo (total de respostas, período, taxa de participação)
2. PADRÕES IDENTIFICADOS — principais tendências e concentrações nas respostas
3. DESTAQUES — pontos que merecem atenção especial
4. RECOMENDAÇÕES — sugestões baseadas nos dados

Seja objetivo, use dados numéricos e porcentagens. Máximo 400 palavras.`,
            },
            {
              role: "user",
              content: `Analise os dados do formulário "${form.title}":\n\n${JSON.stringify(dataSummary, null, 2)}`,
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        if (status === 429 || status === 402) {
          return new Response(JSON.stringify({ error: status === 429 ? "Rate limit excedido" : "Créditos insuficientes" }), {
            status, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI error:", await aiResponse.text());
        return new Response(JSON.stringify({ error: "Erro na análise IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await aiResponse.json();
      const narrative = aiResult.choices?.[0]?.message?.content || "Não foi possível gerar a análise.";

      html = buildAiReportHtml(form.title, dataFields, resps, narrative);
      landscape = false;
      filename = `${form.title} - Relatório IA.pdf`;
    } else {
      html = buildTableHtml(form.title, dataFields, resps);
    }

    // Generate PDF via Browserless
    const browserlessApiKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (!browserlessApiKey) {
      return new Response(JSON.stringify({ error: "BROWSERLESS_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const browserlessResponse = await fetch(
      `https://chrome.browserless.io/pdf?token=${browserlessApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          options: {
            landscape,
            format: "A4",
            printBackground: true,
            margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
          },
        }),
      }
    );

    if (!browserlessResponse.ok) {
      console.error("Browserless error:", await browserlessResponse.text());
      return new Response(JSON.stringify({ error: "Erro ao gerar PDF" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBuffer = await browserlessResponse.arrayBuffer();
    const safeFilename = encodeURIComponent(filename);

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
