import type { ReportV2Data } from './types';

/**
 * Generates a standalone HTML string for the report.
 * Used both by the Edge Function (server-side PDF) and can be reused for preview.
 * Pure HTML + inline CSS — no React dependency on server.
 */
export function generateReportHtml(data: ReportV2Data): string {
  const { header, title, object, summary, activities } = data;
  const hasLogos = header.logoLeft || header.logoCenter || header.logoRight;

  const logoHtml = hasLogos
    ? `<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a1a1a;padding-bottom:12px;margin-bottom:24px;">
        <div style="flex:1;display:flex;justify-content:flex-start;">${header.logoLeft ? `<img src="${header.logoLeft}" style="height:60px;object-fit:contain;" crossorigin="anonymous"/>` : ''}</div>
        <div style="flex:1;display:flex;justify-content:center;">${header.logoCenter ? `<img src="${header.logoCenter}" style="height:60px;object-fit:contain;" crossorigin="anonymous"/>` : ''}</div>
        <div style="flex:1;display:flex;justify-content:flex-end;">${header.logoRight ? `<img src="${header.logoRight}" style="height:60px;object-fit:contain;" crossorigin="anonymous"/>` : ''}</div>
      </div>`
    : '';

  const titleHtml = title
    ? `<div style="text-align:center;"><h1 style="font-size:24px;font-weight:bold;text-transform:uppercase;margin:0;">${escapeHtml(title)}</h1></div>`
    : '';

  const sectionBlock = (heading: string, content: string) =>
    content
      ? `<div style="break-inside:avoid;margin-top:24px;">
          <h2 style="font-size:16px;font-weight:bold;text-transform:uppercase;margin-bottom:8px;">${heading}</h2>
          <p style="font-size:14px;text-align:justify;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(content)}</p>
        </div>`
      : '';

  const activitiesHtml = activities
    .map((act, i) => {
      if (!act.title && !act.description && act.media.length === 0) return '';

      const mediaHtml = act.media.length > 0
        ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px;">
            ${act.media.map((m) =>
              m.type === 'image'
                ? `<img src="${m.url}" style="width:100%;height:160px;object-fit:cover;border-radius:6px;" crossorigin="anonymous"/>`
                : `<div style="width:100%;height:160px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#6b7280;">▶ Vídeo</div>`
            ).join('')}
          </div>`
        : '';

      const dateStr = act.date ? `<p style="font-size:12px;color:#6b7280;margin:0 0 8px 0;">Data: ${act.date}</p>` : '';

      return `<div style="${i > 0 ? 'page-break-before:always;' : ''}break-inside:avoid;">
        ${act.title ? `<h2 style="font-size:16px;font-weight:bold;text-transform:uppercase;margin-bottom:4px;">${escapeHtml(act.title)}</h2>` : ''}
        ${dateStr}
        ${act.description ? `<p style="font-size:14px;text-align:justify;line-height:1.6;margin:0 0 12px 0;white-space:pre-wrap;">${escapeHtml(act.description)}</p>` : ''}
        ${mediaHtml}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
    }
  </style>
</head>
<body>
  <div class="page">
    ${logoHtml}
    ${titleHtml}
    ${sectionBlock('OBJETO', object)}
    ${sectionBlock('RESUMO', summary)}
    ${activitiesHtml}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
