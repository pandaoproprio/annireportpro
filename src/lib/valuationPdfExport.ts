import jsPDF from 'jspdf';

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 25;
const MR = 25;
const MT = 30;
const MB = 25;
const CW = PAGE_W - ML - MR;
const MAX_Y = PAGE_H - MB;

interface PdfCtx {
  pdf: jsPDF;
  y: number;
}

function newPage(ctx: PdfCtx) {
  ctx.pdf.addPage();
  ctx.y = MT;
}

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > MAX_Y) newPage(ctx);
}

function addTitle(ctx: PdfCtx, text: string, fontSize = 22) {
  ensureSpace(ctx, 14);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(fontSize);
  ctx.pdf.setTextColor(17, 24, 39);
  const lines = ctx.pdf.splitTextToSize(text, CW);
  for (const line of lines) {
    ctx.pdf.text(line, PAGE_W / 2, ctx.y, { align: 'center' });
    ctx.y += fontSize * 0.45;
  }
  ctx.y += 4;
}

function addSectionTitle(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 14);
  ctx.y += 6;
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(13);
  ctx.pdf.setTextColor(30, 64, 175); // blue-800
  ctx.pdf.text(text, ML, ctx.y);
  ctx.y += 3;
  // underline
  ctx.pdf.setDrawColor(30, 64, 175);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.line(ML, ctx.y, ML + CW, ctx.y);
  ctx.y += 7;
}

function addSubtitle(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 10);
  ctx.y += 3;
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(11);
  ctx.pdf.setTextColor(55, 65, 81);
  ctx.pdf.text(text, ML, ctx.y);
  ctx.y += 6;
}

function addParagraph(ctx: PdfCtx, text: string, indent = 0) {
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(10);
  ctx.pdf.setTextColor(55, 65, 81);
  const lines = ctx.pdf.splitTextToSize(text, CW - indent);
  for (const line of lines) {
    ensureSpace(ctx, 5);
    ctx.pdf.text(line, ML + indent, ctx.y);
    ctx.y += 4.5;
  }
  ctx.y += 2;
}

function addBullet(ctx: PdfCtx, text: string) {
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(10);
  ctx.pdf.setTextColor(55, 65, 81);
  const bulletX = ML + 4;
  const textX = ML + 9;
  const lines = ctx.pdf.splitTextToSize(text, CW - 9);
  ensureSpace(ctx, lines.length * 4.5 + 2);
  ctx.pdf.text('•', bulletX, ctx.y);
  for (let i = 0; i < lines.length; i++) {
    ctx.pdf.text(lines[i], textX, ctx.y);
    ctx.y += 4.5;
  }
  ctx.y += 1;
}

function addBoldLine(ctx: PdfCtx, label: string, value: string) {
  ensureSpace(ctx, 6);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(10);
  ctx.pdf.setTextColor(55, 65, 81);
  const labelW = ctx.pdf.getTextWidth(label + ' ');
  ctx.pdf.text(label, ML + 4, ctx.y);
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.text(value, ML + 4 + labelW, ctx.y);
  ctx.y += 5;
}

function addTableRow(ctx: PdfCtx, cols: string[], widths: number[], isHeader = false) {
  ensureSpace(ctx, 8);
  const rowH = 7;
  if (isHeader) {
    ctx.pdf.setFillColor(30, 64, 175);
    ctx.pdf.rect(ML, ctx.y - 4.5, CW, rowH, 'F');
    ctx.pdf.setTextColor(255, 255, 255);
    ctx.pdf.setFont('helvetica', 'bold');
  } else {
    ctx.pdf.setFillColor(243, 244, 246);
    ctx.pdf.rect(ML, ctx.y - 4.5, CW, rowH, 'F');
    ctx.pdf.setTextColor(55, 65, 81);
    ctx.pdf.setFont('helvetica', 'normal');
  }
  ctx.pdf.setFontSize(9);
  let x = ML + 2;
  for (let i = 0; i < cols.length; i++) {
    ctx.pdf.text(cols[i], x, ctx.y);
    x += widths[i];
  }
  ctx.y += rowH;
}

function addHighlightBox(ctx: PdfCtx, text: string, value: string) {
  ensureSpace(ctx, 16);
  ctx.pdf.setFillColor(239, 246, 255); // blue-50
  ctx.pdf.roundedRect(ML, ctx.y - 2, CW, 14, 2, 2, 'F');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(55, 65, 81);
  ctx.pdf.text(text, ML + 4, ctx.y + 3);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(12);
  ctx.pdf.setTextColor(30, 64, 175);
  ctx.pdf.text(value, ML + 4, ctx.y + 9);
  ctx.y += 18;
}

function addPageFooters(ctx: PdfCtx) {
  const totalPages = (ctx.pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.pdf.setPage(i);
    ctx.pdf.setFontSize(8);
    ctx.pdf.setTextColor(156, 163, 175);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.text(
      `GIRA Diário de Bordo — Relatório de Valuation — Página ${i} de ${totalPages}`,
      PAGE_W / 2, PAGE_H - 10,
      { align: 'center' }
    );
    ctx.pdf.setDrawColor(209, 213, 219);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.line(ML, PAGE_H - 15, PAGE_W - MR, PAGE_H - 15);
  }
}

export function exportValuationToPdf() {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ctx: PdfCtx = { pdf, y: MT };

  // ═══ COVER PAGE ═══
  // Top accent bar
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, PAGE_W, 4, 'F');

  ctx.y = 55;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(30, 64, 175);
  pdf.text('RELATÓRIO DE VALUATION', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 12;

  pdf.setFontSize(28);
  pdf.setTextColor(17, 24, 39);
  pdf.text('GIRA', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 10;
  pdf.setFontSize(16);
  pdf.text('Diário de Bordo', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 16;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Análise Técnica, Financeira e de Mercado', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 8;
  pdf.text('Produto de Software para o Terceiro Setor', PAGE_W / 2, ctx.y, { align: 'center' });

  ctx.y += 30;
  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.5);
  pdf.line(ML + 30, ctx.y, PAGE_W - MR - 30, ctx.y);
  ctx.y += 15;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  pdf.text(`Data: ${today}`, PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 6;
  pdf.text('Documento Confidencial', PAGE_W / 2, ctx.y, { align: 'center' });

  // Bottom accent bar
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, PAGE_H - 4, PAGE_W, 4, 'F');

  // ═══ PAGE 2 — Executive Summary ═══
  newPage(ctx);
  addTitle(ctx, 'RESUMO EXECUTIVO', 18);
  ctx.y += 4;

  addHighlightBox(ctx, 'Custo estimado de desenvolvimento no mercado:', 'R$ 720.000 – R$ 1.080.000 (US$ 140.000 – US$ 210.000)');
  addHighlightBox(ctx, 'Valor da mão de obra do desenvolvedor solo:', 'R$ 450.000 – R$ 750.000');
  addHighlightBox(ctx, 'Valuation potencial como SaaS (10k usuários):', 'R$ 47.000.000 – R$ 95.000.000');

  addParagraph(ctx, 'O GIRA Diário de Bordo é uma plataforma SaaS de nível enterprise para gestão de projetos socioculturais, desenvolvida integralmente por um único engenheiro full-stack. Este relatório apresenta a análise técnica, financeira e de mercado do produto.');

  // ═══ SECTION 1 — Technical Analysis ═══
  newPage(ctx);
  addSectionTitle(ctx, '1. ANÁLISE TÉCNICA DO SISTEMA');

  addSubtitle(ctx, '1.1 Classificação');
  addBoldLine(ctx, 'Tipo:', 'SaaS B2B/B2G — Gestão de projetos socioculturais com prestação de contas');
  addBoldLine(ctx, 'Complexidade:', 'Alta (Enterprise-grade)');
  addBoldLine(ctx, 'Funcionalidades:', '85–100 módulos estimados');
  addBoldLine(ctx, 'Telas:', '35–40 interfaces');
  ctx.y += 4;

  addSubtitle(ctx, '1.2 Arquitetura');
  addBullet(ctx, 'Frontend: React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI');
  addBullet(ctx, 'Backend: Supabase (PostgreSQL, Auth, Edge Functions, Storage, RLS)');
  addBullet(ctx, 'Autenticação: MFA com TOTP, RBAC granular (7 papéis, 26 permissões)');
  addBullet(ctx, 'Exportação: Motor nativo jsPDF com formatação ABNT + DOCX via docx.js');
  addBullet(ctx, 'PWA: Service Worker, cache offline, instalação nativa');
  addBullet(ctx, 'Integrações: Asana API, IA generativa para narrativas');
  ctx.y += 4;

  addSubtitle(ctx, '1.3 Diferenciais Técnicos');
  addBullet(ctx, 'RBAC com 7 papéis hierárquicos e 26 permissões granulares');
  addBullet(ctx, 'Trilha de auditoria completa (audit_logs + system_logs)');
  addBullet(ctx, 'Editor WYSIWYG customizado com TipTap e blocos drag-and-drop');
  addBullet(ctx, 'Motor de PDF ABNT com justificação manual de texto');
  addBullet(ctx, 'SLA tracking com alertas configuráveis');
  addBullet(ctx, 'Sistema de templates de relatórios reutilizáveis');

  // ═══ SECTION 2 — Market Development Cost ═══
  newPage(ctx);
  addSectionTitle(ctx, '2. CUSTO DE DESENVOLVIMENTO NO MERCADO');

  addSubtitle(ctx, '2.1 Estimativa por Tipo de Contratação');

  const colWidths = [50, 40, 35, 35];
  addTableRow(ctx, ['Modalidade', 'Faixa (R$)', 'Faixa (US$)', 'Prazo'], colWidths, true);
  addTableRow(ctx, ['Agência de Software', '720k – 1.08M', '140k – 210k', '12–18 meses'], colWidths);
  addTableRow(ctx, ['Startup (equipe interna)', '540k – 780k', '105k – 150k', '10–14 meses'], colWidths);
  addTableRow(ctx, ['Freelancers', '360k – 540k', '70k – 105k', '14–20 meses'], colWidths);
  ctx.y += 6;

  addSubtitle(ctx, '2.2 Breakdown por Disciplina');
  const colWidths2 = [55, 20, 40, 45];
  addTableRow(ctx, ['Disciplina', 'Horas', 'Custo (R$)', 'Observação'], colWidths2, true);
  addTableRow(ctx, ['UX/UI Design', '300–400', '75k – 120k', '35-40 telas + Design System'], colWidths2);
  addTableRow(ctx, ['Frontend React', '800–1000', '200k – 300k', 'Componentes + Editor + Charts'], colWidths2);
  addTableRow(ctx, ['Backend/DB', '500–700', '125k – 210k', 'RLS + Edge Functions + Auth'], colWidths2);
  addTableRow(ctx, ['PDF/DOCX Engine', '200–300', '50k – 90k', 'Motor ABNT customizado'], colWidths2);
  addTableRow(ctx, ['Integrações', '150–200', '37k – 60k', 'Asana, IA, Push, PWA'], colWidths2);
  addTableRow(ctx, ['Testes + QA', '300–400', '75k – 120k', 'Unitários + E2E + UAT'], colWidths2);
  addTableRow(ctx, ['DevOps/Infra', '150–200', '37k – 60k', 'CI/CD + Monitoring + PWA'], colWidths2);

  // ═══ SECTION 3 — Labor Value ═══
  newPage(ctx);
  addSectionTitle(ctx, '3. VALOR DA MÃO DE OBRA');

  addSubtitle(ctx, '3.1 Estimativa de Horas');
  addBoldLine(ctx, 'Horas estimadas:', '2.800 – 3.500 horas de engenharia');
  addBoldLine(ctx, 'Equivalente a:', '16–20 meses de trabalho full-time');
  ctx.y += 4;

  addSubtitle(ctx, '3.2 Valor de Mercado da Engenharia');
  const colWidths3 = [50, 35, 40, 35];
  addTableRow(ctx, ['Nível', 'Hora (R$)', 'Total (R$)', 'Total (US$)'], colWidths3, true);
  addTableRow(ctx, ['Pleno', 'R$ 120–150', '336k – 525k', '65k – 102k'], colWidths3);
  addTableRow(ctx, ['Sênior', 'R$ 150–200', '420k – 700k', '82k – 136k'], colWidths3);
  addTableRow(ctx, ['Especialista', 'R$ 200–250', '560k – 875k', '109k – 170k'], colWidths3);
  ctx.y += 6;

  addHighlightBox(ctx, 'Valor da contribuição técnica (nível sênior):', 'R$ 450.000 – R$ 750.000');

  addParagraph(ctx, 'O desenvolvimento solo demonstra domínio em múltiplas disciplinas (full-stack, design, DevOps, segurança), representando uma economia de 60–70% em relação à contratação de equipe especializada.');

  // ═══ SECTION 4 — Market Comparison ═══
  newPage(ctx);
  addSectionTitle(ctx, '4. COMPARAÇÃO COM O MERCADO');

  addSubtitle(ctx, '4.1 Softwares Similares');
  const colWidths4 = [40, 30, 45, 45];
  addTableRow(ctx, ['Software', 'Valuation', 'Custo Dev.', 'Diferencial GIRA'], colWidths4, true);
  addTableRow(ctx, ['Monday.com', 'US$ 7.6B', 'US$ 50M+', 'Nicho especializado'], colWidths4);
  addTableRow(ctx, ['Asana', 'US$ 4.4B', 'US$ 30M+', 'Relatórios ABNT'], colWidths4);
  addTableRow(ctx, ['Notion', 'US$ 10B', 'US$ 40M+', 'Auditabilidade'], colWidths4);
  addTableRow(ctx, ['Prosas', '~R$ 50M', '~R$ 5M', 'Diário de bordo'], colWidths4);
  addTableRow(ctx, ['Bússola Social', '~R$ 20M', '~R$ 3M', 'Export PDF/DOCX'], colWidths4);
  ctx.y += 6;

  addSubtitle(ctx, '4.2 Vantagens Competitivas do GIRA');
  addBullet(ctx, 'Único sistema integrado que combina diário de campo + relatórios formais + prestação de contas');
  addBullet(ctx, 'Motor de exportação nativo em padrão ABNT (inexistente em concorrentes globais)');
  addBullet(ctx, 'RBAC granular com 7 papéis desenhados para a realidade do terceiro setor');
  addBullet(ctx, 'Trilha de auditoria completa com logs de sistema — compliance-ready');

  // ═══ SECTION 5 — Technology Value ═══
  addSectionTitle(ctx, '5. VALOR TECNOLÓGICO');

  addBoldLine(ctx, 'Nível de engenharia:', 'Avançado / Enterprise-grade');
  addBoldLine(ctx, 'Classificação de complexidade:', 'Alta');
  addBoldLine(ctx, 'Propriedade Intelectual:', 'Código-fonte proprietário de autoria única');
  ctx.y += 4;

  addParagraph(ctx, 'O sistema constitui propriedade intelectual significativa, com algoritmos proprietários de justificação de texto, motor de renderização PDF multi-página e sistema de permissões granular. O código-fonte, desenvolvido por autoria única e documentado, tem valor tanto como produto quanto como ativo tecnológico licenciável.');

  // ═══ SECTION 6 — Potential Value ═══
  newPage(ctx);
  addSectionTitle(ctx, '6. VALOR POTENCIAL DO PRODUTO');

  addSubtitle(ctx, '6.1 Valuation por Estágio');
  const colWidths5 = [50, 55, 55];
  addTableRow(ctx, ['Estágio', 'Valuation (R$)', 'Valuation (US$)'], colWidths5, true);
  addTableRow(ctx, ['Pre-seed (MVP atual)', '2M – 4M', '390k – 780k'], colWidths5);
  addTableRow(ctx, ['Seed (1.000 usuários)', '5M – 12M', '970k – 2.3M'], colWidths5);
  addTableRow(ctx, ['Series A (10.000 users)', '47M – 95M', '9.1M – 18.4M'], colWidths5);
  addTableRow(ctx, ['Growth (100.000 users)', '200M – 500M', '39M – 97M'], colWidths5);
  ctx.y += 6;

  addSubtitle(ctx, '6.2 Projeção de Receita SaaS');
  const colWidths6 = [40, 30, 30, 30, 30];
  addTableRow(ctx, ['Plano', 'Preço/mês', '1k users', '10k users', '100k users'], colWidths6, true);
  addTableRow(ctx, ['Basic', 'R$ 99', 'R$ 99k/m', 'R$ 990k/m', 'R$ 9.9M/m'], colWidths6);
  addTableRow(ctx, ['Pro', 'R$ 249', 'R$ 249k/m', 'R$ 2.49M/m', 'R$ 24.9M/m'], colWidths6);
  addTableRow(ctx, ['Enterprise', 'R$ 499', 'R$ 499k/m', 'R$ 4.99M/m', 'R$ 49.9M/m'], colWidths6);
  ctx.y += 6;

  addParagraph(ctx, 'A projeção assume distribuição de 60% Basic / 30% Pro / 10% Enterprise. O ARR projetado com 10.000 usuários seria de R$ 23,7M – R$ 47,4M, justificando um múltiplo de 2–4x sobre o ARR para valuation.');

  // ═══ SECTION 7 — Conclusion ═══
  newPage(ctx);
  addSectionTitle(ctx, '7. CONCLUSÃO');

  addParagraph(ctx, 'O GIRA Diário de Bordo representa um feito técnico significativo: um sistema enterprise-grade desenvolvido integralmente por um único engenheiro, com complexidade e abrangência que rivalizam com produtos construídos por equipes de 10–20 pessoas.');
  ctx.y += 2;

  addSubtitle(ctx, 'Principais Conclusões');
  addBullet(ctx, 'Custo de replicação no mercado: R$ 720.000 – R$ 1.080.000');
  addBullet(ctx, 'Valor da engenharia aplicada: R$ 450.000 – R$ 750.000');
  addBullet(ctx, 'Valuation potencial (seed): R$ 5.000.000 – R$ 12.000.000');
  addBullet(ctx, 'O desenvolvimento solo economizou 60–70% do custo de mercado, demonstrando competência multidisciplinar excepcional');
  ctx.y += 6;

  addParagraph(ctx, 'A construção deste sistema por uma única pessoa não é apenas uma economia de custos — é uma demonstração de capacidade arquitetural, visão de produto e execução técnica que agrega valor direto ao ativo e ao profissional por trás dele.');

  ctx.y += 10;
  ensureSpace(ctx, 20);
  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.5);
  pdf.line(ML + 30, ctx.y, PAGE_W - MR - 30, ctx.y);
  ctx.y += 8;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(156, 163, 175);
  pdf.text('Este documento é confidencial e destinado exclusivamente para fins de avaliação.', PAGE_W / 2, ctx.y, { align: 'center' });

  // ── Footer on all pages ──
  addPageFooters(ctx);

  // ── Save ──
  const filename = `GIRA_Valuation_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
