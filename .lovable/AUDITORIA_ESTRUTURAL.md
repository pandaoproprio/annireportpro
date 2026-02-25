# AUDITORIA ESTRUTURAL COMPLETA — GIRA Relatórios

> Gerado em: 2026-02-25
> Status: Aprovado
> Nível de Maturidade: **3 — Funcional com Inconsistências**

---

## FASE 1 — MAPA DO SISTEMA

### 1.1 Páginas Relacionadas a Relatórios

| Arquivo | Responsabilidade | Tipo de Relatório |
|---|---|---|
| `src/pages/ReportGenerator.tsx` | Relatório Parcial de Cumprimento do Objeto | report_object |
| `src/pages/TeamReportGenerator.tsx` | Relatório da Equipe de Trabalho | report_team |
| `src/pages/JustificationReportGenerator.tsx` | Justificativa de Prorrogação | justification |
| `src/pages/ReportTemplates.tsx` | Listagem/gestão de templates | Todos |
| `src/pages/ReportTemplateEditor.tsx` | Edição de templates | Todos |
| `src/pages/WysiwygEditorPage.tsx` | Editor visual WYSIWYG | Documentos avulsos |
| `src/pages/DocumentEditorPage.tsx` | Editor de documentos estruturado | Documentos avulsos |

### 1.2 Componentes Envolvidos

| Componente | Responsabilidade |
|---|---|
| `ReportToolbar` | Barra com botões de modo (edit/preview), exportação PDF/DOCX, link para WYSIWYG |
| `ReportStructureEditor` | Drag-and-drop de seções (ordem, visibilidade, título, adicionar/remover) |
| `ReportVisualConfigEditor` | Editor visual de cabeçalho (banner, logos), capa e rodapé |
| `ReportEditSection` | Formulário de preenchimento de cada seção do Relatório do Objeto |
| `ReportPreviewSection` | Renderização de preview de cada seção do Relatório do Objeto |
| `ReportLogoEditor` | Upload e gestão de logos |
| `ReportPageEditor` | Editor de página individual |
| `PhotoGallerySection` | Grid de fotos com legendas |
| `ImageLayoutEditor` | Layout avançado Konva para posicionar fotos |
| `ImageEditorDialog` | Edição/crop de imagens |
| `AiTextToolbar` / `AiNarrativeButton` | Geração de texto via IA |
| `JustificationEditSection` | Editor de seções da Justificativa |
| `JustificationPreviewSection` | Preview de seções da Justificativa |
| `JustificationDraftsList` | Lista de rascunhos da Justificativa |
| `RichTextEditor` (Tiptap) | Editor rich-text compartilhado por TODOS os relatórios |
| `TeamReportPdfContent` | Componente React-PDF (não utilizado no fluxo principal) |

### 1.3 Hooks Utilizados

| Hook | Busca dados de | Responsabilidade |
|---|---|---|
| `useReportState` | `projects.report_data` (via AppDataContext) | Estado do Relatório do Objeto (conteúdo, seções, fotos, uploads). Salva em `projects.report_data` (JSONB) |
| `useReportVisualConfig` | `project_report_templates` (filtro: project_id + report_type) | Config visual (cabeçalho, rodapé, capa). Independente por tipo |
| `useJustificationReportState` | `justification_reports` (Supabase direto) | Estado da Justificativa. Salva em tabela dedicada |
| `useTeamReports` | `team_reports` (Supabase direto) | CRUD de rascunhos do Relatório da Equipe |
| `useReportTemplates` | `report_templates` | CRUD de templates globais |
| `useJustificationReports` | `justification_reports` | Listagem de justificativas (redundante com useJustificationReportState) |

### 1.4 Duplicação de Lógica Identificada

1. **CRÍTICA: `useReportState` guarda campos visuais legados (logo, footerText, headerBannerUrl) no state local E esses campos também existem em `useReportVisualConfig`**. São DUAS fontes de verdade para os mesmos dados visuais.
2. **Upload de logos duplicado**: `useReportState.handleLogoUpload` faz upload e seta state local. `useReportVisualConfig.handleLogoUpload` faz upload e seta + persiste.
3. **Funções de filtro de atividades duplicadas** em 3 locais: `useReportState`, `reportPdfExport.ts` e `docxExport.ts`.
4. **Gestão de seções duplicada**: `moveSection`, `toggleVisibility`, `updateSectionTitle`, `addCustomSection`, `removeSection` implementadas identicamente em `useReportState` e `useJustificationReportState`.
5. **Lógica de upload de fotos/docs duplicada** entre `useReportState`, `useJustificationReportState` e `TeamReportGenerator` (inline).

---

## FASE 2 — ESTRUTURA DE BANCO

### 2.1 Tabelas Relacionadas

| Tabela | Função | Campos-chave |
|---|---|---|
| `projects` | Dados do projeto + `report_data` (JSONB legado) | `id`, `report_data`, `goals`, `team` |
| `project_report_templates` | Config visual POR projeto + tipo | `project_id`, `report_type`, `report_data` (JSONB), `template_id` (nullable) |
| `report_templates` | Templates globais reutilizáveis | `structure` (JSONB), `type`, `is_active` |
| `team_reports` | Rascunhos do Relatório da Equipe | `project_id`, `team_member_id`, `execution_report`, `photos`, `photo_captions` |
| `justification_reports` | Rascunhos da Justificativa | `project_id`, `object_section`, `section_photos` (JSONB) |
| `documents` | Documentos do editor WYSIWYG | `project_id`, `content` (JSONB) |
| `document_versions` | Histórico de versões do editor | `document_id`, `content_snapshot` |
| `audit_logs` / `system_logs` | Auditoria | `entity_type`, `action`, `old_data`, `new_data` |

### 2.2 Inconsistências Encontradas

1. **Duplicação de responsabilidade** entre `projects.report_data` e `project_report_templates.report_data` — campos visuais existem em ambos.
2. **`project_report_templates.template_id` sempre NULL** — coluna inútil.
3. **`projects.report_data` é um "God Field"** — JSONB sem schema, vulnerável a corrupção.
4. **Coluna `section_docs` não existe** na tabela `justification_reports` — dados silenciosamente ignorados.
5. **Sem UNIQUE constraint** em `project_report_templates(project_id, report_type)` — risco de duplicatas.

---

## FASE 3 — PIPELINE DE EXPORTAÇÃO

### 3.1 Fluxo

```
Preview (React/CSS) ──── NÃO COMPARTILHA LÓGICA ──── Export Engine
                                                         │
                                              ┌──────────┴──────────┐
                                              │                     │
                                         PDF (jsPDF)          DOCX (docx lib)
                                         pdfHelpers.ts        docxExport.ts
                                         reportPdfExport      teamReportDocx
                                         teamReportPdf        justificationDocx
                                         justificationPdf
```

### 3.2 Bibliotecas

| Formato | Biblioteca | Motor |
|---|---|---|
| PDF (Relatórios) | **jsPDF** | Motor manual com cálculo de posição Y |
| PDF (Editor WYSIWYG) | **@react-pdf/renderer** | Motor declarativo React |
| DOCX | **docx** | Gerador estruturado |

### 3.3 Pontos Frágeis

1. Cálculo de quebra de página manual e impreciso para rich-text
2. DOCX do Relatório do Objeto NÃO renderiza fotos nem galerias
3. DOCX não processa rich-text HTML
4. `headerConfig` copiado manualmente em 3 exportadores PDF
5. Post-pass de footer/header sem mecanismo de exclusão por página

---

## FASE 4 — PAGINAÇÃO E LAYOUT

### 4.1 Constantes

| Variável | Valor | Definido em |
|---|---|---|
| `MT` | 30mm | `pdfHelpers.ts` |
| `MB` | 20mm | `pdfHelpers.ts` |
| `MAX_Y` | 273mm | `pdfHelpers.ts` |
| `LINE_H` | 7.2mm | `pdfHelpers.ts` |

### 4.2 Preview ≠ PDF

- **Preview**: CSS containers `min-h-[297mm]`, sem quebra de página real
- **PDF**: Cálculo manual com `ensureSpace` e `addPage`
- **Divergência inevitável**: são engines completamente diferentes

---

## FASE 5 — CLASSIFICAÇÃO DE RISCOS

### CRÍTICO

| # | Problema | Arquivo(s) |
|---|---|---|
| 1 | Duas fontes de verdade para config visual | `useReportState`, `useReportVisualConfig` |
| 2 | Preview e PDF são engines diferentes | `ReportGenerator.tsx` vs `reportPdfExport.ts` |
| 3 | DOCX não exporta fotos, rich-text nem galerias | `docxExport.ts` |

### ALTO

| # | Problema | Arquivo(s) |
|---|---|---|
| 4 | `headerConfig` copiado em 3 exportadores PDF | `reportPdfExport`, `teamReportPdfExport`, `justificationPdfExport` |
| 5 | `section_docs` salvo mas coluna não existe | `useJustificationReportState` |
| 6 | Sem UNIQUE constraint | `project_report_templates` |
| 7 | God Field sem schema | `projects.report_data` |

### MÉDIO

| # | Problema | Arquivo(s) |
|---|---|---|
| 8 | Filtros de atividades duplicados em 3 locais | `useReportState`, `reportPdfExport.ts`, `docxExport.ts` |
| 9 | Gestão de seções copy-paste | `useReportState`, `useJustificationReportState` |
| 10 | Upload duplicado em 3 módulos | Hooks de estado |
| 11 | `useJustificationReports` redundante | Hooks |
| 12 | Rodapé desacoplado entre preview e PDF | `ReportGenerator.tsx` vs `pdfHelpers.ts` |

### BAIXO

| # | Problema | Arquivo(s) |
|---|---|---|
| 13 | Valores mágicos `* 3` e `* 2.5` para conversão mm→px | `ReportGenerator.tsx` |
| 14 | `template_id` sempre NULL | Schema DB |
| 15 | `TeamReportGenerator` sem hook dedicado (~500 linhas inline) | `TeamReportGenerator.tsx` |

---

## FASE 6 — AVALIAÇÃO DE MATURIDADE

### Classificação: **Nível 3 — Funcional com Inconsistências**

**Pontos positivos:**
- Motor PDF centralizado em `pdfHelpers.ts` com constantes ABNT
- Config visual por projeto + tipo é um padrão sólido
- Suporte a rich-text no PDF com composite words
- Sistema de galeria inline funcional
- Persistência de rascunhos com soft-delete

**Pontos negativos:**
- Duas fontes de verdade para dados visuais
- Preview e PDF independentes sem paridade
- DOCX com exportação parcial
- God Field sem schema
- Duplicação massiva de lógica
- Sem testes automatizados para exportação
- `TeamReportGenerator` com 1000+ linhas inline

---

## RECOMENDAÇÃO ESTRATÉGICA

### Prioridade 1 — Eliminar fontes de verdade duplicadas
- Remover campos visuais legados de `projects.report_data`
- Consolidar TODA config visual em `project_report_templates.report_data`
- Limpar `useReportState` para conter APENAS dados de conteúdo

### Prioridade 2 — Unificar motor de exportação
- Extrair `buildHeaderConfig(vc)` como função utilitária em `pdfHelpers.ts`
- Criar `writeHtmlContent(ctx, html)` como função pública
- Atualizar `docxExport.ts` para processar HTML

### Prioridade 3 — Modularizar código duplicado
- Extrair hooks: `useSectionManager`, `useFileUploader`, `useActivityFilters`
- Refatorar `TeamReportGenerator` para usar hook dedicado

### Prioridade 4 — Corrigir integridade de dados
- UNIQUE constraint em `project_report_templates(project_id, report_type)`
- Coluna `section_docs` em `justification_reports`
- Migrar conteúdo de `projects.report_data` para tabela dedicada

### Prioridade 5 — Aproximar preview do PDF
- Renderizador de preview com mesmas constantes de `pdfHelpers.ts`
