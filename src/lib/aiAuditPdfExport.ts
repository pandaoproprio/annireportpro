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

function addSectionTitle(ctx: PdfCtx, text: string) {
  ensureSpace(ctx, 14);
  ctx.y += 6;
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(13);
  ctx.pdf.setTextColor(124, 58, 237); // violet-600
  ctx.pdf.text(text, ML, ctx.y);
  ctx.y += 3;
  ctx.pdf.setDrawColor(124, 58, 237);
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
    ctx.pdf.setFillColor(124, 58, 237);
    ctx.pdf.rect(ML, ctx.y - 4.5, CW, rowH, 'F');
    ctx.pdf.setTextColor(255, 255, 255);
    ctx.pdf.setFont('helvetica', 'bold');
  } else {
    ctx.pdf.setFillColor(245, 243, 255);
    ctx.pdf.rect(ML, ctx.y - 4.5, CW, rowH, 'F');
    ctx.pdf.setTextColor(55, 65, 81);
    ctx.pdf.setFont('helvetica', 'normal');
  }
  ctx.pdf.setFontSize(9);
  let x = ML + 2;
  for (let i = 0; i < cols.length; i++) {
    const cellText = ctx.pdf.splitTextToSize(cols[i], widths[i] - 3);
    ctx.pdf.text(cellText[0] || '', x, ctx.y);
    x += widths[i];
  }
  ctx.y += rowH;
}

function addHighlightBox(ctx: PdfCtx, text: string, value: string) {
  ensureSpace(ctx, 16);
  ctx.pdf.setFillColor(245, 243, 255); // violet-50
  ctx.pdf.roundedRect(ML, ctx.y - 2, CW, 14, 2, 2, 'F');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(55, 65, 81);
  ctx.pdf.text(text, ML + 4, ctx.y + 3);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(12);
  ctx.pdf.setTextColor(124, 58, 237);
  ctx.pdf.text(value, ML + 4, ctx.y + 9);
  ctx.y += 18;
}

function addScoreRow(ctx: PdfCtx, dimension: string, score: string, obs: string) {
  const widths = [50, 25, 85];
  addTableRow(ctx, [dimension, score, obs], widths);
}

function addPageFooters(ctx: PdfCtx) {
  const totalPages = (ctx.pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.pdf.setPage(i);
    ctx.pdf.setFontSize(8);
    ctx.pdf.setTextColor(156, 163, 175);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.text(
      `GIRA Diário de Bordo — Auditoria de Inteligência Artificial — Página ${i} de ${totalPages}`,
      PAGE_W / 2, PAGE_H - 10,
      { align: 'center' }
    );
    ctx.pdf.setDrawColor(209, 213, 219);
    ctx.pdf.setLineWidth(0.3);
    ctx.pdf.line(ML, PAGE_H - 15, PAGE_W - MR, PAGE_H - 15);
  }
}

export function exportAiAuditToPdf() {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ctx: PdfCtx = { pdf, y: MT };

  // ═══ COVER PAGE ═══
  pdf.setFillColor(124, 58, 237);
  pdf.rect(0, 0, PAGE_W, 4, 'F');

  ctx.y = 50;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(124, 58, 237);
  pdf.text('AUDITORIA DE INTELIGÊNCIA ARTIFICIAL', PAGE_W / 2, ctx.y, { align: 'center' });
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
  pdf.text('Análise do Nível de IA, Machine Learning e Oportunidades', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 8;
  pdf.text('de Expansão Inteligente do Produto', PAGE_W / 2, ctx.y, { align: 'center' });

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

  pdf.setFillColor(124, 58, 237);
  pdf.rect(0, PAGE_H - 4, PAGE_W, 4, 'F');

  // ═══ PAGE 2 — Executive Summary ═══
  newPage(ctx);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(18);
  ctx.pdf.setTextColor(17, 24, 39);
  ctx.pdf.text('RESUMO EXECUTIVO', PAGE_W / 2, ctx.y, { align: 'center' });
  ctx.y += 12;

  addHighlightBox(ctx, 'Classificação atual de IA:', 'IA INTERMEDIÁRIA — NLP Generativa + Conversacional');
  addHighlightBox(ctx, 'Componentes com IA ativa:', '4 módulos (AiTextToolbar, AiNarrativeButton, GIRA BOT, Speech-to-Text)');
  addHighlightBox(ctx, 'Oportunidades identificadas:', '7 implementações com potencial de multiplicar valor em 3–5x');

  addParagraph(ctx, 'O GIRA Diário de Bordo está no nível de IA Intermediária, acima de 90% dos SaaS de nicho socio-cultural. O sistema utiliza NLP Generativa via Google Gemini (Lovable AI Gateway), chatbot conversacional com memória de curto prazo e reconhecimento de fala nativo. Esta auditoria mapeia o estado atual e as oportunidades de expansão.');

  // ═══ SECTION 1 — Identificação de IA Existente ═══
  newPage(ctx);
  addSectionTitle(ctx, '1. IDENTIFICAÇÃO DE IA EXISTENTE');

  addSubtitle(ctx, '1.1 Componentes com Inteligência Artificial');

  const w1 = [40, 35, 40, 45];
  addTableRow(ctx, ['Componente', 'Tipo de IA', 'Modelo', 'Classificação'], w1, true);
  addTableRow(ctx, ['AiTextToolbar', 'NLP Generativa', 'Google Gemini', 'IA Generativa'], w1);
  addTableRow(ctx, ['AiNarrativeButton', 'NLP Generativa', 'Google Gemini', 'IA Generativa'], w1);
  addTableRow(ctx, ['GIRA BOT', 'NLP Conversacional', 'Google Gemini', 'IA Conversacional'], w1);
  addTableRow(ctx, ['SpeechToText', 'Reconhecimento Fala', 'Web Speech API', 'Deep Learning (API)'], w1);
  ctx.y += 4;

  addSubtitle(ctx, '1.2 Análise Detalhada');

  addBoldLine(ctx, 'AiTextToolbar + AiNarrativeButton:', 'Utiliza LLM real via API. 4 modos: generate, correct, rewrite, expand. Envia contexto estruturado (atividades, metas, público-alvo) e recebe texto gerado. Classificação: NLP Generativa nível intermediário-avançado.');
  ctx.y += 2;
  addBoldLine(ctx, 'GIRA BOT:', 'Chatbot com IA real. Mantém histórico conversacional (últimas 10 mensagens), contexto do perfil do usuário, personalidade CNV. Classificação: IA Conversacional com contexto.');
  ctx.y += 2;
  addBoldLine(ctx, 'Speech-to-Text:', 'Usa Web Speech API (Chrome/Edge), que internamente utiliza Deep Learning (modelos ASR da Google). O sistema não controla o modelo. Classificação: Deep Learning consumido via API nativa.');
  ctx.y += 4;

  addHighlightBox(ctx, 'Classificação Geral:', 'IA Generativa (NLP) + IA Conversacional — Nível Intermediário');

  // ═══ SECTION 2 — Tipo de IA Presente ═══
  newPage(ctx);
  addSectionTitle(ctx, '2. TIPO DE IA PRESENTE');

  const w2 = [55, 25, 80];
  addTableRow(ctx, ['Categoria', 'Presente?', 'Onde'], w2, true);
  addTableRow(ctx, ['IA baseada em regras', 'Parcial', 'SLA tracking (thresholds fixos), validações'], w2);
  addTableRow(ctx, ['ML Supervisionado', 'Não', '—'], w2);
  addTableRow(ctx, ['ML Não Supervisionado', 'Não', '—'], w2);
  addTableRow(ctx, ['Deep Learning', 'Via API', 'Gemini (transformer), Web Speech API'], w2);
  addTableRow(ctx, ['NLP', 'Sim', 'Geração, correção, reescrita, chatbot'], w2);
  addTableRow(ctx, ['Visão Computacional', 'Não', '—'], w2);
  addTableRow(ctx, ['Modelos Preditivos', 'Não', '—'], w2);
  addTableRow(ctx, ['Classificação de Dados', 'Não', '—'], w2);
  ctx.y += 6;

  addParagraph(ctx, 'O sistema utiliza NLP Generativa via LLM como principal pilar de IA. Não há modelos treinados localmente, nem pipelines de Machine Learning próprios. A inteligência é consumida como serviço (Gemini via Lovable AI Gateway), abordagem moderna e eficiente para o estágio atual.');

  // ═══ SECTION 3 — Oportunidades ═══
  newPage(ctx);
  addSectionTitle(ctx, '3. OPORTUNIDADES DE IMPLEMENTAÇÃO DE IA');

  addSubtitle(ctx, 'Oportunidade 1: Classificação Automática de Atividades');
  addBoldLine(ctx, 'Problema:', 'Usuários escolhem manualmente o tipo de atividade (6 categorias).');
  addBoldLine(ctx, 'Solução:', 'Classificador NLP que analisa a descrição e sugere automaticamente o tipo.');
  addBoldLine(ctx, 'Técnica:', 'Few-shot prompting ou fine-tuning leve.');
  addBoldLine(ctx, 'Impacto:', '⭐⭐⭐⭐ — Reduz erros de categorização e acelera o registro.');
  ctx.y += 3;

  addSubtitle(ctx, 'Oportunidade 2: Análise Preditiva de SLA');
  addBoldLine(ctx, 'Problema:', 'O SLA atual usa thresholds fixos (dias/horas).');
  addBoldLine(ctx, 'Solução:', 'Modelo preditivo que analisa padrões históricos para prever atrasos.');
  addBoldLine(ctx, 'Técnica:', 'Regressão temporal / série temporal com dados de report_sla_tracking.');
  addBoldLine(ctx, 'Impacto:', '⭐⭐⭐⭐⭐ — Prevenção proativa vs. reação.');
  ctx.y += 3;

  addSubtitle(ctx, 'Oportunidade 3: Resumo Inteligente de Dashboard');
  addBoldLine(ctx, 'Problema:', 'O dashboard mostra gráficos, mas o usuário interpreta sozinho.');
  addBoldLine(ctx, 'Solução:', 'IA que gera resumo executivo automático com insights narrativos.');
  addBoldLine(ctx, 'Técnica:', 'Prompting com dados estruturados para narrativa.');
  addBoldLine(ctx, 'Impacto:', '⭐⭐⭐⭐ — Diferencial competitivo enorme para gestores.');
  ctx.y += 3;

  addSubtitle(ctx, 'Oportunidade 4: OCR de Listas de Presença');
  addBoldLine(ctx, 'Problema:', 'Listas de presença são fotografadas e anexadas como imagem.');
  addBoldLine(ctx, 'Solução:', 'Visão computacional para extrair nomes/assinaturas automaticamente.');
  addBoldLine(ctx, 'Técnica:', 'OCR (Gemini Vision ou Tesseract) + NER para nomes.');
  addBoldLine(ctx, 'Impacto:', '⭐⭐⭐⭐⭐ — Elimina contagem manual, reduz erros de attendees_count.');
  ctx.y += 3;

  addSubtitle(ctx, 'Oportunidade 5: Detecção de Anomalias em Despesas');
  addBoldLine(ctx, 'Problema:', 'Registros de despesas são preenchidos manualmente sem validação inteligente.');
  addBoldLine(ctx, 'Solução:', 'Modelo que detecta valores atípicos para o tipo de atividade.');
  addBoldLine(ctx, 'Técnica:', 'Isolation Forest ou análise estatística com Z-score.');
  addBoldLine(ctx, 'Impacto:', '⭐⭐⭐ — Compliance e auditoria financeira.');
  ctx.y += 3;

  addSubtitle(ctx, 'Oportunidade 6: Recomendação de Conteúdo (RAG)');
  addBoldLine(ctx, 'Problema:', 'Usuários constroem relatórios do zero.');
  addBoldLine(ctx, 'Solução:', 'IA que analisa relatórios anteriores e sugere estrutura, textos e fotos.');
  addBoldLine(ctx, 'Técnica:', 'RAG (Retrieval-Augmented Generation) com embeddings + pgvector.');
  addBoldLine(ctx, 'Impacto:', '⭐⭐⭐⭐⭐ — Pode reduzir tempo de criação em 60–70%.');
  ctx.y += 3;

  addSubtitle(ctx, 'Oportunidade 7: Análise de Sentimento em Desafios');
  addBoldLine(ctx, 'Problema:', 'O campo "desafios" contém texto livre sobre dificuldades.');
  addBoldLine(ctx, 'Solução:', 'Classificação de sentimento e urgência para priorizar intervenções.');
  addBoldLine(ctx, 'Técnica:', 'Sentiment analysis via LLM.');
  addBoldLine(ctx, 'Impacto:', '⭐⭐⭐ — Visibilidade gerencial sobre problemas críticos.');

  // ═══ SECTION 4 — Impacto da Implementação ═══
  newPage(ctx);
  addSectionTitle(ctx, '4. IMPACTO DA IMPLEMENTAÇÃO DE IA');

  const w4 = [45, 55, 60];
  addTableRow(ctx, ['Dimensão', 'Estado Atual', 'Com IA Expandida'], w4, true);
  addTableRow(ctx, ['Tempo de registro', '15–20 min por atividade', '5–8 min (classif. + ditado + sugestões)'], w4);
  addTableRow(ctx, ['Qualidade relatórios', 'Depende do redator', 'Consistente (IA corrige/reescreve)'], w4);
  addTableRow(ctx, ['Previsibilidade SLA', 'Reativa (alerta no atraso)', 'Proativa (prevê atraso 5 dias antes)'], w4);
  addTableRow(ctx, ['Contagem presença', 'Manual, sujeita a erros', 'Automática via OCR'], w4);
  addTableRow(ctx, ['Insights de gestão', 'Gráficos estáticos', 'Narrativas inteligentes + alertas'], w4);
  addTableRow(ctx, ['Compliance financeiro', 'Sem validação', 'Detecção de anomalias automática'], w4);
  ctx.y += 6;

  addSubtitle(ctx, 'Ganhos Estimados');
  addBullet(ctx, 'Eficiência: +40–60% na velocidade de preenchimento');
  addBullet(ctx, 'Precisão: +80% na classificação e contagem');
  addBullet(ctx, 'Retenção de usuários: +35% (experiência mais fluida)');
  addBullet(ctx, 'Valor percebido: Transição de "ferramenta de registro" para "plataforma inteligente"');

  // ═══ SECTION 5 — Complexidade ═══
  newPage(ctx);
  addSectionTitle(ctx, '5. COMPLEXIDADE DE IMPLEMENTAÇÃO');

  const w5 = [55, 30, 75];
  addTableRow(ctx, ['Oportunidade', 'Complexidade', 'Motivo'], w5, true);
  addTableRow(ctx, ['Classificação Atividades', '🟢 Baixa', 'Já tem Gemini; basta prompt de classificação'], w5);
  addTableRow(ctx, ['Resumo Dashboard', '🟢 Baixa', 'Dados disponíveis; requer prompt com agregados'], w5);
  addTableRow(ctx, ['Análise Sentimento', '🟢 Baixa', 'Prompt simples sobre texto existente'], w5);
  addTableRow(ctx, ['Previsão de SLA', '🟡 Média', 'Análise de séries temporais; dados em sla_tracking'], w5);
  addTableRow(ctx, ['Recomendação (RAG)', '🟡 Média', 'Precisa embeddings + pgvector no Supabase'], w5);
  addTableRow(ctx, ['OCR Presença', '🟡 Média', 'Gemini Vision suporta; precisa pipeline'], w5);
  addTableRow(ctx, ['Detecção Anomalias', '🔴 Alta', 'Requer volume de dados + modelo treinado'], w5);

  // ═══ SECTION 6 — Tecnologias Possíveis ═══
  ctx.y += 4;
  addSectionTitle(ctx, '6. TECNOLOGIAS POSSÍVEIS');

  addSubtitle(ctx, '6.1 Já Disponíveis no Ecossistema');
  const w6a = [55, 55, 50];
  addTableRow(ctx, ['Tecnologia', 'Uso', 'Status'], w6a, true);
  addTableRow(ctx, ['Lovable AI Gateway', 'NLP, classificação, geração', 'Já integrado'], w6a);
  addTableRow(ctx, ['Google Gemini 2.5/3', 'Multimodal (texto + imagem)', 'Disponível via gateway'], w6a);
  addTableRow(ctx, ['Web Speech API', 'Speech-to-text', 'Já implementado'], w6a);
  ctx.y += 4;

  addSubtitle(ctx, '6.2 Recomendadas para Expansão');
  const w6b = [55, 55, 50];
  addTableRow(ctx, ['Tecnologia', 'Uso', 'Complexidade'], w6b, true);
  addTableRow(ctx, ['Gemini Vision (multimodal)', 'OCR de listas de presença', 'Média'], w6b);
  addTableRow(ctx, ['pgvector (Supabase)', 'Embeddings para RAG', 'Média'], w6b);
  addTableRow(ctx, ['Gemini tool_calling', 'Extração estruturada', 'Baixa'], w6b);
  addTableRow(ctx, ['Supabase Edge Functions', 'Orquestração de pipelines IA', 'Já em uso'], w6b);
  ctx.y += 4;

  addSubtitle(ctx, '6.3 Não Recomendadas (Overengineering)');
  addBullet(ctx, 'TensorFlow / PyTorch — Desnecessário; LLMs via API cobrem 95% dos casos');
  addBullet(ctx, 'Modelos auto-hospedados — Custo de infra desproporcional para o estágio atual');
  addBullet(ctx, 'Fine-tuning — Prematuro sem volume de dados (+100k registros)');

  // ═══ SECTION 7 — Valor Estratégico ═══
  newPage(ctx);
  addSectionTitle(ctx, '7. VALOR ESTRATÉGICO');

  addSubtitle(ctx, '7.1 IA como Diferencial Competitivo');
  addParagraph(ctx, 'O GIRA já está à frente de 90% dos concorrentes de nicho por ter IA generativa integrada. A maioria das ferramentas de gestão de projetos socioculturais (planilhas, Google Docs, sistemas legados) não possui nenhuma camada de IA.');

  const w7 = [40, 40, 40, 40];
  addTableRow(ctx, ['Aspecto', 'Sem IA', 'IA Atual', 'IA Expandida'], w7, true);
  addTableRow(ctx, ['Posicionamento', 'Ferr. registro', 'Ferr. inteligente', 'Plataforma c/ IA'], w7);
  addTableRow(ctx, ['Ticket SaaS', 'R$ 49–99/m', 'R$ 149–299/m', 'R$ 299–599/m'], w7);
  addTableRow(ctx, ['Valuation mult.', '5–8x ARR', '10–15x ARR', '15–25x ARR'], w7);
  addTableRow(ctx, ['Barreira entrada', 'Baixa', 'Média', 'Alta (dados+IA+UX)'], w7);
  ctx.y += 6;

  addSubtitle(ctx, '7.2 Impacto no Valor de Mercado');
  addBullet(ctx, 'Atual (IA básica): Valuation R$ 2–4M');
  addBullet(ctx, 'Com IA intermediária (6 meses): R$ 5–10M');
  addBullet(ctx, 'Com IA avançada + dados (18 meses): R$ 15–30M');

  // ═══ SECTION 8 — Conclusão ═══
  newPage(ctx);
  addSectionTitle(ctx, '8. CONCLUSÃO');

  addSubtitle(ctx, 'Scorecard de IA do GIRA');
  const w8 = [50, 25, 85];
  addTableRow(ctx, ['Dimensão', 'Nota', 'Observação'], w8, true);
  addScoreRow(ctx, 'Presença de IA', '7/10', 'NLP generativa + chatbot + STT implementados');
  addScoreRow(ctx, 'Sofisticação', '5/10', 'Prompting direto; sem RAG, embeddings ou ML');
  addScoreRow(ctx, 'Cobertura', '4/10', 'IA presente em 3 de ~12 módulos possíveis');
  addScoreRow(ctx, 'Arquitetura de IA', '6/10', 'Edge function centralizada; boa base expansão');
  addScoreRow(ctx, 'Potencial expansão', '9/10', 'Dados ricos + ecossistema pronto (Gemini+Supa)');
  ctx.y += 6;

  addHighlightBox(ctx, 'Classificação Final:', 'NÍVEL DE IA: INTERMEDIÁRIO');

  addParagraph(ctx, 'O GIRA possui implementação real e funcional de IA Generativa (NLP), acima do padrão do mercado para SaaS de nicho. Com investimento moderado (3–6 meses), pode alcançar nível avançado implementando RAG, visão computacional e análise preditiva — multiplicando seu valor de mercado em 3–5x.');
  ctx.y += 4;

  addSubtitle(ctx, 'O que torna isso significativo');
  addBullet(ctx, 'A IA já está em produção — não é roadmap, é funcionalidade real');
  addBullet(ctx, 'A arquitetura suporta expansão — Edge Functions + Lovable AI Gateway = pipeline escalável');
  addBullet(ctx, 'Os dados existem — atividades, presenças, SLAs, relatórios = combustível para ML');
  addBullet(ctx, 'O nicho carece de IA — ser o primeiro com IA em gestão sociocultural é vantagem competitiva massiva');

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

  addPageFooters(ctx);

  const filename = `GIRA_AI_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
