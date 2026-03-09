import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Form, FormField, FormResponse } from '../types';

function getHeaders(fields: FormField[]) {
  return ['Data', 'Respondente', 'E-mail', ...fields.map(f => f.label)];
}

function getRows(responses: FormResponse[], fields: FormField[]) {
  return responses.map(r => [
    format(new Date(r.submitted_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    r.respondent_name || '',
    r.respondent_email || '',
    ...fields.map(f => {
      const val = r.answers?.[f.id];
      return Array.isArray(val) ? val.join(', ') : String(val ?? '');
    }),
  ]);
}

export function exportToCsv(form: Form, fields: FormField[], responses: FormResponse[]) {
  const headers = getHeaders(fields);
  const rows = getRows(responses, fields);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${form.title} - Respostas.csv`);
}

export function exportToExcel(form: Form, fields: FormField[], responses: FormResponse[]) {
  const headers = getHeaders(fields);
  const rows = getRows(responses, fields);

  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
  xml += '<Worksheet ss:Name="Respostas"><Table>\n';

  // Header row
  xml += '<Row>';
  headers.forEach(h => { xml += `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`; });
  xml += '</Row>\n';

  // Data rows
  rows.forEach(row => {
    xml += '<Row>';
    row.forEach(cell => { xml += `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`; });
    xml += '</Row>\n';
  });

  xml += '</Table></Worksheet></Workbook>';

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${form.title} - Respostas.xls`);
}

export function exportToPdf(form: Form, fields: FormField[], responses: FormResponse[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.text(form.title, 14, 20);
  doc.setFontSize(10);
  doc.text(`${responses.length} resposta(s) | Exportado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 28);

  const headers = getHeaders(fields);
  const rows = getRows(responses, fields);
  const colCount = headers.length;
  const colW = Math.min(45, (pageW - 28) / colCount);
  const startX = 14;
  let y = 36;

  // Header
  doc.setFillColor(240, 240, 240);
  doc.rect(startX, y - 4, colCount * colW, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => {
    doc.text(h.substring(0, 20), startX + i * colW + 1, y, { maxWidth: colW - 2 });
  });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  rows.forEach(row => {
    if (y > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 15;
    }
    row.forEach((cell, i) => {
      doc.text(cell.substring(0, 25), startX + i * colW + 1, y, { maxWidth: colW - 2 });
    });
    y += 6;
  });

  doc.save(`${form.title} - Respostas.pdf`);
}

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
