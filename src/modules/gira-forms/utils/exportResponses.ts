import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Form, FormField, FormResponse } from '../types';

function getDataFields(fields: FormField[]) {
  return fields.filter(f => f.type !== 'section_header' && f.type !== 'info_text');
}

function getHeaders(fields: FormField[]) {
  return ['Data', 'Respondente', 'E-mail', ...getDataFields(fields).map(f => f.label)];
}

function getRows(responses: FormResponse[], fields: FormField[]) {
  const dataFields = getDataFields(fields);
  return responses.map(r => [
    format(new Date(r.submitted_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    r.respondent_name || '',
    r.respondent_email || '',
    ...dataFields.map(f => {
      const val = r.answers?.[f.id];
      return Array.isArray(val) ? val.join(', ') : String(val ?? '');
    }),
  ]);
}

// ═══════════════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════════════
export function exportToCsv(form: Form, fields: FormField[], responses: FormResponse[]) {
  const headers = getHeaders(fields);
  const rows = getRows(responses, fields);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${form.title} - Respostas.csv`);
}

// ═══════════════════════════════════════════════
// Excel Export
// ═══════════════════════════════════════════════
export function exportToExcel(form: Form, fields: FormField[], responses: FormResponse[]) {
  const headers = getHeaders(fields);
  const rows = getRows(responses, fields);

  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Worksheet ss:Name="Respostas"><Table>\n';

  xml += '<Row>';
  headers.forEach(h => { xml += `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`; });
  xml += '</Row>\n';

  rows.forEach(row => {
    xml += '<Row>';
    row.forEach(cell => { xml += `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`; });
    xml += '</Row>\n';
  });

  xml += '</Table></Worksheet></Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${form.title} - Respostas.xls`);
}

// ═══════════════════════════════════════════════
// PDF Table Export (server-side via Browserless)
// ═══════════════════════════════════════════════
export async function exportToPdf(form: Form, _fields: FormField[], _responses: FormResponse[]) {
  toast.info('Gerando PDF via servidor...');

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/export-form-pdf`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ formId: form.id, mode: 'table' }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Erro ao gerar PDF');
    }

    const blob = await response.blob();
    downloadBlob(blob, `${form.title} - Respostas.pdf`);
    toast.success('PDF exportado com sucesso!');
  } catch (e: any) {
    console.error('PDF export error:', e);
    toast.error(e.message || 'Erro ao exportar PDF');
  }
}

// ═══════════════════════════════════════════════
// Individual PDF (fichas per respondent)
// ═══════════════════════════════════════════════
export async function exportIndividualPdf(form: Form, fields: FormField[], responses: FormResponse[]) {
  if (responses.length === 0) {
    toast.error('Nenhuma resposta para exportar.');
    return;
  }

  toast.info(`Gerando ${responses.length} ficha(s) em PDF...`);

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/export-form-pdf`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        formId: form.id,
        mode: 'individual',
        responseIds: responses.map(r => r.id),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Erro ao gerar PDF');
    }

    const blob = await response.blob();
    downloadBlob(blob, `${form.title} - Fichas Individuais.pdf`);
    toast.success('Fichas exportadas com sucesso!');
  } catch (e: any) {
    console.error('Individual PDF error:', e);
    toast.error(e.message || 'Erro ao exportar fichas');
  }
}

// ═══════════════════════════════════════════════
// AI Insights Report
// ═══════════════════════════════════════════════
export async function exportAiReport(form: Form, fields: FormField[], responses: FormResponse[]) {
  if (responses.length === 0) {
    toast.error('Nenhuma resposta para analisar.');
    return;
  }

  toast.info('Gerando relatório com IA...');

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/export-form-pdf`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        formId: form.id,
        mode: 'ai-report',
        responseIds: responses.map(r => r.id),
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        toast.error('Limite de requisições IA excedido. Tente novamente em alguns minutos.');
        return;
      }
      if (response.status === 402) {
        toast.error('Créditos de IA esgotados. Adicione créditos na sua conta.');
        return;
      }
      const err = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Erro ao gerar relatório IA');
    }

    const blob = await response.blob();
    downloadBlob(blob, `${form.title} - Relatório IA.pdf`);
    toast.success('Relatório IA exportado com sucesso!');
  } catch (e: any) {
    console.error('AI report error:', e);
    toast.error(e.message || 'Erro ao gerar relatório IA');
  }
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════
function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
