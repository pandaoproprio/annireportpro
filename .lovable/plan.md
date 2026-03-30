

# Auditoria Tecnica Completa — GIRA Relatorios: Exportacao e Evolucao

---

## 1. DIAGNOSTICO GERAL

O sistema possui **dois motores de exportacao PDF completamente distintos** e um motor DOCX parcialmente implementado:

| Motor | Usado por | Tecnologia | Execucao |
|---|---|---|---|
| **Browserless/Puppeteer** | Relatorio do Objeto (`export-object-report-pdf`) | HTML → PDF server-side | Edge Function |
| **jsPDF** (client-side) | Relatorio da Equipe, Justificativa | Canvas manual com calculo Y | Navegador |
| **docx** (client-side) | Relatorio do Objeto | Gerador estruturado | Navegador |

---

## 2. CAUSAS RAIZ DOS ERROS DE EXPORTACAO (Priorizadas)

### CR-1: Conflito `position: fixed` + `@page margin: 0` + margem Puppeteer

**Problema**: O CSS define `@page { margin: 0 }` (linha 818) e delega as margens ao Puppeteer (`margin: { top: "36mm", ... }` — linha 1146). O header usa `position: fixed; top: 0; left: 30mm; right: 20mm; height: 26mm`. Em Chromium headless, `position: fixed` em contexto de impressao se comporta como `position: running(header)` — o elemento e repetido em TODAS as paginas, mas ocupa espaco DENTRO da area de margem definida pelo Puppeteer.

**Por que falha**: A margem de 36mm do Puppeteer cria um espaco VAZIO acima do conteudo. O header fixo renderiza nesse espaco. MAS — o conteudo do `<body>` começa na posicao Y=0 do viewport (pois `@page margin: 0`), e o Puppeteer empurra 36mm. O header com `left: 30mm; right: 20mm` fica desalinhado quando a margem esquerda do Puppeteer tambem e 30mm, duplicando o offset (o header recua 30mm da margem, que ja recua 30mm da borda).

**Tentativas anteriores falharam porque**: Ajustaram margem do Puppeteer OU CSS, nunca ambos em sincronia.

### CR-2: Imagens nao carregadas antes da captura

**Problema**: O script inline (linhas 1070-1079) seta `loading="eager"` e `decoding="sync"`, mas NAO AGUARDA o carregamento. O `gotoOptions.waitUntil: "networkidle2"` espera que a rede fique ociosa, mas imagens do Supabase Storage que exigem redirect (render/image) podem nao ser contadas como requests pendentes pelo Chromium.

**Por que falha**: Nao ha `Promise.all` + `img.decode()` nem `waitForFunction` que garanta que todas as imagens tenham `naturalWidth > 0`.

### CR-3: Tabela de despesas com overflow oculto

**Problema**: A classe `.table-wrap` tinha `overflow: hidden` removido (comentario na linha 948), mas a tabela com `table-layout: fixed` e colunas com largura percentual (24%/46%/30%) pode clipar conteudo longo em celulas. A thumbnail (`.expense-thumb`) tem `max-height: 100px` com `object-fit: cover`, o que reduz drasticamente fotos horizontais.

### CR-4: Grid de fotos com `grid-template-columns: repeat(2, 1fr)` sem fallback

**Problema**: CSS Grid em contexto de impressao Chromium pode gerar itens com altura 0 quando o container nao tem altura explicita e o item usa `break-inside: avoid`. Se um item de foto (imagem 200px + caption) nao cabe no restante da pagina, ele e empurrado para a proxima, mas o grid slot original permanece vazio.

### CR-5: Motor jsPDF (Equipe/Justificativa) — calculo manual de paginacao

**Problema**: Os relatorios da Equipe e Justificativa usam `src/lib/pdf/` (jsPDF), que calcula posicao Y manualmente. A funcao `ensureSpace` verifica se ha espaco, mas nao lida com blocos de rich-text que excedem uma pagina inteira. Imagens grandes ou galerias com muitas fotos podem estourar `MAX_Y` sem quebra.

### CR-6: DOCX sem fotos nem rich-text

**Problema**: `src/lib/docxExport.ts` NAO renderiza fotos (nem thumbnails de despesas, nem galerias). Rich-text HTML e tratado como texto plano (`textToParagraphs` faz `text.split('\n')`). A tabela de despesas DOCX tem apenas 2 colunas (Item + Descricao) — sem coluna de Registro Fotografico.

---

## 3. PONTOS EXATOS DO SISTEMA AFETADOS

```text
supabase/functions/export-object-report-pdf/index.ts
  L818   @page { margin: 0 }           ← conflito com margem Puppeteer
  L835   left: 30mm; right: 20mm       ← offset duplicado
  L1146  margin: { top: "36mm", ... }  ← colide com @page
  L1070  Script inline sem await        ← imagens nao garantidas

src/lib/docxExport.ts
  L258-298  Tabela despesas sem fotos
  L56-78    textToParagraphs ignora HTML
  L351-353  Custom sections: texto plano

src/lib/pdf/ (jsPDF — Equipe/Justificativa)
  pageLayout.ts    ensureSpace nao fraciona blocos grandes
  imageHelpers.ts  loadImage com fallback triplo (funcional, mas lento)

src/lib/reportPdfExport.ts
  L61-74  Client-side apenas invoca Edge Function (OK)
```

---

## 4. DETECCAO DE DUPLICIDADE E INTEGRIDADE

| Problema | Localizacao |
|---|---|
| Filtro de atividades deletadas implementado 3x com logica identica | Edge Function (`isSoftDeletedActivity`), `docxExport.ts` (`isDeletedActivity`), `src/lib/pdf/` |
| `headerConfig` construido separadamente em 3 exportadores | `teamReportPdfExport`, `justificationPdfExport`, Edge Function |
| Nenhum exportador usa `DISTINCT` ou `GROUP BY` — sao arrays recebidos do frontend | N/A (nao ha queries SQL nos exportadores) |
| Fotos duplicadas: sem deduplicacao global entre `goalPhotos`, `sectionPhotos` e `activity.photos` | Edge Function linhas 639-643, client jsPDF |

---

## 5. EVOLUCAO DA INTELIGENCIA (Analytics)

### Estado atual
O sistema **lista dados** e gera narrativas via IA, mas NAO faz:
- Analise de Desvio (Planned vs Actual)
- Predicao de Burn Rate
- Alertas de Inconsistencia Contabil

### Componentes existentes que servem de base
- `PredictiveAnalysisDashboard.tsx` — projeta atrasos com baseline historico
- `BenchmarkingDashboard.tsx` — comparativo entre projetos
- `performance_snapshots` — tabela de snapshots mensais
- `report_performance_tracking` — lead/cycle time por relatorio

### Roteiro para Dashboards Preditivos
1. **Desvio Planejado vs Realizado**: Cruzar `projects.goals` (metas planejadas) com `activities` (execucao real) para calcular % de conclusao por meta
2. **Burn Rate**: Usar `project_budget` + `budget_adjustments` para projetar data de esgotamento
3. **Alertas Contabeis**: Comparar soma de `expenses` com orcamento aprovado e gerar alertas quando desvio > threshold

---

## 6. INTERFACE DE AUDITORIA

O sistema **NAO** inclui:
- Data da Extracao no rodape do PDF
- Hash de Integridade (SHA-256 do conteudo)
- Versionamento do documento gerado

O campo `formatLongDate()` (linha 176) gera a data atual para assinatura, mas nao e um timestamp de extracao com hora/minuto.

---

## 7. RISCOS DE CONTINUAR COM A ABORDAGEM ATUAL

1. **Header sempre vai sobrepor** enquanto houver conflito `@page margin: 0` + `position: fixed` + margem Puppeteer
2. **Imagens vao falhar esporadicamente** sem mecanismo de espera deterministico
3. **DOCX e um documento incompleto** — usuarios que dependem dele perdem fotos e formatacao
4. **Dois motores PDF (jsPDF vs Browserless)** geram documentos visualmente diferentes para o mesmo sistema
5. **Sem hash de integridade**, documentos nao tem validade juridica para auditoria externa

---

## 8. PLANO DE CORRECAO (Ordem de Execucao)

### Fase 1 — Estabilizar PDF do Objeto (Edge Function)
1. Eliminar conflito de margens: Remover `position: fixed` do header. Usar tecnica de `display: table-header-group` para repetir header em cada pagina, ou usar a API `headerTemplate` do Puppeteer
2. Implementar espera deterministica de imagens: Adicionar `waitForFunction` que verifica `document.images` todas com `complete === true`
3. Permitir que tabelas e grids de fotos quebrem naturalmente entre paginas

### Fase 2 — Corrigir DOCX
4. Adicionar coluna "Registro Fotografico" com `ImageRun` (biblioteca `docx` suporta)
5. Implementar parser HTML → `docx` Paragraphs com formatacao (bold, italic, listas)

### Fase 3 — Unificar motores
6. Migrar Relatorio da Equipe e Justificativa de jsPDF para Browserless (mesma Edge Function parametrizada ou funcoes separadas com CSS compartilhado)
7. Extrair CSS compartilhado para template reutilizavel

### Fase 4 — Integridade e Auditoria
8. Adicionar timestamp de extracao (`DD/MM/AAAA HH:mm`) no rodape do PDF
9. Gerar SHA-256 do HTML antes de enviar ao Browserless e incluir no rodape
10. Registrar exportacao em `audit_logs`

### Fase 5 — Analytics Preditivos
11. Criar funcao `calculate_goal_deviation` (planejado vs realizado)
12. Criar funcao `project_burn_rate` (orcamento restante / velocidade de gasto)
13. Criar componente `DeviationAlertBanner` no Dashboard

---

Deseja que eu execute o Plano comecando pela **Fase 1** (estabilizar o PDF do Objeto)?

