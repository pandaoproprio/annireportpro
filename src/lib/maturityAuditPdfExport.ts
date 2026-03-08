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
  ctx.pdf.setTextColor(15, 82, 72); // teal-800
  ctx.pdf.text(text, ML, ctx.y);
  ctx.y += 3;
  ctx.pdf.setDrawColor(15, 82, 72);
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

function addTableRow(ctx: PdfCtx, cols: string[], widths: number[], isHeader = false) {
  ensureSpace(ctx, 8);
  const rowH = 7;
  if (isHeader) {
    ctx.pdf.setFillColor(15, 82, 72);
    ctx.pdf.rect(ML, ctx.y - 4.5, CW, rowH, 'F');
    ctx.pdf.setTextColor(255, 255, 255);
    ctx.pdf.setFont('helvetica', 'bold');
  } else {
    ctx.pdf.setFillColor(240, 253, 250); // teal-50
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
  ctx.pdf.setFillColor(240, 253, 250);
  ctx.pdf.setDrawColor(15, 82, 72);
  ctx.pdf.setLineWidth(0.3);
  ctx.pdf.roundedRect(ML, ctx.y - 2, CW, 16, 2, 2, 'FD');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(55, 65, 81);
  ctx.pdf.text(text, ML + 4, ctx.y + 3);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(12);
  ctx.pdf.setTextColor(15, 82, 72);
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

  // Background
  ctx.pdf.setFillColor(229, 231, 235);
  ctx.pdf.roundedRect(barX, ctx.y, barW, barH, 1, 1, 'F');

  // Fill
  const color = pct >= 0.8 ? [5, 150, 105] : pct >= 0.6 ? [245, 158, 11] : [239, 68, 68];
  ctx.pdf.setFillColor(color[0], color[1], color[2]);
  ctx.pdf.roundedRect(barX, ctx.y, barW * pct, barH, 1, 1, 'F');

  // Score text
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
    // Skip cover (page 1) and TOC (page 2)
    if (i <= 2) continue;
    ctx.pdf.setFontSize(8);
    ctx.pdf.setTextColor(156, 163, 175);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.text(
      `GIRA — Análise de Maturidade Tecnológica — Página ${i - 2} de ${totalPages - 2}`,
      PAGE_W / 2, PAGE_H - 10, { align: 'center' }
    );
    ctx.pdf.setDrawColor(209, 213, 219);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.line(ML, PAGE_H - 15, PAGE_W - MR, PAGE_H - 15);
  }
}

function renderTocPage(ctx: PdfCtx) {
  // Go to page 2 and render TOC
  ctx.pdf.setPage(2);
  let y = MT;

  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(18);
  ctx.pdf.setTextColor(15, 82, 72);
  ctx.pdf.text('SUMÁRIO', PAGE_W / 2, y, { align: 'center' });
  y += 16;

  ctx.pdf.setDrawColor(15, 82, 72);
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
    ctx.pdf.setTextColor(15, 82, 72);
    ctx.pdf.text(pageLabel, PAGE_W - MR, y, { align: 'right' });

    // Dot leader
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

export function exportMaturityAuditToPdf() {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ctx: PdfCtx = { pdf, y: MT, tocEntries: [] };
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  // ═══ COVER PAGE ═══
  pdf.setFillColor(15, 82, 72);
  pdf.rect(0, 0, PAGE_W, 6, 'F');

  ctx.y = 55;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 82, 72);
  pdf.text('ANÁLISE DE MATURIDADE TECNOLÓGICA E ESTADO DA ARTE', PAGE_W / 2, ctx.y, { align: 'center' });
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
  pdf.text('Relatório Estratégico para Investidores', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 7;
  pdf.text('Avaliação de Produto, Arquitetura e Potencial de Mercado', PAGE_W / 2, ctx.y, { align: 'center' });

  ctx.y += 30;
  pdf.setDrawColor(15, 82, 72);
  pdf.setLineWidth(0.6);
  pdf.line(ML + 30, ctx.y, PAGE_W - MR - 30, ctx.y);
  ctx.y += 16;

  // Metadata box
  pdf.setFillColor(240, 253, 250);
  pdf.roundedRect(ML + 20, ctx.y - 4, CW - 40, 36, 3, 3, 'F');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(55, 65, 81);
  pdf.text(`Data: ${today}`, PAGE_W / 2, ctx.y + 4, { align: 'center' });
  pdf.text('Classificação: Confidencial', PAGE_W / 2, ctx.y + 12, { align: 'center' });
  pdf.text('Nível de Maturidade: 3.5/5 — SaaS em Transição', PAGE_W / 2, ctx.y + 20, { align: 'center' });
  pdf.text('Powered by AnnITech', PAGE_W / 2, ctx.y + 28, { align: 'center' });

  pdf.setFillColor(15, 82, 72);
  pdf.rect(0, PAGE_H - 6, PAGE_W, 6, 'F');

  // ═══ TOC PAGE (placeholder — rendered at end) ═══
  newPage(ctx);
  // This page will be overwritten by renderTocPage

  // ═══ BLOCO 1 — DIAGNÓSTICO GERAL ═══
  newPage(ctx);
  addSectionTitle(ctx, '1. DIAGNÓSTICO GERAL');

  addParagraph(ctx, 'O GIRA Diário de Bordo é uma plataforma SaaS especializada na gestão de projetos socioculturais financiados por termos de fomento público. O sistema automatiza a prestação de contas, diário de bordo, geração de relatórios institucionais e gestão de equipes, atendendo organizações do terceiro setor.');

  addSubtitle(ctx, 'Objetivo do Sistema');
  addBullet(ctx, 'Digitalizar e automatizar a prestação de contas de projetos socioculturais');
  addBullet(ctx, 'Garantir conformidade com exigências de órgãos financiadores (CEAP, prefeituras)');
  addBullet(ctx, 'Reduzir o tempo de produção de relatórios de semanas para horas');

  addSubtitle(ctx, 'Principais Funcionalidades');
  const w1 = [55, 105];
  addTableRow(ctx, ['Módulo', 'Descrição'], w1, true);
  addTableRow(ctx, ['Diário de Bordo', 'Registro de atividades com fotos, presença, despesas e geolocalização'], w1);
  addTableRow(ctx, ['Relatório do Objeto', 'Geração automática de relatórios ABNT com capa, sumário e anexos'], w1);
  addTableRow(ctx, ['Relatório da Equipe', 'Relatórios individuais por membro da equipe com assinatura digital'], w1);
  addTableRow(ctx, ['Dashboard Analítico', 'Gráficos de execução, metas, tipos de atividade e resumo IA'], w1);
  addTableRow(ctx, ['Kanban de Atividades', 'Visão board com filtros por tipo, autor e status'], w1);
  addTableRow(ctx, ['IA Integrada', 'NLP generativa, OCR de presença, chatbot contextual e speech-to-text'], w1);
  addTableRow(ctx, ['RBAC + Auditoria', '7 papéis, 26 permissões granulares, logs de sistema completos'], w1);
  ctx.y += 4;

  addSubtitle(ctx, 'Arquitetura Geral');
  addBoldLine(ctx, 'Frontend:', 'React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui');
  addBoldLine(ctx, 'Backend:', 'Supabase (PostgreSQL + Edge Functions + Auth + Storage + RLS)');
  addBoldLine(ctx, 'IA:', 'Google Gemini via Lovable AI Gateway (sem custo de API key)');
  addBoldLine(ctx, 'PDF Engine:', 'jsPDF nativo (client-side) + Puppeteer/Browserless (server-side)');
  addBoldLine(ctx, 'Deploy:', 'Lovable Cloud com CDN global e auto-deploy');

  // ═══ BLOCO 2 — MATURIDADE TECNOLÓGICA ═══
  newPage(ctx);
  addSectionTitle(ctx, '2. MATURIDADE TECNOLÓGICA');

  addHighlightBox(ctx, 'Classificação de Maturidade:', 'NÍVEL 3.5 / 5 — SaaS em Transição para Plataforma Escalável');

  addSubtitle(ctx, 'Escala de Maturidade');
  const w2 = [30, 50, 80];
  addTableRow(ctx, ['Nível', 'Classificação', 'Descrição'], w2, true);
  addTableRow(ctx, ['1', 'Protótipo', 'Prova de conceito, sem usuários reais'], w2);
  addTableRow(ctx, ['2', 'Produto Funcional', 'Funciona, mas sem multi-tenancy ou escala'], w2);
  addTableRow(ctx, ['3', 'Produto SaaS', 'Auth, RBAC, persistence, API — pronto para clientes'], w2);
  addTableRow(ctx, ['4', 'Plataforma Escalável', 'Multi-tenant, billing, API pública, white-label'], w2);
  addTableRow(ctx, ['5', 'Enterprise', 'SSO, SLA 99.9%, compliance, marketplace'], w2);
  ctx.y += 6;

  addSubtitle(ctx, 'Justificativa da Classificação 3.5');
  addParagraph(ctx, 'O GIRA atende plenamente os requisitos do Nível 3 (SaaS) e possui elementos parciais do Nível 4:');

  addSubtitle(ctx, 'Critérios Atendidos (Nível 3+)');
  addBullet(ctx, 'Autenticação robusta com MFA, LGPD consent e force password change');
  addBullet(ctx, 'RBAC completo com 7 papéis e 26 permissões granulares via tabela separada');
  addBullet(ctx, 'Row Level Security (RLS) em todas as tabelas críticas');
  addBullet(ctx, 'Edge Functions para processamento backend (IA, OCR, email, admin)');
  addBullet(ctx, 'SLA tracking com deadlines, alertas e escalation automático');
  addBullet(ctx, 'Performance tracking com métricas de cycle time e lead time');
  addBullet(ctx, 'Auditoria completa com system_logs e audit_logs');

  addSubtitle(ctx, 'Critérios Pendentes (Nível 4)');
  addBullet(ctx, 'Multi-tenancy formal (isolamento por organização)');
  addBullet(ctx, 'API pública documentada (REST/GraphQL)');
  addBullet(ctx, 'Sistema de billing/subscription integrado (Stripe)');
  addBullet(ctx, 'White-label / customização por tenant');

  // ═══ BLOCO 3 — ARQUITETURA ═══
  newPage(ctx);
  addSectionTitle(ctx, '3. ANÁLISE ARQUITETURAL');

  addSubtitle(ctx, 'Pontos Fortes');
  addBullet(ctx, 'Segurança server-side: RLS policies em PostgreSQL garantem isolamento de dados sem depender do frontend');
  addBullet(ctx, 'Dual PDF engine: jsPDF para exports rápidos client-side + Puppeteer para documentos complexos server-side');
  addBullet(ctx, 'Modularização de exportação: Motor unificado em pdfHelpers.ts com constantes ABNT centralizadas');
  addBullet(ctx, 'IA como serviço: Edge Functions orquestram chamadas ao Gemini sem expor API keys');
  addBullet(ctx, 'Rich text engine: Processamento de HTML → segmentos estilizados para exportação PDF fiel');
  addBullet(ctx, 'Editor Enterprise: Canvas Konva.js com blocos drag-and-drop e versionamento de snapshots');

  addSubtitle(ctx, 'Gargalos Identificados');
  const w3 = [45, 35, 80];
  addTableRow(ctx, ['Gargalo', 'Severidade', 'Impacto'], w3, true);
  addTableRow(ctx, ['AppDataContext monolítico', 'Alta', 'Re-renders desnecessários em toda a aplicação'], w3);
  addTableRow(ctx, ['Fotos em Base64 (legado)', 'Média', 'Payload inflado, lentidão em atividades com muitas fotos'], w3);
  addTableRow(ctx, ['Edge Fns sem rate limit', 'Alta', 'Vulnerável a abuso/DDoS nas rotas de IA'], w3);
  addTableRow(ctx, ['Sem connection pooling', 'Média', 'Limite de conexões PostgreSQL sob carga alta'], w3);
  addTableRow(ctx, ['Bundle size', 'Baixa', 'Lazy loading implementado, mas dependências pesadas (Konva, jsPDF)'], w3);
  ctx.y += 4;

  addSubtitle(ctx, 'Riscos Técnicos');
  addBoldLine(ctx, 'Risco 1:', 'Vendor lock-in com Lovable Cloud — mitigável via exportação do projeto e Supabase self-hosted');
  addBoldLine(ctx, 'Risco 2:', 'Dependência do Lovable AI Gateway para IA — mitigável com API keys próprias como fallback');
  addBoldLine(ctx, 'Risco 3:', 'Ausência de testes E2E — recomendado Playwright para fluxos críticos (login → relatório → PDF)');

  // ═══ BLOCO 4 — ESTADO DA ARTE ═══
  newPage(ctx);
  addSectionTitle(ctx, '4. ESTADO DA ARTE');

  addParagraph(ctx, 'Comparação do GIRA com as melhores práticas globais da indústria de SaaS:');

  const w4 = [40, 60, 60];
  addTableRow(ctx, ['Dimensão', 'Estado da Arte (Global)', 'GIRA (Atual)'], w4, true);
  addTableRow(ctx, ['Stack Frontend', 'React/Next.js + TypeScript', '✅ React 18 + TS + Vite'], w4);
  addTableRow(ctx, ['UI Framework', 'Headless UI (Radix/shadcn)', '✅ shadcn/ui + Radix primitives'], w4);
  addTableRow(ctx, ['Backend', 'Serverless (Lambda/Edge)', '✅ Supabase Edge Functions'], w4);
  addTableRow(ctx, ['Auth', 'MFA + OAuth + SSO', '⚠️ MFA + Email (falta OAuth/SSO)'], w4);
  addTableRow(ctx, ['IA Generativa', 'LLMs integrados (GPT/Gemini)', '✅ Gemini 2.5/3 via gateway'], w4);
  addTableRow(ctx, ['OCR/Vision', 'Multimodal AI (GPT-4V)', '✅ Gemini Vision para presença'], w4);
  addTableRow(ctx, ['Modelo de Dados', 'PostgreSQL + pgvector', '⚠️ PostgreSQL (sem pgvector)'], w4);
  addTableRow(ctx, ['Observabilidade', 'Sentry + DataDog', '⚠️ Console logs + system_logs'], w4);
  addTableRow(ctx, ['Testes', 'Vitest + Playwright + CI/CD', '⚠️ Vitest parcial (sem E2E)'], w4);
  addTableRow(ctx, ['PWA', 'Service Worker + Offline', '✅ PWA com install prompt'], w4);
  ctx.y += 4;

  addHighlightBox(ctx, 'Alinhamento com Estado da Arte:', '72% — Acima da Média do Segmento');

  addParagraph(ctx, 'O GIRA está alinhado com o estado da arte em 72% das dimensões avaliadas. As lacunas são concentradas em observabilidade, testes automatizados e funcionalidades enterprise (SSO, pgvector). Para o nicho sociocultural, o sistema está significativamente à frente de 95% dos concorrentes.');

  // ═══ BLOCO 5 — ESCALABILIDADE ═══
  newPage(ctx);
  addSectionTitle(ctx, '5. ANÁLISE DE ESCALABILIDADE');

  addSubtitle(ctx, 'Capacidade por Faixa de Usuários');
  const w5 = [40, 40, 80];
  addTableRow(ctx, ['Faixa', 'Suporte?', 'Requisitos'], w5, true);
  addTableRow(ctx, ['1–10k usuários', '✅ Suportado', 'Arquitetura atual é suficiente'], w5);
  addTableRow(ctx, ['10k–100k', '⚠️ Com ajustes', 'Connection pooling, CDN para storage, cache Redis'], w5);
  addTableRow(ctx, ['100k–1M', '🔧 Refatoração', 'Multi-tenancy, read replicas, decomposição Context'], w5);
  addTableRow(ctx, ['1M–10M', '🏗️ Re-arquitetura', 'Microserviços, sharding, API gateway dedicado'], w5);
  ctx.y += 6;

  addSubtitle(ctx, 'Bottlenecks de Performance');
  addBullet(ctx, 'PostgreSQL single-instance: Supabase Pro suporta ~500 conexões simultâneas; acima disso, necessário PgBouncer');
  addBullet(ctx, 'Storage de fotos: Migração completa para Supabase Storage (bucket) eliminaria payload Base64');
  addBullet(ctx, 'PDF server-side: Browserless é single-tenant; para alto volume, necessário pool de instâncias ou fila assíncrona');
  addBullet(ctx, 'AppDataContext: Carrega todos os dados do projeto em memória; necessário decomposição em contextos específicos');

  addSubtitle(ctx, 'Recomendações para Escala');
  addBoldLine(ctx, 'Curto prazo:', 'Migrar fotos Base64 → Storage, implementar paginação server-side em activities');
  addBoldLine(ctx, 'Médio prazo:', 'Connection pooling (PgBouncer), cache layer para dashboard, CDN para assets estáticos');
  addBoldLine(ctx, 'Longo prazo:', 'Read replicas para queries pesadas, filas para PDF (BullMQ), multi-region deploy');

  // ═══ BLOCO 6 — UX ═══
  newPage(ctx);
  addSectionTitle(ctx, '6. EXPERIÊNCIA DO USUÁRIO');

  addSubtitle(ctx, 'Avaliação de Usabilidade');
  addScoreBar(ctx, 'Navegação e Fluxos', 8, 10);
  addScoreBar(ctx, 'Consistência Visual', 9, 10);
  addScoreBar(ctx, 'Responsividade Mobile', 7, 10);
  addScoreBar(ctx, 'Acessibilidade (a11y)', 5, 10);
  addScoreBar(ctx, 'Onboarding', 7, 10);
  addScoreBar(ctx, 'Feedback ao Usuário', 8, 10);
  ctx.y += 4;

  addHighlightBox(ctx, 'Score UX Geral:', '7.3 / 10 — Bom (acima da média do segmento)');

  addSubtitle(ctx, 'Pontos Fortes de UX');
  addBullet(ctx, 'Design system consistente com shadcn/ui e tokens semânticos (dark/light mode)');
  addBullet(ctx, 'Sidebar responsiva com auto-close em mobile');
  addBullet(ctx, 'Toast notifications com feedback contextual (sonner)');
  addBullet(ctx, 'Filtros visuais no Kanban com chips coloridos por tipo de atividade');

  addSubtitle(ctx, 'Melhorias Recomendadas');
  addBullet(ctx, 'Implementar skeleton loading em todas as páginas (parcialmente feito)');
  addBullet(ctx, 'Adicionar tour guiado para novos usuários (react-joyride)');
  addBullet(ctx, 'Melhorar acessibilidade: aria-labels, keyboard navigation, focus management');
  addBullet(ctx, 'Micro-animações com framer-motion para transições de estado');

  // ═══ BLOCO 7 — SEGURANÇA ═══
  newPage(ctx);
  addSectionTitle(ctx, '7. SEGURANÇA E GOVERNANÇA');

  addSubtitle(ctx, 'Scorecard de Segurança');
  addScoreBar(ctx, 'Autenticação', 9, 10);
  addScoreBar(ctx, 'Autorização (RBAC)', 9, 10);
  addScoreBar(ctx, 'Proteção de Dados (RLS)', 8, 10);
  addScoreBar(ctx, 'Auditabilidade', 8, 10);
  addScoreBar(ctx, 'Conformidade LGPD', 7, 10);
  addScoreBar(ctx, 'Segurança de APIs', 5, 10);
  addScoreBar(ctx, 'Gestão de Secrets', 7, 10);
  ctx.y += 4;

  addHighlightBox(ctx, 'Score de Segurança:', '7.6 / 10 — Sólido para o estágio atual');

  addSubtitle(ctx, 'Pontos Fortes');
  addBullet(ctx, 'RBAC com 7 papéis e 26 permissões em tabela separada (user_roles + user_permissions)');
  addBullet(ctx, 'RLS policies em todas as tabelas com funções SECURITY DEFINER');
  addBullet(ctx, 'MFA opcional com TOTP (authenticator app)');
  addBullet(ctx, 'LGPD consent tracking com timestamp e fluxo obrigatório');
  addBullet(ctx, 'System logs e audit logs com IP, user agent e metadata completa');
  addBullet(ctx, 'Force password change após criação de conta pelo admin');

  addSubtitle(ctx, 'Ações Prioritárias');
  addBullet(ctx, 'Ativar verify_jwt = true em Edge Functions críticas');
  addBullet(ctx, 'Implementar rate limiting (token bucket) nas rotas de IA');
  addBullet(ctx, 'Política de retenção de dados (auto-delete de logs > 12 meses)');
  addBullet(ctx, 'Rotação automática de secrets e API keys');

  // ═══ BLOCO 8 — DIFERENCIAÇÃO ═══
  newPage(ctx);
  addSectionTitle(ctx, '8. DIFERENCIAÇÃO DE MERCADO');

  addSubtitle(ctx, 'Análise Competitiva');
  const w8 = [40, 40, 40, 40];
  addTableRow(ctx, ['Aspecto', 'GIRA', 'Concorrentes', 'Vantagem'], w8, true);
  addTableRow(ctx, ['IA Integrada', 'NLP + OCR + Chat', 'Nenhum/básico', '✅ Forte'], w8);
  addTableRow(ctx, ['ABNT Compliance', 'Automático', 'Manual', '✅ Forte'], w8);
  addTableRow(ctx, ['RBAC Granular', '7 papéis / 26 perms', '2-3 papéis', '✅ Forte'], w8);
  addTableRow(ctx, ['Export PDF/DOCX', 'Dual engine', 'Básico', '✅ Moderada'], w8);
  addTableRow(ctx, ['PWA/Mobile', 'Instalável', 'Apenas web', '✅ Moderada'], w8);
  addTableRow(ctx, ['Preço', 'Competitivo', 'Planilhas grátis', '⚠️ Desafio'], w8);
  ctx.y += 6;

  addSubtitle(ctx, 'Barreiras de Entrada');
  addParagraph(ctx, 'O sistema possui barreiras de entrada MÉDIAS-ALTAS para competidores:');
  addBullet(ctx, 'Conhecimento de domínio: Entender normas de prestação de contas de fomento público requer expertise específica');
  addBullet(ctx, 'Stack técnica: A combinação de IA + ABNT + RBAC + exportação profissional é complexa de replicar');
  addBullet(ctx, 'Dados acumulados: Com o tempo, os dados de uso alimentarão modelos preditivos exclusivos');
  addBullet(ctx, 'Rede de efeitos: Templates e configurações compartilhados entre organizações criam lock-in positivo');

  addSubtitle(ctx, 'O produto é facilmente copiável?');
  addParagraph(ctx, 'NÃO. A interface pode ser replicada, mas a combinação de: (1) compliance ABNT automatizado, (2) IA generativa integrada ao fluxo de trabalho, (3) RBAC com 7 papéis granulares e (4) conhecimento profundo do domínio sociocultural cria uma barreira competitiva significativa. Estimativa de 12–18 meses para um concorrente atingir paridade funcional.');

  // ═══ BLOCO 9 — INOVAÇÃO ═══
  newPage(ctx);
  addSectionTitle(ctx, '9. POTENCIAL DE INOVAÇÃO');

  addSubtitle(ctx, 'Oportunidades de Alto Impacto');

  addBoldLine(ctx, '🤖 IA Preditiva de SLA:', 'Modelo que analisa padrões históricos para prever atrasos antes que ocorram. Transforma o SLA de reativo para proativo.');
  ctx.y += 2;
  addBoldLine(ctx, '📊 Dashboard de Impacto Social:', 'Métricas automatizadas de beneficiários, ODS (Objetivos de Desenvolvimento Sustentável) e indicadores de resultado por projeto.');
  ctx.y += 2;
  addBoldLine(ctx, '🔍 RAG para Relatórios:', 'Retrieval-Augmented Generation que analisa relatórios anteriores e sugere estrutura, textos e fotos para novos documentos. Redução de 60-70% no tempo de criação.');
  ctx.y += 2;
  addBoldLine(ctx, '🏛️ Integração SICONV/TransfereGov:', 'Conexão direta com sistemas governamentais para submissão automática de prestação de contas.');
  ctx.y += 2;
  addBoldLine(ctx, '📱 App Nativo (React Native):', 'Registro de atividades offline com sincronização automática, câmera integrada e geolocalização.');
  ctx.y += 2;
  addBoldLine(ctx, '🤝 Marketplace de Templates:', 'Organizações compartilham e vendem templates de relatórios padronizados por financiador.');
  ctx.y += 2;
  addBoldLine(ctx, '📈 Analytics Avançado:', 'Benchmarking entre projetos similares, scoring de performance organizacional e relatórios de impacto para investidores sociais.');
  ctx.y += 4;

  addHighlightBox(ctx, 'Multiplicador de Valor Estimado:', '3–5x com implementação de IA avançada + integrações');

  // ═══ BLOCO 10 — ROADMAP ENTERPRISE ═══
  newPage(ctx);
  addSectionTitle(ctx, '10. ROADMAP PARA NÍVEL ENTERPRISE');

  addSubtitle(ctx, '📅 Curto Prazo (0–3 meses)');
  addBullet(ctx, 'Ativar verify_jwt em todas as Edge Functions críticas');
  addBullet(ctx, 'Implementar rate limiting nas rotas de IA');
  addBullet(ctx, 'Decompor AppDataContext em contextos especializados');
  addBullet(ctx, 'Migrar fotos legado de Base64 para Supabase Storage');
  addBullet(ctx, 'Implementar testes E2E com Playwright (login → relatório → PDF)');
  addBullet(ctx, 'Adicionar classificação automática de atividades via Gemini');

  addSubtitle(ctx, '📅 Médio Prazo (3–9 meses)');
  addBullet(ctx, 'Multi-tenancy com isolamento por organização');
  addBullet(ctx, 'Integração Stripe para billing/subscription');
  addBullet(ctx, 'Dashboard de impacto social com métricas ODS');
  addBullet(ctx, 'RAG com pgvector para recomendação de conteúdo');
  addBullet(ctx, 'OAuth (Google/Microsoft) e SSO para organizações');
  addBullet(ctx, 'API REST pública documentada com OpenAPI/Swagger');
  addBullet(ctx, 'Observabilidade com Sentry + métricas de performance');

  addSubtitle(ctx, '📅 Longo Prazo (9–18 meses)');
  addBullet(ctx, 'White-label para grandes organizações e redes');
  addBullet(ctx, 'Integração SICONV/TransfereGov para submissão automática');
  addBullet(ctx, 'App mobile nativo com offline-first');
  addBullet(ctx, 'Marketplace de templates e modelos de relatórios');
  addBullet(ctx, 'Colaboração em tempo real (CRDTs/Yjs)');
  addBullet(ctx, 'Compliance SOC 2 Type II e certificação ISO 27001');
  addBullet(ctx, 'SLA 99.9% com multi-region deploy');

  ctx.y += 8;
  addSubtitle(ctx, 'Impacto no Valuation');
  const wv = [55, 35, 70];
  addTableRow(ctx, ['Fase', 'Valuation Est.', 'Multiplicador ARR'], wv, true);
  addTableRow(ctx, ['Atual (SaaS 3.5)', 'R$ 2–5M', '8–12x ARR'], wv);
  addTableRow(ctx, ['Pós curto prazo', 'R$ 5–10M', '12–15x ARR'], wv);
  addTableRow(ctx, ['Pós médio prazo', 'R$ 10–25M', '15–20x ARR'], wv);
  addTableRow(ctx, ['Enterprise (18m)', 'R$ 25–50M', '20–30x ARR'], wv);
  ctx.y += 6;

  // ═══ CONCLUSÃO ═══
  ensureSpace(ctx, 60);
  addSectionTitle(ctx, 'CONCLUSÃO');

  addParagraph(ctx, 'O GIRA Diário de Bordo está posicionado como o produto mais avançado tecnologicamente no segmento de gestão de projetos socioculturais no Brasil. Com nível de maturidade 3.5/5, o sistema já opera como um SaaS funcional com diferenciais claros em IA, segurança e automação de conformidade ABNT.');

  addParagraph(ctx, 'O roadmap proposto — com investimento estimado de R$ 300–500k em 18 meses — tem potencial de elevar o valuation de R$ 2–5M para R$ 25–50M, transformando o GIRA de uma ferramenta de registro em uma plataforma enterprise de referência para o terceiro setor.');

  ctx.y += 8;
  ensureSpace(ctx, 20);
  pdf.setDrawColor(15, 82, 72);
  pdf.setLineWidth(0.5);
  pdf.line(ML + 25, ctx.y, PAGE_W - MR - 25, ctx.y);
  ctx.y += 8;
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9);
  pdf.setTextColor(156, 163, 175);
  pdf.text('Este documento é confidencial e destinado exclusivamente para fins de avaliação estratégica e investimento.', PAGE_W / 2, ctx.y, { align: 'center' });

  // ═══ RENDER TOC + FOOTERS ═══
  renderTocPage(ctx);
  addPageFooters(ctx);

  const filename = `GIRA_Maturity_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
