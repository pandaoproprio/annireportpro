import jsPDF from 'jspdf';
import type { ProductivitySnapshot, MonitoringConfig } from '@/hooks/useProductivityMonitoring';

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 20;
const MR = 20;
const MT = 25;
const MB = 20;
const CW = PAGE_W - ML - MR;
const MAX_Y = PAGE_H - MB;

interface PdfCtx { pdf: jsPDF; y: number; }

function newPage(ctx: PdfCtx) { ctx.pdf.addPage(); ctx.y = MT; }
function ensureSpace(ctx: PdfCtx, h: number) { if (ctx.y + h > MAX_Y) newPage(ctx); }

interface MonitoringPdfData {
  snapshots: ProductivitySnapshot[];
  config: MonitoringConfig | null;
  activeCount: number;
  inactiveCount: number;
  lowPerformersCount: number;
  slaViolatorsCount: number;
}

export function exportMonitoringToPdf(data: MonitoringPdfData) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ctx: PdfCtx = { pdf, y: MT };

  // Title
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, PAGE_W, 4, 'F');

  ctx.y = 35;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Relatório de Monitoramento de Produtividade', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  pdf.text(`Gerado em: ${today}`, PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 15;

  // KPIs
  const kpis = [
    { label: 'Usuários Ativos', value: String(data.activeCount) },
    { label: 'Inativos', value: String(data.inactiveCount) },
    { label: 'Baixa Produtividade', value: String(data.lowPerformersCount) },
    { label: 'Violações SLA', value: String(data.slaViolatorsCount) },
  ];

  const boxW = (CW - 12) / 4;
  kpis.forEach((kpi, i) => {
    const x = ML + i * (boxW + 4);
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(x, ctx.y, boxW, 18, 2, 2, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(kpi.label, x + boxW / 2, ctx.y + 6, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(30, 64, 175);
    pdf.text(kpi.value, x + boxW / 2, ctx.y + 14, { align: 'center' });
  });
  ctx.y += 25;

  // Table
  ensureSpace(ctx, 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Detalhamento por Usuário', ML, ctx.y);
  ctx.y += 8;

  const cols = ['Usuário', 'Atividades', 'Média (h)', 'Inativos', 'SLA %', 'Status'];
  const colW = [45, 22, 22, 22, 22, 27];

  // Header
  ensureSpace(ctx, 8);
  pdf.setFillColor(30, 64, 175);
  pdf.rect(ML, ctx.y - 4, CW, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  let x = ML + 2;
  cols.forEach((c, i) => { pdf.text(c, x, ctx.y); x += colW[i]; });
  ctx.y += 7;

  // Rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  data.snapshots.forEach((s, idx) => {
    ensureSpace(ctx, 7);
    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(ML, ctx.y - 4, CW, 6.5, 'F');
    }
    pdf.setTextColor(55, 65, 81);
    x = ML + 2;
    const name = (s.user_name || '').substring(0, 20);
    const avgH = s.avg_task_seconds != null ? (s.avg_task_seconds / 3600).toFixed(1) : '-';
    const statusLabel = s.status === 'ok' ? 'OK' : s.status === 'inactive' ? 'Inativo' : 'Baixo';
    const row = [name, String(s.activities_count), avgH, String(s.days_inactive), `${s.sla_pct_on_time}%`, statusLabel];
    row.forEach((val, i) => { pdf.text(val, x, ctx.y); x += colW[i]; });
    ctx.y += 6.5;
  });

  // Footer
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(156, 163, 175);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`GIRA — Monitoramento de Produtividade — Página ${i}/${totalPages}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' });
  }

  pdf.save(`GIRA_Monitoramento_${new Date().toISOString().split('T')[0]}.pdf`);
}
