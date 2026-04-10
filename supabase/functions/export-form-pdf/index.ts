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

  // For forms with many fields (>10 data columns), use a card/ficha layout instead of a wide table
  if (totalCols > 13) {
    return buildCardTableHtml(formTitle, fields, responses, now);
  }

  const baseFontTh = totalCols > 8 ? 7 : 9;
  const baseFontTd = totalCols > 8 ? 7.5 : 9.5;
  const cellPad = totalCols > 8 ? '4px 5px' : '5px 8px';

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
table{width:100%;border-collapse:collapse;table-layout:auto}
th{background:#0DA3E7;color:#fff;font-weight:600;font-size:${baseFontTh}px;text-transform:uppercase;padding:${cellPad};text-align:left;border:1px solid #0b8ec9;white-space:normal;word-break:break-word}
td{padding:${cellPad};border:1px solid #e0e0e0;font-size:${baseFontTd}px;vertical-align:top;white-space:normal;word-break:break-word}
tr:nth-child(even){background:#f7fafc}
.footer{margin-top:16px;text-align:center;font-size:9px;color:#999}
</style></head><body>
<div class="header"><h1>${escapeHtml(formTitle)}</h1><div class="meta"><span><strong>${responses.length}</strong> resposta${responses.length!==1?"s":""}</span><span>Exportado em ${now}</span></div></div>
<table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>
<div class="footer">Relatório gerado automaticamente pelo GIRA Forms</div>
</body></html>`;
}

// Card-based layout for forms with many fields — each response becomes a readable card
function buildCardTableHtml(formTitle: string, fields: Field[], responses: FormResponse[], now: string): string {
  const cards = responses.map((r, idx) => {
    const rows = fields.map(f => {
      const val = formatAnswer(r.answers?.[f.id]);
      if (val === "—" || val === "") return "";
      return `<tr><td class="lbl">${escapeHtml(f.label)}</td><td class="val">${escapeHtml(val)}</td></tr>`;
    }).filter(Boolean).join("");

    return `<div class="card${idx > 0 ? ' page-break' : ''}">
      <div class="card-head">
        <div class="card-title">Resposta #${idx + 1}</div>
        <div class="card-meta">
          <span><strong>Respondente:</strong> ${escapeHtml(r.respondent_name || r.respondent_email || 'Anônimo')}</span>
          ${r.respondent_email ? `<span><strong>E-mail:</strong> ${escapeHtml(r.respondent_email)}</span>` : ''}
          <span><strong>Data:</strong> ${formatDate(r.submitted_at)}</span>
        </div>
      </div>
      <table><tbody>${rows}</tbody></table>
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><style>
@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:10px;line-height:1.4}
.doc-header{border-bottom:3px solid #0DA3E7;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end}
.doc-header h1{font-size:16px;font-weight:700;color:#0DA3E7;text-transform:uppercase;max-width:70%;line-height:1.2}
.doc-header .meta{text-align:right;font-size:8px;color:#666}.meta span{display:block}
.page-break{page-break-before:always}
.card{margin-bottom:20px}
.card-head{border-bottom:2px solid #0DA3E7;padding-bottom:8px;margin-bottom:10px}
.card-title{font-size:13px;font-weight:700;color:#0DA3E7;margin-bottom:4px}
.card-meta{display:flex;flex-wrap:wrap;gap:12px;font-size:9px;color:#444}
table{width:100%;border-collapse:collapse}
td{padding:6px 10px;border:1px solid #e0e0e0;font-size:10px;vertical-align:top;word-break:break-word}
td.lbl{background:#f1f5f9;font-weight:600;width:35%;color:#334155}
td.val{width:65%}
tr:nth-child(even) td.val{background:#fafbfc}
.footer{margin-top:20px;text-align:center;font-size:8px;color:#999}
</style></head><body>
<div class="doc-header"><h1>${escapeHtml(formTitle)}</h1><div class="meta"><span><strong>${responses.length}</strong> resposta${responses.length!==1?"s":""}</span><span>Exportado em ${now}</span></div></div>
${cards}
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

// Build comprehensive data summary for AI — includes ALL responses, text analysis, correlations
function buildComprehensiveDataSummary(formTitle: string, fields: Field[], responses: FormResponse[]) {
  const chartData = buildChartData(fields, responses);

  // Text field analysis (open-ended responses)
  const textFields = fields.filter(f => ['short_text', 'long_text', 'textarea'].includes(f.type));
  const textAnalysis: { field: string; totalFilled: number; sampleAnswers: string[]; avgLength: number }[] = [];
  for (const f of textFields) {
    const answers: string[] = [];
    let totalLen = 0;
    for (const r of responses) {
      const val = r.answers?.[f.id];
      if (val && typeof val === 'string' && val.trim()) {
        answers.push(val.trim());
        totalLen += val.trim().length;
      }
    }
    if (answers.length > 0) {
      // Send up to 30 unique text answers for richer analysis
      const unique = [...new Set(answers)];
      textAnalysis.push({
        field: f.label,
        totalFilled: answers.length,
        sampleAnswers: unique.slice(0, 30),
        avgLength: Math.round(totalLen / answers.length),
      });
    }
  }

  // Number field stats
  const numberFields = fields.filter(f => ['number', 'scale'].includes(f.type));
  const numberStats: { field: string; min: number; max: number; avg: number; median: number; count: number }[] = [];
  for (const f of numberFields) {
    const values: number[] = [];
    for (const r of responses) {
      const val = r.answers?.[f.id];
      if (val !== null && val !== undefined && !isNaN(Number(val))) {
        values.push(Number(val));
      }
    }
    if (values.length > 0) {
      values.sort((a, b) => a - b);
      numberStats.push({
        field: f.label,
        min: values[0],
        max: values[values.length - 1],
        avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
        median: values[Math.floor(values.length / 2)],
        count: values.length,
      });
    }
  }

  // Temporal analysis
  const byDate: Record<string, number> = {};
  const byWeekday: Record<string, number> = { 'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0 };
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  for (const r of responses) {
    const d = new Date(r.submitted_at);
    const dateKey = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    byDate[dateKey] = (byDate[dateKey] || 0) + 1;
    byWeekday[weekdays[d.getDay()]]++;
  }

  // Completion rate per field
  const completionRates: { field: string; filled: number; total: number; rate: string }[] = [];
  for (const f of fields) {
    let filled = 0;
    for (const r of responses) {
      const val = r.answers?.[f.id];
      if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
        filled++;
      }
    }
    completionRates.push({
      field: f.label,
      filled,
      total: responses.length,
      rate: `${Math.round((filled / responses.length) * 100)}%`,
    });
  }

  // Cross-field correlations (top 2 categorical fields)
  const categoricalCharts = chartData.slice(0, 2);
  const crossAnalysis: { fields: string[]; correlations: Record<string, Record<string, number>> }[] = [];
  if (categoricalCharts.length >= 2) {
    const f1 = fields.find(f => f.label === categoricalCharts[0].label);
    const f2 = fields.find(f => f.label === categoricalCharts[1].label);
    if (f1 && f2) {
      const cross: Record<string, Record<string, number>> = {};
      for (const r of responses) {
        const v1 = r.answers?.[f1.id];
        const v2 = r.answers?.[f2.id];
        if (v1 && v2) {
          const k1 = String(Array.isArray(v1) ? v1[0] : v1);
          const k2 = String(Array.isArray(v2) ? v2[0] : v2);
          if (!cross[k1]) cross[k1] = {};
          cross[k1][k2] = (cross[k1][k2] || 0) + 1;
        }
      }
      crossAnalysis.push({ fields: [f1.label, f2.label], correlations: cross });
    }
  }

  return {
    formTitle,
    totalResponses: responses.length,
    identifiedResponses: responses.filter(r => r.respondent_name).length,
    fields: fields.map(f => ({ label: f.label, type: f.type })),
    distributions: chartData.map(c => ({
      field: c.label,
      counts: c.data,
      topAnswer: Object.entries(c.data).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
      diversity: Object.keys(c.data).length,
    })),
    textAnalysis,
    numberStats,
    temporalAnalysis: {
      responsesPerDay: byDate,
      responsesPerWeekday: byWeekday,
      peakDay: Object.entries(byDate).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
      peakWeekday: Object.entries(byWeekday).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    },
    completionRates: completionRates.filter(c => c.rate !== '100%'),
    crossAnalysis,
    dateRange: responses.length > 0
      ? { from: formatDate(responses[responses.length-1].submitted_at), to: formatDate(responses[0].submitted_at) }
      : null,
  };
}

function markdownToHtml(md: string): string {
  let html = escapeHtml(md);
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="section-title">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3 class="section-title">$1</h3>');
  // Lists
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li><strong>$1.</strong> $2</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>');
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p>\s*<(h[345]|ul)/g, '<$1');
  html = html.replace(/<\/(h[345]|ul)>\s*<\/p>/g, '</$1>');
  html = html.replace(/<p>\s*<\/p>/g, '');
  return html;
}

function buildAiReportHtml(formTitle: string, fields: Field[], responses: FormResponse[], aiNarrative: string): string {
  const now = formatDate(new Date().toISOString());
  const charts = buildChartData(fields, responses);
  const chartsHtml = charts.map(c => buildSvgBarChart(c.label, c.data)).join('\n');
  const narrativeHtml = markdownToHtml(aiNarrative);

  const totalResps = responses.length;
  const withName = responses.filter(r => r.respondent_name).length;
  const dateRange = responses.length > 0
    ? `${formatDate(responses[responses.length-1].submitted_at)} — ${formatDate(responses[0].submitted_at)}`
    : '—';
  
  // Completion stats
  const totalFields = fields.length;
  const avgCompletion = fields.length > 0 ? Math.round(
    fields.reduce((acc, f) => {
      const filled = responses.filter(r => {
        const v = r.answers?.[f.id];
        return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
      }).length;
      return acc + (filled / totalResps) * 100;
    }, 0) / totalFields
  ) : 0;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><style>
@page{size:A4 portrait;margin:14mm}*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;line-height:1.6}
.cover{text-align:center;padding:50px 20px 40px;page-break-after:always;position:relative}
.cover::after{content:'';position:absolute;bottom:0;left:10%;right:10%;height:3px;background:linear-gradient(90deg,transparent,#0DA3E7,transparent)}
.cover h1{font-size:26px;font-weight:800;color:#0DA3E7;text-transform:uppercase;margin-bottom:8px;letter-spacing:1px}
.cover .subtitle{font-size:15px;color:#475569;margin-bottom:40px;font-weight:400}
.cover .stats{display:flex;justify-content:center;gap:20px;margin-top:24px;flex-wrap:wrap}
.stat-box{background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border:1px solid #bae6fd;border-radius:12px;padding:18px 24px;text-align:center;min-width:120px}
.stat-box .num{font-size:30px;font-weight:800;color:#0DA3E7;display:block;line-height:1.1}
.stat-box .lbl{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px}
.cover .period{margin-top:24px;font-size:10px;color:#94a3b8;font-style:italic}
h2{font-size:16px;font-weight:700;color:#0DA3E7;border-bottom:2px solid #0DA3E7;padding-bottom:6px;margin:28px 0 14px}
.chart-block{margin-bottom:20px;break-inside:avoid}
.chart-block h3{font-size:12px;font-weight:600;color:#334155;margin-bottom:6px}
.narrative{font-size:11px;line-height:1.7;color:#1e293b}
.narrative .section-title{font-size:13px;font-weight:700;color:#0DA3E7;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #e2e8f0}
.narrative h4{font-size:12px;font-weight:600;color:#334155;margin:14px 0 6px}
.narrative h5{font-size:11px;font-weight:600;color:#475569;margin:10px 0 4px}
.narrative p{margin-bottom:8px}
.narrative ul{margin:6px 0 10px 20px;padding:0}
.narrative li{margin-bottom:4px}
.narrative strong{color:#0f172a}
.insight-box{background:#f0f9ff;border-left:4px solid #0DA3E7;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;font-size:10.5px}
.footer{margin-top:30px;text-align:center;font-size:8px;color:#999;border-top:1px solid #e2e8f0;padding-top:8px}
</style></head><body>

<div class="cover">
  <h1>📊 Relatório Analítico</h1>
  <div class="subtitle">${escapeHtml(formTitle)}</div>
  <div class="stats">
    <div class="stat-box"><span class="num">${totalResps}</span><span class="lbl">Respostas</span></div>
    <div class="stat-box"><span class="num">${withName}</span><span class="lbl">Identificados</span></div>
    <div class="stat-box"><span class="num">${responses.length > 0 ? Math.round((withName/totalResps)*100) : 0}%</span><span class="lbl">Identificação</span></div>
    <div class="stat-box"><span class="num">${avgCompletion}%</span><span class="lbl">Preenchimento</span></div>
  </div>
  <div class="period">Período: ${dateRange}</div>
</div>

${charts.length > 0 ? `<h2>📊 Distribuição das Respostas</h2>${chartsHtml}` : ''}

<h2>🧠 Análise Inteligente</h2>
<div class="narrative">${narrativeHtml}</div>

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

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = token === serviceRoleKey;

    // Use service role client for internal calls, user client for external
    const supabaseClient = isServiceRole
      ? createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey)
      : createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

    if (!isServiceRole) {
      const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
      if (authError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { formId, mode = 'table', responseIds } = await req.json();
    if (!formId) {
      return new Response(JSON.stringify({ error: "formId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch form
    const { data: form, error: formErr } = await supabaseClient
      .from("forms").select("id, title, description").eq("id", formId).single();
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

      // Build comprehensive data summary with ALL responses
      const dataSummary = buildComprehensiveDataSummary(form.title, dataFields, resps);

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
              content: `Você é um analista sênior de dados especializado em pesquisas sociais e formulários de campo.
Gere um relatório analítico PROFUNDO e PROFISSIONAL em português brasileiro.

DIRETRIZES DE QUALIDADE:
- Use SEMPRE dados numéricos concretos, porcentagens e proporções
- Identifique padrões não-óbvios e correlações entre campos
- Compare subgrupos quando possível (ex: respostas por gênero, região, etc.)
- Destaque anomalias, outliers e pontos de atenção
- Faça inferências inteligentes baseadas nos dados
- Se houver campos de texto aberto, identifique temas recorrentes e sentimentos

ESTRUTURA OBRIGATÓRIA (use ## para títulos de seção):

## Sumário Executivo
Síntese em 3-4 frases do que os dados revelam. Impacto principal.

## Perfil dos Respondentes  
Análise demográfica e de identificação. Quem respondeu? Padrões de participação temporal.

## Análise das Respostas
Para cada campo relevante, analise distribuição, concentração e significância.
Cruze dados entre campos quando houver correlação.

## Padrões e Tendências
Insights não-óbvios. Correlações entre variáveis. Mudanças temporais se aplicável.

## Campos de Texto — Análise Qualitativa
(Se houver) Temas recorrentes, palavras-chave, sentimento geral.

## Pontos de Atenção
Alertas, riscos, campos com baixo preenchimento, inconsistências.

## Recomendações Estratégicas
5-7 recomendações acionáveis baseadas nos dados. Priorize por impacto.

FORMATO: Use markdown com ## para seções, **negrito** para destaques, listas com - para itens.
Escreva entre 600-900 palavras. Seja analítico, não descritivo.`,
            },
            {
              role: "user",
              content: `Analise TODOS os dados do formulário "${form.title}"${form.description ? ` (${form.description})` : ''}:

${JSON.stringify(dataSummary, null, 2)}`,
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
