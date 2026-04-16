import jsPDF from 'jspdf';
import { getRiskLevel, calculateEMV, PROBABILITY_LABELS, IMPACT_LABELS, STATUS_LABELS, CATEGORY_LABELS } from '@/hooks/useProjectRisks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RiskForPdf {
  id: string;
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  status: string;
  responsible: string | null;
  risk_owner: string | null;
  monetary_impact: number;
  mitigation_plan: string;
  contingency_plan: string;
  due_date: string | null;
  escalated_to: string | null;
  created_at: string;
  resolved_at: string | null;
  project_name?: string;
  metadata?: any;
}

const PROB_SCORE: Record<string, number> = { muito_baixa: 1, baixa: 2, media: 3, alta: 4, muito_alta: 5 };
const IMP_SCORE: Record<string, number> = { insignificante: 1, menor: 2, moderado: 3, maior: 4, catastrofico: 5 };

export function exportRiskReportPdf(risks: RiskForPdf[], title: string = 'Relatório Executivo de Riscos') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const activeRisks = risks.filter(r => !['resolvido', 'aceito'].includes(r.status));
  const resolvedRisks = risks.filter(r => r.status === 'resolvido');
  const totalEMV = activeRisks.reduce((s, r) => s + calculateEMV(r.probability, r.monetary_impact || 0), 0);
  const criticalCount = activeRisks.filter(r => getRiskLevel(r.probability, r.impact).score >= 15).length;
  const highCount = activeRisks.filter(r => { const s = getRiskLevel(r.probability, r.impact).score; return s >= 9 && s < 15; }).length;
  const escalatedCount = activeRisks.filter(r => r.escalated_to).length;
  const overdueCount = activeRisks.filter(r => r.due_date && new Date(r.due_date) < new Date()).length;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = margin;
    }
  };

  const addHeader = (text: string, size: number = 14) => {
    checkPage(12);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 120);
    doc.text(text, margin, y);
    y += size * 0.5 + 2;
    // Underline
    doc.setDrawColor(30, 64, 120);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 4;
  };

  const addText = (text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number]; indent?: number }) => {
    const size = opts?.size || 9;
    const indent = opts?.indent || 0;
    doc.setFontSize(size);
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setTextColor(...(opts?.color || [50, 50, 50]));
    const lines = doc.splitTextToSize(text, contentW - indent);
    checkPage(lines.length * (size * 0.4) + 2);
    doc.text(lines, margin + indent, y);
    y += lines.length * (size * 0.4) + 1;
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // ── COVER ──
  doc.setFillColor(30, 64, 120);
  doc.rect(0, 0, pageW, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageW / 2, 30, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageW / 2, 42, { align: 'center' });
  doc.text(`Total: ${risks.length} riscos | ${activeRisks.length} ativos`, pageW / 2, 50, { align: 'center' });

  y = 72;

  // ── RESUMO EXECUTIVO ──
  addHeader('1. Resumo Executivo');

  const summaryItems = [
    [`Total de Riscos`, `${risks.length}`],
    [`Riscos Ativos`, `${activeRisks.length}`],
    [`Riscos Críticos`, `${criticalCount}`],
    [`Riscos Altos`, `${highCount}`],
    [`Riscos Resolvidos`, `${resolvedRisks.length}`],
    [`Riscos Escalados`, `${escalatedCount}`],
    [`Riscos Atrasados`, `${overdueCount}`],
    [`Exposição Total (EMV)`, fmt(totalEMV)],
  ];

  const colW = contentW / 2;
  for (let i = 0; i < summaryItems.length; i += 2) {
    checkPage(6);
    const bgColor: [number, number, number] = i % 4 === 0 ? [240, 245, 250] : [255, 255, 255];
    doc.setFillColor(...bgColor);
    doc.rect(margin, y - 3, contentW, 6, 'F');

    for (let j = 0; j < 2 && i + j < summaryItems.length; j++) {
      const [label, value] = summaryItems[i + j];
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(label, margin + j * colW + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(value, margin + j * colW + colW - 5, y, { align: 'right' });
    }
    y += 6;
  }
  y += 4;

  // ── MATRIZ 5x5 ──
  addHeader('2. Matriz de Probabilidade × Impacto');

  const matrixCellSize = 14;
  const matrixX = margin + 25;
  const matrixY = y + 8;
  const probKeys = ['muito_alta', 'alta', 'media', 'baixa', 'muito_baixa'];
  const impKeys = ['insignificante', 'menor', 'moderado', 'maior', 'catastrofico'];

  checkPage(matrixCellSize * 5 + 20);

  // Axis labels
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('PROBABILIDADE', margin + 2, matrixY + matrixCellSize * 2.5, { angle: 90 });

  for (let pi = 0; pi < 5; pi++) {
    for (let ii = 0; ii < 5; ii++) {
      const score = (5 - pi) * (ii + 1);
      const cx = matrixX + ii * matrixCellSize;
      const cy = matrixY + pi * matrixCellSize;

      // Color
      let fillColor: [number, number, number];
      if (score >= 15) fillColor = [220, 53, 69]; // red
      else if (score >= 9) fillColor = [255, 152, 0]; // orange
      else if (score >= 4) fillColor = [255, 235, 59]; // yellow
      else fillColor = [76, 175, 80]; // green

      // Count risks in this cell
      const cellRisks = activeRisks.filter(r =>
        PROB_SCORE[r.probability] === (5 - pi) && IMP_SCORE[r.impact] === (ii + 1)
      );

      doc.setFillColor(...fillColor);
      doc.rect(cx, cy, matrixCellSize, matrixCellSize, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.rect(cx, cy, matrixCellSize, matrixCellSize, 'S');

      if (cellRisks.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${cellRisks.length}`, cx + matrixCellSize / 2, cy + matrixCellSize / 2 + 1.5, { align: 'center' });
      }
    }
  }

  // Impact labels at bottom
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  impKeys.forEach((k, i) => {
    doc.text(IMPACT_LABELS[k] || k, matrixX + i * matrixCellSize + matrixCellSize / 2, matrixY + 5 * matrixCellSize + 4, { align: 'center' });
  });
  doc.setFont('helvetica', 'bold');
  doc.text('IMPACTO', matrixX + 2.5 * matrixCellSize, matrixY + 5 * matrixCellSize + 9, { align: 'center' });

  // Prob labels on left
  probKeys.forEach((k, i) => {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(PROBABILITY_LABELS[k] || k, matrixX - 2, matrixY + i * matrixCellSize + matrixCellSize / 2 + 1, { align: 'right' });
  });

  y = matrixY + 5 * matrixCellSize + 14;

  // ── TOP 10 RISCOS ──
  addHeader('3. Top 10 Riscos Mais Críticos');

  const topRisks = [...activeRisks]
    .map(r => ({ ...r, rl: getRiskLevel(r.probability, r.impact), emv: calculateEMV(r.probability, r.monetary_impact || 0) }))
    .sort((a, b) => b.rl.score - a.rl.score)
    .slice(0, 10);

  topRisks.forEach((risk, i) => {
    checkPage(20);

    // Row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y - 3, contentW, 16, 'F');
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`${i + 1}. ${risk.title}`, margin + 2, y);
    y += 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    const details = [
      `Nível: ${risk.rl.level} (${risk.rl.score})`,
      `Categoria: ${CATEGORY_LABELS[risk.category] || risk.category}`,
      risk.emv > 0 ? `EMV: ${fmt(risk.emv)}` : '',
      risk.project_name ? `Projeto: ${risk.project_name}` : '',
    ].filter(Boolean).join(' | ');
    doc.text(details, margin + 4, y);
    y += 3.5;

    if (risk.mitigation_plan) {
      const mitText = `Mitigação: ${risk.mitigation_plan.substring(0, 150)}${risk.mitigation_plan.length > 150 ? '...' : ''}`;
      const lines = doc.splitTextToSize(mitText, contentW - 6);
      doc.text(lines, margin + 4, y);
      y += lines.length * 3 + 1;
    }

    y += 2;
  });

  // ── DISTRIBUIÇÃO POR CATEGORIA ──
  addHeader('4. Distribuição por Categoria');

  const catDist = activeRisks.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedCats = Object.entries(catDist).sort((a, b) => b[1] - a[1]);

  sortedCats.forEach(([cat, count]) => {
    checkPage(7);
    const pct = Math.round((count / activeRisks.length) * 100);
    const barW = (pct / 100) * (contentW - 50);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(CATEGORY_LABELS[cat] || cat, margin + 2, y);

    doc.setFillColor(30, 64, 120);
    doc.rect(margin + 35, y - 3, barW, 4, 'F');

    doc.setFontSize(7);
    doc.text(`${count} (${pct}%)`, margin + 37 + barW, y);
    y += 6;
  });

  y += 4;

  // ── RECOMENDAÇÕES ──
  addHeader('5. Recomendações');

  const recs: string[] = [];
  if (criticalCount > 0) recs.push(`Atenção imediata: ${criticalCount} risco(s) em nível CRÍTICO requerem ação prioritária.`);
  if (overdueCount > 0) recs.push(`Há ${overdueCount} risco(s) com prazo de mitigação vencido. Revisar cronogramas urgentemente.`);
  if (escalatedCount > 0) recs.push(`${escalatedCount} risco(s) foram escalados — acompanhar resolução com stakeholders.`);
  if (totalEMV > 0) recs.push(`Reserva de contingência sugerida: ${fmt(totalEMV)} (baseado no EMV determinístico). Recomenda-se simulação Monte Carlo para estimativa mais precisa.`);
  if (resolvedRisks.length > 0) {
    const withLessons = resolvedRisks.filter(r => r.metadata?.lessons_learned).length;
    if (withLessons < resolvedRisks.length) {
      recs.push(`Registrar lições aprendidas: ${resolvedRisks.length - withLessons} risco(s) resolvido(s) sem registro de lições.`);
    }
  }
  if (recs.length === 0) recs.push('Nenhuma ação urgente necessária. Continuar monitoramento regular.');

  recs.forEach((rec, i) => {
    addText(`${i + 1}. ${rec}`, { indent: 2 });
    y += 1;
  });

  // ── FOOTER on every page ──
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${p} de ${totalPages}`, pageW / 2, pageH - 8, { align: 'center' });
    doc.text('Relatório gerado automaticamente pelo GIRA', pageW / 2, pageH - 4, { align: 'center' });
  }

  doc.save(`relatorio-riscos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
