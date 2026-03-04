import jsPDF from 'jspdf';

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 20;
const MR = 20;
const MT = 25;
const MB = 20;
const CW = PAGE_W - ML - MR;
const MAX_Y = PAGE_H - MB - 8;
const LINE_H = 6.5;

interface DashboardPdfData {
  projectName: string;
  organization: string;
  fomento: string;
  funder: string;
  startDate: string;
  endDate: string;
  daysRemaining: number | string;
  totalActivities: number;
  totalAttendees: number;
  goalsCount: number;
  activitiesByType: Record<string, number>;
  activitiesByGoal: Record<string, number>;
  activitiesByMonth: Record<string, number>;
  aiNarrative: string | null;
  slaOnTime: number;
  slaOverdue: number;
  draftsCount: number;
  goals: Array<{ title: string; activityCount: number }>;
  recentActivities: Array<{ date: string; description: string }>;
}

function formatDate(d: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch { return d; }
}

function checkPage(pdf: jsPDF, y: number, need = 20): number {
  if (y + need > MAX_Y) {
    pdf.addPage();
    return MT;
  }
  return y;
}

function drawSectionTitle(pdf: jsPDF, title: string, y: number): number {
  y = checkPage(pdf, y, 20);
  pdf.setFillColor(30, 58, 138); // brand deep blue
  pdf.roundedRect(ML, y - 1, CW, 9, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.text(title.toUpperCase(), ML + 4, y + 5.5);
  pdf.setTextColor(30, 30, 30);
  return y + 14;
}

function drawKpi(pdf: jsPDF, x: number, y: number, w: number, label: string, value: string, color: [number, number, number]) {
  pdf.setFillColor(245, 247, 250);
  pdf.roundedRect(x, y, w, 22, 3, 3, 'F');
  pdf.setDrawColor(200, 210, 225);
  pdf.roundedRect(x, y, w, 22, 3, 3, 'S');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...color);
  pdf.text(value, x + w / 2, y + 10, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(label, x + w / 2, y + 17, { align: 'center' });
  pdf.setTextColor(30, 30, 30);
}

function drawTableRow(pdf: jsPDF, y: number, cols: Array<{ text: string; x: number; w: number; align?: 'left' | 'center' | 'right'; bold?: boolean }>) {
  cols.forEach(col => {
    pdf.setFont('helvetica', col.bold ? 'bold' : 'normal');
    pdf.text(col.text, col.align === 'right' ? col.x + col.w - 2 : col.align === 'center' ? col.x + col.w / 2 : col.x + 2, y, {
      align: col.align || 'left',
    });
  });
}

function drawBar(pdf: jsPDF, x: number, y: number, maxW: number, pct: number, h: number, color: [number, number, number]) {
  pdf.setFillColor(230, 235, 245);
  pdf.roundedRect(x, y, maxW, h, 1.5, 1.5, 'F');
  if (pct > 0) {
    pdf.setFillColor(...color);
    pdf.roundedRect(x, y, Math.max(3, maxW * pct), h, 1.5, 1.5, 'F');
  }
}

export function exportDashboardToPdf(data: DashboardPdfData) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const dateStr = new Date().toLocaleDateString('pt-BR');

  // ═══════════════════ COVER ═══════════════════
  pdf.setFillColor(30, 58, 138);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Accent bar
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, PAGE_H * 0.38, PAGE_W, 3, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.text('PAINEL DE CONTROLE', PAGE_W / 2, 80, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Relatório Executivo do Dashboard', PAGE_W / 2, 95, { align: 'center' });

  pdf.setFontSize(11);
  pdf.text(data.projectName || 'Projeto', PAGE_W / 2, 130, { align: 'center' });
  pdf.text(data.organization || '', PAGE_W / 2, 138, { align: 'center' });

  if (data.fomento) {
    pdf.setFontSize(10);
    pdf.text(`Termo de Fomento nº: ${data.fomento}`, PAGE_W / 2, 150, { align: 'center' });
  }

  pdf.setFontSize(10);
  pdf.text(`Gerado em ${dateStr}`, PAGE_W / 2, PAGE_H - 30, { align: 'center' });
  pdf.text('GIRA Relatórios', PAGE_W / 2, PAGE_H - 22, { align: 'center' });

  // ═══════════════════ PAGE 2: KPIs + Info ═══════════════════
  pdf.addPage();
  let y = MT;

  // Project info
  y = drawSectionTitle(pdf, 'Informações do Projeto', y);
  pdf.setFontSize(9);
  const infoLines = [
    ['Projeto', data.projectName],
    ['Organização', data.organization],
    ['Financiador', data.funder],
    ['Período', `${formatDate(data.startDate)} a ${formatDate(data.endDate)}`],
    ['Dias Restantes', String(data.daysRemaining)],
  ].filter(([, v]) => v && v !== '—');

  infoLines.forEach(([label, value]) => {
    y = checkPage(pdf, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, ML + 2, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, ML + 42, y);
    y += LINE_H;
  });
  y += 4;

  // KPI Cards
  y = drawSectionTitle(pdf, 'Indicadores Principais', y);
  const kpiW = (CW - 9) / 4;
  drawKpi(pdf, ML, y, kpiW, 'Atividades Totais', String(data.totalActivities), [37, 99, 235]);
  drawKpi(pdf, ML + kpiW + 3, y, kpiW, 'Pessoas Impactadas', String(data.totalAttendees), [16, 185, 129]);
  drawKpi(pdf, ML + (kpiW + 3) * 2, y, kpiW, 'Metas Ativas', String(data.goalsCount), [139, 92, 246]);
  drawKpi(pdf, ML + (kpiW + 3) * 3, y, kpiW, 'Rascunhos', String(data.draftsCount), [245, 158, 11]);
  y += 30;

  // ═══════════════════ AI SUMMARY ═══════════════════
  if (data.aiNarrative) {
    y = drawSectionTitle(pdf, '✦ Resumo Executivo IA', y);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    const lines = data.aiNarrative.split('\n');
    lines.forEach(line => {
      if (line.trim() === '') { y += 3; return; }

      // Handle bold markers
      const isBold = line.includes('**');
      const cleanLine = line.replace(/\*\*/g, '');

      y = checkPage(pdf, y);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      const wrapped = pdf.splitTextToSize(cleanLine, CW - 4);
      wrapped.forEach((wl: string) => {
        y = checkPage(pdf, y);
        pdf.text(wl, ML + 2, y);
        y += LINE_H - 1;
      });
    });
    y += 6;
  }

  // ═══════════════════ CHART: Activities by Type ═══════════════════
  const typeEntries = Object.entries(data.activitiesByType).sort((a, b) => b[1] - a[1]);
  if (typeEntries.length > 0) {
    y = checkPage(pdf, y, 30);
    y = drawSectionTitle(pdf, 'Atividades por Tipo', y);
    const maxVal = Math.max(...typeEntries.map(e => e[1]));
    const barMaxW = CW - 60;
    const barColors: Array<[number, number, number]> = [
      [37, 99, 235], [16, 185, 129], [245, 158, 11], [139, 92, 246], [236, 72, 153], [107, 114, 128],
    ];

    typeEntries.forEach(([type, count], i) => {
      y = checkPage(pdf, y, 10);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const label = type.length > 28 ? type.substring(0, 28) + '…' : type;
      pdf.text(label, ML + 2, y + 4);
      drawBar(pdf, ML + 52, y, barMaxW, count / maxVal, 5, barColors[i % barColors.length]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(count), ML + 52 + barMaxW + 3, y + 4);
      y += 9;
    });
    y += 6;
  }

  // ═══════════════════ CHART: Activities by Goal ═══════════════════
  const goalEntries = Object.entries(data.activitiesByGoal).sort((a, b) => b[1] - a[1]);
  if (goalEntries.length > 0) {
    y = checkPage(pdf, y, 30);
    y = drawSectionTitle(pdf, 'Atividades por Meta', y);
    const maxVal = Math.max(...goalEntries.map(e => e[1]));
    const barMaxW = CW - 60;

    goalEntries.forEach(([goal, count]) => {
      y = checkPage(pdf, y, 10);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const label = goal.length > 28 ? goal.substring(0, 28) + '…' : goal;
      pdf.text(label, ML + 2, y + 4);
      drawBar(pdf, ML + 52, y, barMaxW, count / maxVal, 5, [59, 130, 246]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(count), ML + 52 + barMaxW + 3, y + 4);
      y += 9;
    });
    y += 6;
  }

  // ═══════════════════ CHART: Activities by Month ═══════════════════
  const monthEntries = Object.entries(data.activitiesByMonth);
  if (monthEntries.length > 0) {
    y = checkPage(pdf, y, 30);
    y = drawSectionTitle(pdf, 'Atividades por Mês', y);
    const maxVal = Math.max(...monthEntries.map(e => e[1]), 1);
    const barMaxW = CW - 50;

    monthEntries.forEach(([month, count]) => {
      y = checkPage(pdf, y, 10);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(month, ML + 2, y + 4);
      drawBar(pdf, ML + 32, y, barMaxW, count / maxVal, 5, [16, 185, 129]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(count), ML + 32 + barMaxW + 3, y + 4);
      y += 9;
    });
    y += 6;
  }

  // ═══════════════════ Goals Progress ═══════════════════
  if (data.goals.length > 0) {
    y = checkPage(pdf, y, 30);
    y = drawSectionTitle(pdf, 'Progresso das Metas', y);
    const maxGoalAct = Math.max(...data.goals.map(g => g.activityCount), 1);
    const barMaxW = CW - 60;

    data.goals.forEach(goal => {
      y = checkPage(pdf, y, 10);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const label = goal.title.length > 28 ? goal.title.substring(0, 28) + '…' : goal.title;
      pdf.text(label, ML + 2, y + 4);
      drawBar(pdf, ML + 52, y, barMaxW, goal.activityCount / maxGoalAct, 5, [139, 92, 246]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${goal.activityCount} ativ.`, ML + 52 + barMaxW + 3, y + 4);
      y += 9;
    });
    y += 6;
  }

  // ═══════════════════ Recent Activities ═══════════════════
  if (data.recentActivities.length > 0) {
    y = checkPage(pdf, y, 30);
    y = drawSectionTitle(pdf, 'Atividades Recentes', y);
    pdf.setFontSize(8);

    data.recentActivities.forEach(act => {
      y = checkPage(pdf, y, 10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(act.date, ML + 2, y);
      pdf.setFont('helvetica', 'normal');
      const desc = act.description.length > 90 ? act.description.substring(0, 90) + '…' : act.description;
      pdf.text(desc, ML + 28, y);
      y += LINE_H;
    });
  }

  // ═══════════════════ Footer on all pages ═══════════════════
  const totalPages = pdf.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text(`GIRA Relatórios — ${data.projectName}`, ML, PAGE_H - 8);
    pdf.text(`Página ${i - 1} de ${totalPages - 1}`, PAGE_W - MR, PAGE_H - 8, { align: 'right' });
    pdf.setDrawColor(200, 210, 225);
    pdf.line(ML, PAGE_H - 12, PAGE_W - MR, PAGE_H - 12);
  }
  pdf.setTextColor(30, 30, 30);

  pdf.save(`Dashboard_${data.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
