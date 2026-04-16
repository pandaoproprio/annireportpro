import jsPDF from 'jspdf';
import type { ProductivitySnapshot, MonitoringConfig, MonitoringAlert } from '@/hooks/useProductivityMonitoring';

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

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin', analista: 'Analista',
  coordenador: 'Coordenador(a)', oficineiro: 'Oficineiro(a)',
  voluntario: 'Voluntário(a)', usuario: 'Usuário',
};

export interface MonitoringPdfData {
  snapshots: ProductivitySnapshot[];
  config: MonitoringConfig | null;
  activeCount: number;
  inactiveCount: number;
  lowPerformersCount: number;
  slaViolatorsCount: number;
  avgScore: number;
  totalRework: number;
  alerts: MonitoringAlert[];
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

  // KPIs (6 cards)
  const kpis = [
    { label: 'Usuários Ativos', value: String(data.activeCount) },
    { label: 'Inativos', value: String(data.inactiveCount) },
    { label: 'Baixa Produtividade', value: String(data.lowPerformersCount) },
    { label: 'Violações SLA', value: String(data.slaViolatorsCount) },
    { label: 'Score Médio', value: data.avgScore.toFixed(0) },
    { label: 'Retrabalho', value: String(data.totalRework) },
  ];

  const boxW = (CW - 10) / 3;
  kpis.forEach((kpi, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const x = ML + col * (boxW + 5);
    const yOff = ctx.y + row * 22;
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(x, yOff, boxW, 18, 2, 2, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(kpi.label, x + boxW / 2, yOff + 6, { align: 'center' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(30, 64, 175);
    pdf.text(kpi.value, x + boxW / 2, yOff + 14, { align: 'center' });
  });
  ctx.y += 50;

  // Table
  ensureSpace(ctx, 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(17, 24, 39);
  pdf.text('Detalhamento por Usuário', ML, ctx.y);
  ctx.y += 8;

  const cols = ['Usuário', 'Função', 'Score', 'Ativ.', 'Inativo', 'SLA %', 'Retrab.', 'Perc.', 'Status'];
  const colW = [38, 22, 14, 14, 16, 14, 14, 14, 18];

  // Header
  ensureSpace(ctx, 8);
  pdf.setFillColor(30, 64, 175);
  pdf.rect(ML, ctx.y - 4, CW, 7, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  let x = ML + 2;
  cols.forEach((c, i) => { pdf.text(c, x, ctx.y); x += colW[i]; });
  ctx.y += 7;

  // Rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  const sorted = [...data.snapshots].sort((a, b) => Number(b.score) - Number(a.score));
  sorted.forEach((s, idx) => {
    ensureSpace(ctx, 7);
    if (idx % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(ML, ctx.y - 4, CW, 6.5, 'F');
    }
    pdf.setTextColor(55, 65, 81);
    x = ML + 2;
    const name = (s.user_name || '').substring(0, 18);
    const roleLabel = (ROLE_LABELS[s.user_role] || s.user_role || '').substring(0, 12);
    const scoreVal = Number(s.score || 0).toFixed(0);
    const statusLabel = s.status === 'ok' ? 'OK' : s.status === 'inactive' ? 'Inativo' : 'Baixo';
    const row = [
      name, roleLabel, scoreVal, String(s.activities_count),
      String(s.days_inactive), `${Number(s.sla_pct_on_time).toFixed(0)}%`,
      String(s.reopen_count || 0), `${Number(s.percentile_rank || 0).toFixed(0)}%`, statusLabel,
    ];
    row.forEach((val, i) => { pdf.text(val, x, ctx.y); x += colW[i]; });

    // Projects line
    const projects = (s.user_projects || []).map((p: any) => p.name).join(', ');
    if (projects) {
      ctx.y += 4;
      ensureSpace(ctx, 4);
      pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Projetos: ${projects.substring(0, 80)}`, ML + 4, ctx.y);
      pdf.setFontSize(7);
    }
    ctx.y += 6.5;
  });

  // Alerts Section
  const unresolvedAlerts = data.alerts.filter(a => !a.is_resolved);
  if (unresolvedAlerts.length > 0) {
    ensureSpace(ctx, 20);
    ctx.y += 5;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Alertas Inteligentes', ML, ctx.y);
    ctx.y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    for (const alert of unresolvedAlerts.slice(0, 20)) {
      ensureSpace(ctx, 8);
      const severity = alert.severity === 'critical' ? '🔴' : '🟡';
      pdf.setTextColor(55, 65, 81);
      pdf.text(`${severity} ${alert.user_name} — ${alert.description}`, ML + 2, ctx.y);
      ctx.y += 5;
    }
  }

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
