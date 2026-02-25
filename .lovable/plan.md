

# AUDITORIA ESTRUTURAL COMPLETA — GIRA Relatorios

---

## FASE 1 — MAPA DO SISTEMA

### 1.1 Paginas Relacionadas a Relatorios

| Arquivo | Responsabilidade | Tipo de Relatorio |
|---|---|---|
| `src/pages/ReportGenerator.tsx` | Relatorio Parcial de Cumprimento do Objeto | report_object |
| `src/pages/TeamReportGenerator.tsx` | Relatorio da Equipe de Trabalho | report_team |
| `src/pages/JustificationReportGenerator.tsx` | Justificativa de Prorrogacao | justification |
| `src/pages/ReportTemplates.tsx` | Listagem/gestao de templates | Todos |
| `src/pages/ReportTemplateEditor.tsx` | Edicao de templates | Todos |
| `src/pages/WysiwygEditorPage.tsx` | Editor visual WYSIWYG | Documentos avulsos |
| `src/pages/DocumentEditorPage.tsx` | Editor de documentos estruturado | Documentos avulsos |

### 1.2 Componentes Envolvidos

| Componente | Responsabilidade |
|---|---|
| `ReportToolbar` | Barra com botoes de modo (edit/preview), exportacao PDF/DOCX, link para WYSIWYG |
| `ReportStructureEditor` | Drag-and-drop de secoes (ordem, visibilidade, titulo, adicionar/remover) |
| `ReportVisualConfigEditor` | Editor visual de cabecalho (banner, logos), capa e rodape |
| `ReportEditSection` | Formulario de preenchimento de cada secao do Relatorio do Objeto |
| `ReportPreviewSection` | Renderizacao de preview de cada secao do Relatorio do Objeto |
| `ReportLogoEditor` | Upload e gestao de logos |
| `ReportPageEditor` | Editor de pagina individual |
| `PhotoGallerySection` | Grid de fotos com legendas |
| `ImageLayoutEditor` | Layout avancado Konva para posicionar fotos |
| `ImageEditorDialog` | Edicao/crop de imagens |
| `AiTextToolbar` / `AiNarrativeButton` | Geracao de texto via IA |
| `JustificationEditSection` | Editor de secoes da Justificativa |
| `JustificationPreviewSection` | Preview de secoes da Justificativa |
| `JustificationDraftsList` | Lista de rascunhos da Justificativa |
| `RichTextEditor` (Tiptap) | Editor rich-text compartilhado por TODOS os relatorios |
| `TeamReportPdfContent` | Componente React-PDF (nao utilizado no fluxo principal) |

### 1.3 Hooks Utilizados

| Hook | Busca dados de | Responsabilidade |
|---|---|---|
| `useReportState` | `projects.report_data` (via AppDataContext) | Estado do Relatorio do Objeto (conteudo, secoes, fotos, uploads). Salva em `projects.report_data` (JSONB) |
| `useReportVisualConfig` | `project_report_templates` (filtro: project_id + report_type) | Config visual (cabecalho, rodape, capa). Independente por tipo |
| `useJustificationReportState` | `justification_reports` (Supabase direto) | Estado da Justificativa. Salva em tabela dedicada |
| `useTeamReports` | `team_reports` (Supabase direto) | CRUD de rascunhos do Relatorio da Equipe |
| `useReportTemplates` | `report_templates` | CRUD de templates globais |
| `useJustificationReports` | `justification_reports` | Listagem de justificativas (redundante com useJustificationReportState) |

### 1.4 Duplicacao de Logica Identificada

1. **CRITICA: `useReportState` guarda campos visuais legados (logo, footerText, headerBannerUrl) no state local E esses campos tambem existem em `useReportVisualConfig`**. O `useReportState` inicializa a partir de `projects.report_data` e o `useReportVisualConfig` inicializa a partir de `project_report_templates.report_data`. Sao DUAS fontes de verdade para os mesmos dados visuais.

2. **Upload de logos duplicado**: `useReportState.handleLogoUpload` faz upload e seta state local. `useReportVisualConfig.handleLogoUpload` faz upload e seta + persiste. O `ReportGenerator` usa APENAS `useReportVisualConfig` para exibicao, mas `useReportState` ainda carrega e salva campos visuais no `projects.report_data`.

3. **Funcoes de filtro de atividades duplicadas**: `getActivitiesByGoal`, `getCommunicationActivities`, `getOtherActivities` e `formatActivityDate` existem em 3 locais: `useReportState`, `reportPdfExport.ts` e `docxExport.ts`.

4. **Gestao de secoes duplicada**: `moveSection`, `toggleVisibility`, `updateSectionTitle`, `addCustomSection`, `removeSection` sao implementadas identicamente em `useReportState` e `useJustificationReportState`.

5. **Logica de upload de fotos/docs duplicada**: Upload para Storage, geracao de URL publica e gestao de state sao copy-paste entre `useReportState`, `useJustificationReportState` e `TeamReportGenerator` (inline).

---

## FASE 2 — ESTRUTURA DE BANCO

### 2.1 Tabelas Relacionadas

| Tabela | Funcao | Campos-chave |
|---|---|---|
| `projects` | Armazena dados do projeto + `report_data` (JSONB legado) | `id`, `report_data`, `goals`, `team` |
| `project_report_templates` | Config visual POR projeto + tipo | `project_id`, `report_type`, `report_data` (JSONB), `template_id` (nullable) |
| `report_templates` | Templates globais reutilizaveis | `structure` (JSONB), `type`, `is_active` |
| `team_reports` | Rascunhos do Relatorio da Equipe | `project_id`, `team_member_id`, `execution_report`, `photos`, `photo_captions` |
| `justification_reports` | Rascunhos da Justificativa | `project_id`, `object_section`, `section_photos` (JSONB) |
| `documents` | Documentos do editor WYSIWYG | `project_id`, `content` (JSONB - DocumentModel) |
| `document_versions` | Historico de versoes do editor | `document_id`, `content_snapshot` |
| `audit_logs` / `system_logs` | Auditoria | `entity_type`, `action`, `old_data`, `new_data` |

### 2.2 Inconsistencias Encontradas

1. **Duplicacao de responsabilidade entre `projects.report_data` e `project_report_templates.report_data`**:
   - `projects.report_data` armazena: conteudo textual (narrativas, resumo), fotos por secao, metadata de fotos, layouts de pagina, E campos visuais legados (logo, headerBannerUrl, footerText).
   - `project_report_templates.report_data` armazena: configuracao visual (logo, banner, rodape, capa).
   - **Risco ALTO**: Os campos visuais existem em ambos os locais. O `useReportState` salva logo/banner em `projects.report_data`, enquanto `useReportVisualConfig` salva em `project_report_templates`. O exportador PDF le APENAS de `visualConfig` (correto), mas dados orfaos podem causar confusao.

2. **`project_report_templates.template_id` sempre NULL**: O campo `template_id` referencia `report_templates.id` mas na pratica nenhum relatorio cria esse vinculo. A coluna e inutil.

3. **`projects.report_data` e um "God Field"**: Contem narrativas, fotos, metadata, layouts, secoes customizadas, links de documentos, despesas — tudo em um unico campo JSONB sem schema. Qualquer mudanca pode corromper dados sem validacao.

4. **Nao existe `section_docs` na tabela `justification_reports`**: O hook `useJustificationReportState` salva `section_docs` como campo extra no payload, mas a tabela nao possui essa coluna. Os dados sao silenciosamente ignorados no INSERT/UPDATE.

5. **Scope de config visual**: `project_report_templates` usa `project_id + report_type` como chave logica mas NAO possui UNIQUE constraint. Pode haver registros duplicados.

---

## FASE 3 — PIPELINE DE EXPORTACAO

### 3.1 Fluxo Completo

```text
                    +-----------------------+
                    |   Preview (React)     |
                    |  (componentes inline  |
                    |   em cada Generator)  |
                    +-----------+-----------+
                                |
                    NÃO COMPARTILHA LÓGICA
                                |
                    +-----------v-----------+
                    |   Export Engine        |
                    |   (chamada direta)     |
                    +-----------+-----------+
                                |
               +----------------+----------------+
               |                                 |
    +----------v----------+           +----------v----------+
    |   PDF (jsPDF)       |           |   DOCX (docx lib)   |
    |   pdfHelpers.ts     |           |   docxExport.ts     |
    |   reportPdfExport   |           |   teamReportDocx    |
    |   teamReportPdf     |           |   justificationDocx |
    |   justificationPdf  |           +---------------------+
    +---------------------+
```

### 3.2 Biblioteca Utilizada

| Formato | Biblioteca | Motor |
|---|---|---|
| PDF (Relatorios) | **jsPDF** (nativo, client-side) | Motor manual com calculo de posicao Y, justificacao manual de texto, grid de fotos |
| PDF (Editor WYSIWYG) | **@react-pdf/renderer** | Motor declarativo React |
| DOCX | **docx** (lib) | Gerador estruturado |

### 3.3 Logica Duplicada entre Preview e Export

**Preview e Export sao engines COMPLETAMENTE DIFERENTES**.

- **Preview**: Renderizado via React/CSS com `style={{ fontFamily: 'Times New Roman', fontSize: '12pt', padding: '30mm 20mm 20mm 30mm' }}`. Utiliza CSS inline, flexbox e containers A4 (`min-h-[297mm]`).
- **PDF**: Renderizado via jsPDF com calculo manual de posicao Y (`ctx.currentY += LINE_H`), word-wrapping manual e justificacao manual.
- **DOCX**: Renderizado via lib `docx` com paragrafos estruturados.

**Implicacao**: NAO existe paridade garantida. O preview e uma aproximacao visual, nao uma representacao fiel do PDF. Divergencias sao inevitaveis.

### 3.4 Pontos Frageis

1. **Calculo de quebra de pagina no PDF e manual**: `ensureSpace(ctx, h)` verifica se `currentY + h > MAX_Y`. Se o bloco excede, cria nova pagina. Mas a altura estimada pode ser imprecisa (especialmente para texto rico com formatacao mista).

2. **O DOCX do Relatorio do Objeto NAO renderiza fotos nem galerias**: `docxExport.ts` apenas processa texto. Fotos sao completamente ignoradas.

3. **O DOCX nao processa rich-text HTML**: A funcao `textToParagraphs` faz split por `\n` e gera paragrafos planos. Tags `<strong>`, `<em>`, `<img>` sao descartadas.

4. **O headerConfig e copiado manualmente 3 vezes**: Os 3 exportadores PDF (`reportPdfExport`, `teamReportPdfExport`, `justificationPdfExport`) constroem `ctx.headerConfig` com o mesmo bloco de 20+ linhas de mapeamento de propriedades. Qualquer correcao precisa ser replicada em 3 arquivos.

5. **O post-pass de footer/header funciona de forma global**: `addFooterAndPageNumbers` itera por TODAS as paginas do PDF e carimba header/footer. Nao ha mecanismo para excluir paginas intermediarias.

---

## FASE 4 — PAGINACAO E LAYOUT

### 4.1 Calculo de Alturas

| Variavel | Valor | Definido em |
|---|---|---|
| `MT` (margin top) | 30mm | `pdfHelpers.ts` |
| `MB` (margin bottom) | 20mm | `pdfHelpers.ts` |
| `MAX_Y` | 273mm (`PAGE_H - MB - 4`) | `pdfHelpers.ts` |
| `LINE_H` | 7.2mm | `pdfHelpers.ts` |
| `HEADER_BANNER_H` | 20mm | `pdfHelpers.ts` |
| `HEADER_LOGO_H` | 12mm | `pdfHelpers.ts` |
| `headerContentSpacing` | Configuravel (default 8mm) | `ReportVisualConfig` |

### 4.2 Calculo de `contentStartY`

```text
getContentStartY(ctx):
  Se tem banner: topPadding + bannerHeight + contentSpacing
  Se tem logos:  topPadding + 3 + headerHeight + contentSpacing
  Senao:         MT (30mm)
```

### 4.3 Calculo de `footerY`

```text
footerLineY = PAGE_H - 18 = 279mm
pageNumber = PAGE_H - 10 = 287mm
```

### 4.4 Duplicacao de Margem

**SIM, existe duplicacao**. O preview aplica `padding: '30mm 20mm 20mm 30mm'` via CSS, enquanto o PDF usa constantes `ML=30, MR=20, MT=30, MB=20`. Os valores coincidem, mas sao definidos em locais independentes sem vinculo.

### 4.5 Preview = PDF?

**NAO. Sao engines completamente diferentes.**

- Preview: CSS containers com `min-h-[297mm]`, sem quebra de pagina real (cada secao visivel gera um container A4 separado, mas o conteudo pode exceder).
- PDF: Calculo manual de posicao com `ensureSpace` e `addPage`.
- O preview cria 1 pagina A4 por secao. O PDF pode quebrar uma secao em multiplas paginas ou consolidar multiplas secoes em uma pagina.

---

## FASE 5 — IDENTIFICACAO DE REGRESSOES

### Risco CRITICO

| # | Problema | Arquivo(s) | Risco |
|---|---|---|---|
| 1 | **Duas fontes de verdade para config visual** (projects.report_data vs project_report_templates) | `useReportState`, `useReportVisualConfig` | CRITICO |
| 2 | **Preview e PDF sao engines diferentes** — divergencia inevitavel | `ReportGenerator.tsx` vs `reportPdfExport.ts` | CRITICO |
| 3 | **DOCX nao exporta fotos, rich-text nem galerias** | `docxExport.ts` | CRITICO |

### Risco ALTO

| # | Problema | Arquivo(s) |
|---|---|---|
| 4 | `headerConfig` copiado em 3 exportadores PDF (20+ linhas identicas) | `reportPdfExport`, `teamReportPdfExport`, `justificationPdfExport` |
| 5 | `section_docs` salvo pela Justificativa mas coluna NAO existe na tabela | `useJustificationReportState` |
| 6 | Sem UNIQUE constraint em `project_report_templates(project_id, report_type)` | Schema DB |
| 7 | `projects.report_data` e um God Field sem schema — nenhuma validacao | `useReportState`, `projects` table |

### Risco MEDIO

| # | Problema | Arquivo(s) |
|---|---|---|
| 8 | Funcoes de filtro de atividades duplicadas em 3 locais | `useReportState`, `reportPdfExport.ts`, `docxExport.ts` |
| 9 | Logica de gestao de secoes copy-paste entre 2 hooks | `useReportState`, `useJustificationReportState` |
| 10 | Upload de fotos/docs duplicado em 3 modulos (sem utilitario compartilhado) | Hooks de estado |
| 11 | `useJustificationReports` e redundante com `useJustificationReportState` | Hooks |
| 12 | Preview renderiza rodape com `<ReportFooter>` inline (JSX), PDF renderiza com `addFooterAndPageNumbers` (jsPDF) — logica desacoplada | `ReportGenerator.tsx` vs `pdfHelpers.ts` |

### Risco BAIXO

| # | Problema | Arquivo(s) |
|---|---|---|
| 13 | Valor magico `* 3` e `* 2.5` para conversao mm→px no preview | `ReportGenerator.tsx` (linhas 100-103, 113, 248-249) |
| 14 | `project_report_templates.template_id` sempre NULL | Schema DB |
| 15 | `TeamReportGenerator` nao utiliza hook de estado dedicado — state todo inline (~500 linhas) | `TeamReportGenerator.tsx` |

---

## FASE 6 — AVALIACAO DE MATURIDADE

### Classificacao: **Nivel 3 — Funcional com Inconsistencias**

### Justificativa Tecnica

**Pontos positivos (justificam acima de Nivel 2):**
- O motor PDF centralizado em `pdfHelpers.ts` e bem estruturado com constantes ABNT, funcoes reutilizaveis e post-pass de header/footer
- Config visual por projeto + tipo (`useReportVisualConfig`) e um padrao solido
- Suporte a rich-text (bold/italic/underline) no PDF com composite words
- Sistema de galeria inline funcional
- Persistencia de rascunhos com soft-delete

**Pontos negativos (impedem Nivel 4):**
- Duas fontes de verdade para dados visuais (regressao estrutural)
- Preview e PDF sao engines independentes sem paridade garantida
- DOCX ignora fotos, rich-text e galerias (exportacao parcial)
- God Field `projects.report_data` sem schema
- Duplicacao massiva de logica entre modulos (uploads, secoes, filtros)
- Sem testes automatizados para exportacao
- `TeamReportGenerator` com 1000+ linhas de state inline (nao modularizado)
- Coluna inexistente sendo gravada silenciosamente (`section_docs` na Justificativa)

---

## RECOMENDACAO ESTRATEGICA (sem implementar)

### Prioridade 1 — Eliminar fontes de verdade duplicadas
- Remover campos visuais legados de `projects.report_data` (logo, headerBannerUrl, footerText, etc.)
- Consolidar TODA config visual em `project_report_templates.report_data` via `useReportVisualConfig`
- Limpar `useReportState` para conter APENAS dados de conteudo

### Prioridade 2 — Unificar motor de exportacao
- Extrair `buildHeaderConfig(vc)` como funcao utilitaria em `pdfHelpers.ts` para eliminar as 3 copias
- Criar `writeHtmlContent(ctx, html)` como funcao publica em `pdfHelpers.ts` (ja existe localmente em `reportPdfExport`)
- Atualizar `docxExport.ts` para processar HTML via parser (usar `parseHtmlToBlocks`)

### Prioridade 3 — Modularizar codigo duplicado
- Extrair hooks utilitarios: `useSectionManager`, `useFileUploader`, `useActivityFilters`
- Refatorar `TeamReportGenerator` para usar hook de estado dedicado (similar a `useJustificationReportState`)

### Prioridade 4 — Corrigir integridade de dados
- Adicionar UNIQUE constraint em `project_report_templates(project_id, report_type)`
- Adicionar coluna `section_docs` na tabela `justification_reports`
- Considerar migrar `projects.report_data` conteudo para tabela dedicada `report_object_drafts`

### Prioridade 5 — Aproximar preview do PDF
- Substituir o preview CSS por um renderizador que use as mesmas constantes de layout do `pdfHelpers.ts` (ou usar `@react-pdf/renderer` como camada de preview unificada)

