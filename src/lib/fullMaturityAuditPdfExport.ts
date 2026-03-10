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
  tocEntries: { title: string; page: number }[];
}

function newPage(ctx: PdfCtx) {
  ctx.pdf.addPage();
  ctx.y = MT;
}

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y + needed > MAX_Y) newPage(ctx);
}

function getCurrentPage(ctx: PdfCtx): number {
  return (ctx.pdf as any).internal.getNumberOfPages();
}

function addSectionTitle(ctx: PdfCtx, text: string, addToToc = true) {
  ensureSpace(ctx, 16);
  ctx.y += 8;
  if (addToToc) {
    ctx.tocEntries.push({ title: text, page: getCurrentPage(ctx) });
  }
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(14);
  ctx.pdf.setTextColor(30, 58, 138); // blue-900
  ctx.pdf.text(text, ML, ctx.y);
  ctx.y += 3;
  ctx.pdf.setDrawColor(30, 58, 138);
  ctx.pdf.setLineWidth(0.6);
  ctx.pdf.line(ML, ctx.y, ML + CW, ctx.y);
  ctx.y += 8;
}

function addSubtitle(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 12);
  ctx.y += 4;
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(11);
  ctx.pdf.setTextColor(31, 41, 55);
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
    ctx.y += 4.8;
  }
  ctx.y += 2;
}

function addBullet(ctx: PdfCtx, text: string) {
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(10);
  ctx.pdf.setTextColor(55, 65, 81);
  const textX = ML + 9;
  const lines = ctx.pdf.splitTextToSize(text, CW - 9);
  ensureSpace(ctx, lines.length * 4.8 + 2);
  ctx.pdf.text('•', ML + 4, ctx.y);
  for (let i = 0; i < lines.length; i++) {
    ctx.pdf.text(lines[i], textX, ctx.y);
    ctx.y += 4.8;
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
  const valueLines = ctx.pdf.splitTextToSize(value, CW - 4 - labelW);
  for (let i = 0; i < valueLines.length; i++) {
    ctx.pdf.text(valueLines[i], ML + 4 + (i === 0 ? labelW : 0), ctx.y);
    ctx.y += 5;
  }
}

function addTableRow(ctx: PdfCtx, cols: string[], widths: number[], isHeader = false, zebraIndex = -1) {
  ensureSpace(ctx, 8);
  const rowH = 7;
  if (isHeader) {
    ctx.pdf.setFillColor(30, 58, 138);
    ctx.pdf.rect(ML, ctx.y - 4.5, CW, rowH, 'F');
    ctx.pdf.setTextColor(255, 255, 255);
    ctx.pdf.setFont('helvetica', 'bold');
  } else {
    if (zebraIndex % 2 === 0) {
      ctx.pdf.setFillColor(239, 246, 255); // blue-50
    } else {
      ctx.pdf.setFillColor(255, 255, 255);
    }
    ctx.pdf.rect(ML, ctx.y - 4.5, CW, rowH, 'F');
    ctx.pdf.setTextColor(55, 65, 81);
    ctx.pdf.setFont('helvetica', 'normal');
  }
  ctx.pdf.setFontSize(9);
  let x = ML + 2;
  for (let i = 0; i < cols.length; i++) {
    const cellText = ctx.pdf.splitTextToSize(cols[i], widths[i] - 4);
    ctx.pdf.text(cellText[0] || '', x, ctx.y);
    x += widths[i];
  }
  ctx.y += rowH;
}

function addHighlightBox(ctx: PdfCtx, text: string, value: string) {
  ensureSpace(ctx, 18);
  ctx.pdf.setFillColor(239, 246, 255);
  ctx.pdf.setDrawColor(30, 58, 138);
  ctx.pdf.setLineWidth(0.3);
  ctx.pdf.roundedRect(ML, ctx.y - 2, CW, 16, 2, 2, 'FD');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(55, 65, 81);
  ctx.pdf.text(text, ML + 4, ctx.y + 3);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(12);
  ctx.pdf.setTextColor(30, 58, 138);
  ctx.pdf.text(value, ML + 4, ctx.y + 10);
  ctx.y += 20;
}

function addScoreBar(ctx: PdfCtx, label: string, score: number, maxScore: number) {
  ensureSpace(ctx, 12);
  const barW = 80;
  const barH = 5;
  const barX = ML + 55;
  const pct = score / maxScore;

  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(55, 65, 81);
  ctx.pdf.text(label, ML + 4, ctx.y + 3);

  ctx.pdf.setFillColor(229, 231, 235);
  ctx.pdf.roundedRect(barX, ctx.y, barW, barH, 1, 1, 'F');

  const color = pct >= 0.6 ? [30, 58, 138] : pct >= 0.4 ? [245, 158, 11] : [239, 68, 68];
  ctx.pdf.setFillColor(color[0], color[1], color[2]);
  ctx.pdf.roundedRect(barX, ctx.y, barW * pct, barH, 1, 1, 'F');

  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(color[0], color[1], color[2]);
  ctx.pdf.text(`${score}/${maxScore}`, barX + barW + 4, ctx.y + 3.5);

  ctx.y += 9;
}

function addPageFooters(ctx: PdfCtx) {
  const totalPages = (ctx.pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.pdf.setPage(i);
    if (i <= 2) continue;
    ctx.pdf.setFontSize(8);
    ctx.pdf.setTextColor(156, 163, 175);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.text(
      `GIRA — Auditoria Completa de Maturidade — Página ${i - 2} de ${totalPages - 2}`,
      PAGE_W / 2, PAGE_H - 10, { align: 'center' }
    );
    ctx.pdf.setDrawColor(209, 213, 219);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.line(ML, PAGE_H - 15, PAGE_W - MR, PAGE_H - 15);
  }
}

function renderTocPage(ctx: PdfCtx) {
  ctx.pdf.setPage(2);
  let y = MT;

  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(18);
  ctx.pdf.setTextColor(30, 58, 138);
  ctx.pdf.text('SUMÁRIO', PAGE_W / 2, y, { align: 'center' });
  y += 16;

  ctx.pdf.setDrawColor(30, 58, 138);
  ctx.pdf.setLineWidth(0.4);
  ctx.pdf.line(ML, y, ML + CW, y);
  y += 10;

  for (const entry of ctx.tocEntries) {
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(11);
    ctx.pdf.setTextColor(55, 65, 81);
    ctx.pdf.text(entry.title, ML, y);

    const pageLabel = `${entry.page - 2}`;
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setTextColor(30, 58, 138);
    ctx.pdf.text(pageLabel, PAGE_W - MR, y, { align: 'right' });

    const titleW = ctx.pdf.getTextWidth(entry.title);
    const pageNumW = ctx.pdf.getTextWidth(pageLabel);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(9);
    ctx.pdf.setTextColor(180, 180, 180);
    const dotsStart = ML + titleW + 3;
    const dotsEnd = PAGE_W - MR - pageNumW - 3;
    let dx = dotsStart;
    while (dx < dotsEnd) {
      ctx.pdf.text('.', dx, y);
      dx += 2;
    }

    y += 8;
  }
}

export function exportFullMaturityAuditToPdf() {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ctx: PdfCtx = { pdf, y: MT, tocEntries: [] };
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  // ═══ COVER PAGE ═══
  pdf.setFillColor(30, 58, 138);
  pdf.rect(0, 0, PAGE_W, 6, 'F');

  ctx.y = 50;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(30, 58, 138);
  pdf.text('AUDITORIA COMPLETA DE MATURIDADE', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 5;
  pdf.text('PMBOK • ÁGIL • SISTEMA COGNITIVO AUTÔNOMO', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 18;

  pdf.setFontSize(32);
  pdf.setTextColor(17, 24, 39);
  pdf.text('GIRA', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 12;
  pdf.setFontSize(16);
  pdf.text('Diário de Bordo', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 14;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Diagnóstico Técnico de Maturidade Organizacional e Tecnológica', PAGE_W / 2, ctx.y, { align: 'center' });

  ctx.y += 30;
  pdf.setDrawColor(30, 58, 138);
  pdf.setLineWidth(0.6);
  pdf.line(ML + 30, ctx.y, PAGE_W - MR - 30, ctx.y);
  ctx.y += 16;

  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(ML + 15, ctx.y - 4, CW - 30, 44, 3, 3, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(55, 65, 81);
  pdf.text(`Data: ${today}`, PAGE_W / 2, ctx.y + 4, { align: 'center' });
  pdf.text('Classificação: Confidencial', PAGE_W / 2, ctx.y + 12, { align: 'center' });
  pdf.text('Maturidade Geral: 2.4/5 — Estruturado', PAGE_W / 2, ctx.y + 20, { align: 'center' });
  pdf.text('PMBOK: 2.0 | Ágil: 2.5 | Cognitivo: 2.2 | Automação: 2.3', PAGE_W / 2, ctx.y + 28, { align: 'center' });
  pdf.text('Powered by AnnITech', PAGE_W / 2, ctx.y + 36, { align: 'center' });

  pdf.setFillColor(30, 58, 138);
  pdf.rect(0, PAGE_H - 6, PAGE_W, 6, 'F');

  // ═══ TOC PAGE ═══
  newPage(ctx);

  // ═══ ETAPA 1 — PMBOK ═══
  newPage(ctx);
  addSectionTitle(ctx, '1. ADERÊNCIA AO PMBOK');

  addParagraph(ctx, 'Avaliação de aderência às 10 áreas de conhecimento do PMBOK (Project Management Body of Knowledge), identificando funcionalidades existentes e lacunas no sistema GIRA.');

  addSubtitle(ctx, 'Matriz de Aderência por Área');
  const wp = [45, 50, 30, 35];
  addTableRow(ctx, ['Área', 'Status', 'Nível', 'Score'], wp, true);
  const pmbokData = [
    ['Integração', 'Projetos com metadados completos, workflows', 'Parcial', '3/5'],
    ['Escopo', 'Goals JSON, goal_id em atividades', 'Implementado', '3/5'],
    ['Cronograma', 'start/end_date, SLA tracking', 'Parcial', '2/5'],
    ['Custos', 'expense_records, cost_evidence', 'Básico', '1/5'],
    ['Qualidade', 'Workflow revisão, performance tracking', 'Parcial', '3/5'],
    ['Recursos', 'team_members, 7 roles, 30+ perms', 'Implementado', '3/5'],
    ['Comunicação', 'Notificações, emails, digest', 'Parcial', '2/5'],
    ['Riscos', 'SLA alertas, WIP alerts', 'Básico', '1/5'],
    ['Aquisições', 'Nenhum módulo', 'Inexistente', '0/5'],
    ['Partes Interessadas', 'Funder, org, equipe registrados', 'Parcial', '2/5'],
  ];
  pmbokData.forEach((row, i) => addTableRow(ctx, row, wp, false, i));
  ctx.y += 4;

  addHighlightBox(ctx, 'Nível de Aderência PMBOK:', '2.0 / 5 — Estruturado');

  addSubtitle(ctx, 'Funcionalidades PMBOK Existentes');
  addBullet(ctx, 'Planejamento: Projetos com escopo, metas, equipe, cronograma e financiador');
  addBullet(ctx, 'Monitoramento: Dashboard analítico com gráficos de execução por mês, tipo e meta');
  addBullet(ctx, 'Evidências: Fotos, listas de presença, despesas e anexos por atividade');
  addBullet(ctx, 'Entregas: Relatórios do Objeto, Equipe e Justificativa com workflow de aprovação');
  addBullet(ctx, 'Indicadores: Lead time, cycle time, taxa de rejeição, conformidade SLA');

  addSubtitle(ctx, 'Lacunas Críticas');
  addBullet(ctx, 'Sem gestão formal de riscos (matriz probabilidade × impacto)');
  addBullet(ctx, 'Sem cronograma avançado (Gantt, dependências, caminho crítico)');
  addBullet(ctx, 'Sem gestão de custos consolidada (orçamento × executado)');
  addBullet(ctx, 'Sem módulo de aquisições/contratos');

  // ═══ ETAPA 2 — ÁGIL ═══
  newPage(ctx);
  addSectionTitle(ctx, '2. ADERÊNCIA ÀS METODOLOGIAS ÁGEIS');

  addParagraph(ctx, 'Avaliação de práticas ágeis (Scrum, Kanban, Lean) presentes no sistema GIRA, com foco em gestão iterativa, visualização de fluxo e feedback contínuo.');

  addSubtitle(ctx, 'Matriz de Práticas Ágeis');
  const wa = [50, 55, 55];
  addTableRow(ctx, ['Prática', 'Status', 'Evidência'], wa, true);
  const agileData = [
    ['Board Kanban', '✅ Implementado', 'dnd-kit, 3 colunas, filtros'],
    ['Gestão Visual', '✅ Implementado', 'StatusBadge, SlaBadge, chips'],
    ['Ciclos Curtos', '⚠️ Parcial', 'Períodos em relatórios, sem sprints'],
    ['Backlog', '⚠️ Parcial', 'Rascunhos como backlog implícito'],
    ['WIP Limits', '✅ Implementado', 'Configurável + WipAlertBanner'],
    ['Feedback', '✅ Parcial', 'Workflow devoluções + notificações'],
    ['Métricas Ágeis', '✅ Implementado', 'Lead time, cycle time, snapshots'],
    ['Adaptação', '⚠️ Parcial', 'SLA/WIP configuráveis'],
    ['CI/CD', '❌ Inexistente', 'Sem pipeline automatizado'],
    ['Retrospectiva', '❌ Inexistente', 'Sem lições aprendidas'],
  ];
  agileData.forEach((row, i) => addTableRow(ctx, row, wa, false, i));
  ctx.y += 4;

  addHighlightBox(ctx, 'Nível de Maturidade Ágil:', '2.5 / 5 — Estruturado com Elementos Gerenciados');

  addSubtitle(ctx, 'Pontos Fortes');
  addBullet(ctx, 'Kanban visual com drag-and-drop e transições automáticas de status');
  addBullet(ctx, 'WIP limits configuráveis com alertas visuais proativos');
  addBullet(ctx, 'Métricas de fluxo (lead/cycle time) calculadas automaticamente');
  addBullet(ctx, 'Snapshots mensais de performance para análise de tendências');

  addSubtitle(ctx, 'Melhorias para Nível 3+');
  addBullet(ctx, 'Sprints formais com velocity tracking e burndown charts');
  addBullet(ctx, 'Retrospectivas com registro de lições aprendidas');
  addBullet(ctx, 'Story points e priorização formal de backlog');
  addBullet(ctx, 'Pipeline CI/CD com testes automatizados');

  // ═══ ETAPA 3 — COGNITIVO ═══
  newPage(ctx);
  addSectionTitle(ctx, '3. CAPACIDADE COGNITIVA DO SISTEMA');

  addParagraph(ctx, 'Avaliação das características de sistema cognitivo autônomo: capacidade de perceber, interpretar, analisar, decidir, agir e aprender de forma autônoma.');

  addSubtitle(ctx, 'Pirâmide Cognitiva');
  const wc = [40, 25, 95];
  addTableRow(ctx, ['Camada', 'Nível', 'Status'], wc, true);
  const cogData = [
    ['Percepção', '2/5', 'SLA, inatividade, WIP — tudo client-side'],
    ['Interpretação', '3/5', 'IA classifica atividades, OCR presença, narrativas CEAP'],
    ['Análise', '2/5', 'Resumo executivo IA sob demanda, métricas calculadas'],
    ['Decisão', '2/5', 'Auto-assign revisor, SLA trigger, fill setor'],
    ['Ação', '2/5', 'Emails workflow, Asana sync, narrativas automáticas'],
    ['Aprendizado', '1/5', 'Dados históricos existem, sem uso preditivo'],
  ];
  cogData.forEach((row, i) => addTableRow(ctx, row, wc, false, i));
  ctx.y += 4;

  addHighlightBox(ctx, 'Nível Cognitivo:', '2.2 / 5 — Assistido');

  addSubtitle(ctx, 'O que o Sistema já Percebe');
  addBullet(ctx, 'SLA vencido/em atenção (trigger SQL + banners)');
  addBullet(ctx, 'Inatividade no diário (7+ dias sem atividades)');
  addBullet(ctx, 'Excesso de WIP (rascunhos acima do limite)');
  addBullet(ctx, 'Novas respostas de formulário (Realtime subscription)');
  addBullet(ctx, 'Rascunhos estagnados (threshold configurável)');

  addSubtitle(ctx, 'O que o Sistema já Decide');
  addBullet(ctx, 'Auto-atribui revisor quando relatório entra em revisão');
  addBullet(ctx, 'Calcula status SLA automaticamente (no_prazo → atenção → atrasado → bloqueado)');
  addBullet(ctx, 'Classifica tipo de atividade via IA generativa');
  addBullet(ctx, 'Preenche setor responsável baseado no role do usuário');

  addSubtitle(ctx, 'Lacunas Cognitivas');
  addBullet(ctx, 'Toda percepção depende do usuário estar logado (exceto triggers SQL)');
  addBullet(ctx, 'Sem análise preditiva ou detecção de anomalias');
  addBullet(ctx, 'Sem feedback loop — IA não aprende com uso');
  addBullet(ctx, 'Sem ajuste automático de thresholds baseado em histórico');

  // ═══ ETAPA 4 — AUTOMAÇÃO ═══
  newPage(ctx);
  addSectionTitle(ctx, '4. CAMADA DE AUTOMAÇÃO');

  addParagraph(ctx, 'Avaliação da infraestrutura de automação do sistema: triggers, jobs agendados, edge functions e capacidade de execução autônoma.');

  addSubtitle(ctx, 'Inventário de Automações');
  const wau = [55, 105];
  addTableRow(ctx, ['Componente', 'Detalhes'], wau, true);
  const autoData = [
    ['Triggers SQL (6)', 'update_sla_status, fill_setor, track_publication, handle_new_user, auto_assign_reviewer, notify_workflow'],
    ['Edge Functions (12)', 'IA, OCR, emails, digest, snapshot, monitor, admin, Asana, PDF'],
    ['Cron Jobs (2)', 'Weekly digest (seg 08h UTC), Monthly snapshot (dia 1, 06h UTC)'],
    ['Realtime', 'postgres_changes para formulários e workflows'],
    ['Integração Externa', 'Asana: criar tarefas + sync status automaticamente'],
  ];
  autoData.forEach((row, i) => addTableRow(ctx, row, wau, false, i));
  ctx.y += 4;

  addSubtitle(ctx, 'O que NÃO Existe');
  addBullet(ctx, 'Event queue (pg_boss, Bull) para processamento assíncrono');
  addBullet(ctx, 'Workflow engine para encadear ações automaticamente');
  addBullet(ctx, 'Webhooks para integração bidirecional com sistemas externos');
  addBullet(ctx, 'Orquestrador central de automações com prioridades');

  addHighlightBox(ctx, 'Nível de Automação:', '2.3 / 5 — Estruturado');

  // ═══ ETAPA 5 — INTELIGÊNCIA ANALÍTICA ═══
  newPage(ctx);
  addSectionTitle(ctx, '5. INTELIGÊNCIA ANALÍTICA');

  addParagraph(ctx, 'Avaliação das capacidades de analytics, detecção de padrões e geração de insights do sistema.');

  addSubtitle(ctx, 'Capacidades Analíticas');
  addScoreBar(ctx, 'Dashboards', 4, 5);
  addScoreBar(ctx, 'KPIs/Métricas', 4, 5);
  addScoreBar(ctx, 'Resumo IA', 3, 5);
  addScoreBar(ctx, 'Snapshots Históricos', 3, 5);
  addScoreBar(ctx, 'Detecção de Padrões', 0, 5);
  addScoreBar(ctx, 'Análise Preditiva', 0, 5);
  addScoreBar(ctx, 'Benchmarking', 0, 5);
  addScoreBar(ctx, 'Recomendações', 1, 5);
  ctx.y += 4;

  addHighlightBox(ctx, 'Nível de Inteligência Analítica:', '2.0 / 5 — Estruturado');

  addSubtitle(ctx, 'Funcionalidades Existentes');
  addBullet(ctx, 'Gráficos: atividades por mês, por tipo, por meta, contribuição de equipe');
  addBullet(ctx, 'KPIs: lead time, cycle time, taxa de rejeição, conformidade SLA');
  addBullet(ctx, 'Resumo executivo com IA (Gemini) sob demanda');
  addBullet(ctx, 'Snapshots mensais automáticos de performance por projeto');

  addSubtitle(ctx, 'Funcionalidades Ausentes');
  addBullet(ctx, 'Detecção de padrões (clustering, análise de comportamento)');
  addBullet(ctx, 'Análise preditiva (projeção de prazos, riscos)');
  addBullet(ctx, 'Benchmarking entre projetos');
  addBullet(ctx, 'Recomendações acionáveis automáticas');

  // ═══ ETAPA 6 — GOVERNANÇA ═══
  newPage(ctx);
  addSectionTitle(ctx, '6. GOVERNANÇA E CONTROLE');

  addSubtitle(ctx, 'Scorecard de Governança');
  addScoreBar(ctx, 'Auditoria de Ações', 4, 5);
  addScoreBar(ctx, 'Controle de Acesso (RBAC)', 5, 5);
  addScoreBar(ctx, 'Proteção de Dados (RLS)', 4, 5);
  addScoreBar(ctx, 'Imutabilidade de Logs', 4, 5);
  addScoreBar(ctx, 'Conformidade LGPD', 3, 5);
  addScoreBar(ctx, 'Visibilidade Hierárquica', 4, 5);
  ctx.y += 4;

  addHighlightBox(ctx, 'Nível de Governança:', '3.2 / 5 — Gerenciado');

  addSubtitle(ctx, 'Pontos Fortes');
  addBullet(ctx, '7 papéis hierárquicos com 30+ permissões granulares em tabela separada');
  addBullet(ctx, 'RLS policies em todas as tabelas críticas com SECURITY DEFINER');
  addBullet(ctx, 'Logs imutáveis (audit_logs + system_logs) com dados old/new');
  addBullet(ctx, 'Visibilidade hierárquica: SuperAdmin vê tudo, Admin vê subordinados');

  addSubtitle(ctx, 'Lacunas');
  addBullet(ctx, 'Sem logs dedicados para decisões automáticas do sistema');
  addBullet(ctx, 'Sem dashboard de auditoria focado em automações');
  addBullet(ctx, 'Sem rollback de decisões automáticas');

  // ═══ ETAPA 7 — MATRIZ DE MATURIDADE ═══
  newPage(ctx);
  addSectionTitle(ctx, '7. MATRIZ CONSOLIDADA DE MATURIDADE');

  addParagraph(ctx, 'Visão integrada do nível de maturidade do sistema GIRA em todas as dimensões avaliadas:');

  addSubtitle(ctx, 'Scores por Dimensão');
  addScoreBar(ctx, 'PMBOK', 2.0, 5);
  addScoreBar(ctx, 'Metodologias Ágeis', 2.5, 5);
  addScoreBar(ctx, 'Capacidade Cognitiva', 2.2, 5);
  addScoreBar(ctx, 'Automação', 2.3, 5);
  addScoreBar(ctx, 'Inteligência Analítica', 2.0, 5);
  addScoreBar(ctx, 'Governança', 3.2, 5);
  ctx.y += 6;

  addHighlightBox(ctx, 'MATURIDADE GERAL:', '2.4 / 5 — ESTRUTURADO');

  addSubtitle(ctx, 'Escala de Referência');
  const wm = [30, 45, 85];
  addTableRow(ctx, ['Nível', 'Classificação', 'Descrição'], wm, true);
  addTableRow(ctx, ['1', 'Básico', 'Operações manuais, sem padronização'], wm, false, 0);
  addTableRow(ctx, ['2', 'Estruturado', 'Processos definidos, ferramentas implementadas'], wm, false, 1);
  addTableRow(ctx, ['3', 'Gerenciado', 'Métricas, automações, controle proativo'], wm, false, 2);
  addTableRow(ctx, ['4', 'Integrado', 'IA preditiva, orquestração, benchmarking'], wm, false, 3);
  addTableRow(ctx, ['5', 'Autônomo', 'Auto-aprendizado, auto-ajuste, auto-remediação'], wm, false, 4);
  ctx.y += 6;

  addSubtitle(ctx, 'Posição Atual na Jornada');
  addParagraph(ctx, 'O GIRA encontra-se no Nível 2 (Estruturado) com elementos do Nível 3 em Governança. O sistema possui fundações técnicas sólidas — triggers, edge functions, métricas, RBAC — que podem ser alavancadas para avançar rapidamente ao Nível 3.');

  // ═══ RECOMENDAÇÕES ═══
  newPage(ctx);
  addSectionTitle(ctx, '8. RECOMENDAÇÕES ESTRATÉGICAS');

  addSubtitle(ctx, 'Para Nível 3 — Gerenciado');
  addBoldLine(ctx, '1.', 'Módulo de Gestão de Riscos — Registro, classificação e monitoramento de riscos por projeto');
  addBoldLine(ctx, '2.', 'Sprints & Velocity — Ciclos formais com tracking de velocidade e burndown');
  addBoldLine(ctx, '3.', 'Análise Proativa — Cron jobs executando resumos IA automaticamente');
  addBoldLine(ctx, '4.', 'Orquestração de Workflows — Engine que encadeia ações automaticamente');
  addBoldLine(ctx, '5.', 'Custos Consolidados — Dashboard de orçamento vs. executado');
  ctx.y += 4;

  addSubtitle(ctx, 'Para Nível 4 — Integrado');
  addBoldLine(ctx, '6.', 'Análise Preditiva — Projeção de prazos e riscos com base em histórico');
  addBoldLine(ctx, '7.', 'Benchmarking — Comparação de métricas entre projetos similares');
  addBoldLine(ctx, '8.', 'Feedback Loop — IA que aprende com classificações aceitas/rejeitadas');
  addBoldLine(ctx, '9.', 'Webhooks — Integração bidirecional com sistemas externos');
  addBoldLine(ctx, '10.', 'Retrospectivas — Módulo de lições aprendidas por ciclo');
  ctx.y += 4;

  addSubtitle(ctx, 'Para Nível 5 — Autônomo');
  addBoldLine(ctx, '11.', 'Auto-ajuste — Thresholds de SLA/WIP ajustados automaticamente por histórico');
  addBoldLine(ctx, '12.', 'Orquestrador Central — Engine que coordena todas as automações');
  addBoldLine(ctx, '13.', 'Detecção de Anomalias — Baseline + desvio padrão automático');
  addBoldLine(ctx, '14.', 'Auto-remediação — Sistema corrige problemas sem intervenção humana');

  // ═══ CONCLUSÃO ═══
  ctx.y += 8;
  ensureSpace(ctx, 60);
  addSectionTitle(ctx, 'CONCLUSÃO');

  addParagraph(ctx, 'O GIRA Diário de Bordo encontra-se no Nível 2.4/5 de maturidade geral — um sistema Estruturado com processos bem definidos, ferramentas implementadas e fundações sólidas para evolução. A Governança (3.2) é o ponto mais maduro; Custos e Riscos são as maiores lacunas.');

  addParagraph(ctx, 'O caminho mais rápido para o Nível 3 é implementar gestão formal de riscos, sprints com velocity tracking e automações proativas server-side. Os ativos existentes (triggers, IA, métricas, RBAC) reduzem significativamente o esforço de implementação.');

  addParagraph(ctx, 'Para o Nível 4+, o sistema precisa de análise preditiva, benchmarking entre projetos e um feedback loop que permita à IA aprender com os dados operacionais acumulados.');

  ctx.y += 8;
  ensureSpace(ctx, 20);
  pdf.setDrawColor(30, 58, 138);
  pdf.setLineWidth(0.5);
  pdf.line(ML + 25, ctx.y, PAGE_W - MR - 25, ctx.y);
  ctx.y += 8;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(156, 163, 175);
  pdf.text('Este documento é confidencial e destinado exclusivamente para fins de avaliação estratégica.', PAGE_W / 2, ctx.y, { align: 'center' });

  // ═══ RENDER TOC + FOOTERS ═══
  renderTocPage(ctx);
  addPageFooters(ctx);

  const filename = `GIRA_Auditoria_Maturidade_Completa_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
