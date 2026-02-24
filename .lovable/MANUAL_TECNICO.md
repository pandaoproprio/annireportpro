# Manual Técnico — Sistema de Relatórios

> Gerado em: 2026-02-24
> Objetivo: Permitir que qualquer desenvolvedor entenda e corrija o sistema sem tentativa e erro.

---

## 1. Arquitetura Geral

O sistema de relatórios segue o fluxo:

```
useReportVisualConfig (config visual)  ─┐
useReportState (conteúdo do relatório) ─┤
                                        ├─► ReportGenerator.tsx (preview web)
                                        ├─► reportPdfExport.ts (export PDF)
                                        └─► docxExport.ts (export DOCX)
```

A config visual e o conteúdo são duas entidades **independentes**:
- **Config Visual**: salva em `project_report_templates` (por `project_id + report_type`)
- **Conteúdo**: salvo em `projects.report_data` (JSON no campo `report_data`)

---

## 2. Banner — Arquivos e Funções

| Responsabilidade | Arquivo | Função/Linha |
|---|---|---|
| Upload do banner | `src/hooks/useReportVisualConfig.tsx` | `handleBannerUpload()` (L231) |
| Estado local do banner | `src/hooks/useReportVisualConfig.tsx` | `config.headerBannerUrl`, `config.headerBannerHeightMm`, `config.headerBannerFit`, `config.headerBannerVisible` |
| Persistência do banner | `src/hooks/useReportVisualConfig.tsx` | `saveConfig()` (L178) → salva em `project_report_templates.report_data` |
| Controles UI do banner | `src/components/report/ReportVisualConfigEditor.tsx` | Seção "Modo A" (L231-279) |
| Preview do banner (web) | `src/pages/ReportGenerator.tsx` | `ReportHeader()` (L103-128) |
| PDF: pré-carregamento | `src/lib/pdfHelpers.ts` | `preloadHeaderImages()` (L465-478) |
| PDF: renderização por página | `src/lib/pdfHelpers.ts` | `renderHeaderOnPage()` (L481-567) |
| PDF: cálculo contentStartY | `src/lib/pdfHelpers.ts` | `getContentStartY()` (L80-96) |
| PDF: post-pass (carimbo) | `src/lib/pdfHelpers.ts` | `addFooterAndPageNumbers()` (L570-651) |

### Fluxo do Banner no PDF:
1. `exportReportToPdf()` chama `preloadHeaderImages()` para carregar banner como DataURL
2. Cria `ctx` e seta `ctx.headerConfig` com as imagens + configurações
3. Todo conteúdo é renderizado com `addPage()` calculando `getContentStartY()` baseado em `bannerHeightMm`
4. No final, `addFooterAndPageNumbers()` faz o post-pass carimbando header em todas as páginas (exceto capa)

### ⚠️ Causa raiz do banner cobrindo texto (CORRIGIDO):
`getContentStartY()` usava `headerHeightMm` (20mm padrão) em vez de `bannerHeightMm` (até 60mm). Agora usa `bannerHeightMm` quando banner está presente.

---

## 3. Layout / Margens — Arquivos e Constantes

| Constante | Valor | Arquivo | Linha |
|---|---|---|---|
| `PAGE_W` | 210mm | `src/lib/pdfHelpers.ts` | L7 |
| `PAGE_H` | 297mm | `src/lib/pdfHelpers.ts` | L8 |
| `ML` (margem esquerda) | 30mm | `src/lib/pdfHelpers.ts` | L9 |
| `MR` (margem direita) | 20mm | `src/lib/pdfHelpers.ts` | L10 |
| `MT` (margem superior) | 30mm | `src/lib/pdfHelpers.ts` | L11 |
| `MB` (margem inferior) | 20mm | `src/lib/pdfHelpers.ts` | L12 |
| `CW` (largura conteúdo) | 160mm | `src/lib/pdfHelpers.ts` | L13 |
| `MAX_Y` (limite rodapé) | 273mm | `src/lib/pdfHelpers.ts` | L14 |
| `LINE_H` (entrelinha) | 7.2mm | `src/lib/pdfHelpers.ts` | L15 |
| `INDENT` (recuo 1ª linha) | 12.5mm | `src/lib/pdfHelpers.ts` | L19 |

### Funções de layout:
- `addPage()` → incrementa página, calcula `currentY` via `getContentStartY()`
- `ensureSpace()` → verifica se cabe; se não, chama `addPage()`
- `addParagraph()` → justificação manual com recuo na 1ª linha

---

## 4. Exportação PDF

| Relatório | Arquivo de exportação | Chamada principal |
|---|---|---|
| Relatório do Objeto | `src/lib/reportPdfExport.ts` | `exportReportToPdf()` |
| Relatório da Equipe | `src/lib/teamReportPdfExport.ts` | `exportTeamReportToPdf()` |
| Justificativa | `src/lib/justificationPdfExport.ts` | `exportJustificationToPdf()` |

Todos consomem funções de `src/lib/pdfHelpers.ts` como única fonte de verdade.

### Fluxo de exportação (exemplo: Relatório do Objeto):
1. `exportReportToPdf()` recebe `ReportPdfExportData` com `visualConfig`
2. Pré-carrega imagens (`preloadHeaderImages`)
3. Cria `PdfContext` com `createPdfContext()`
4. Renderiza Capa (página 1) sem headerConfig
5. Seta `ctx.headerConfig` e chama `addPage()` para página 2+
6. Renderiza seções visíveis em ordem
7. Chama `addFooterAndPageNumbers()` para post-pass global
8. Salva via `pdf.save()`

---

## 5. Exportação DOCX

| Relatório | Arquivo de exportação |
|---|---|
| Relatório do Objeto | `src/lib/docxExport.ts` |
| Relatório da Equipe | `src/lib/teamReportDocxExport.ts` |
| Justificativa | `src/lib/justificationDocxExport.ts` |

Todos usam a biblioteca `docx` para gerar documentos Word com seções, parágrafos e rodapé.

---

## 6. Persistência da Config Visual

| O quê | Onde salva | Chave |
|---|---|---|
| Config visual (banner, logos, capa, rodapé) | `project_report_templates.report_data` | `project_id + report_type` |
| Conteúdo do relatório (texto, fotos, seções) | `projects.report_data` | `project_id` |

### Hook: `useReportVisualConfig.tsx`
- **Load**: `useEffect` busca por `project_id + report_type` na tabela `project_report_templates`
- **Save**: `saveConfig()` faz upsert na mesma tabela
- **Tipos de relatório**: `'report_object'`, `'report_team'`, `'justification'`

### ⚠️ Causa raiz do banner não persistindo (CORRIGIDO):
O botão "Salvar Rascunho" chamava apenas `saveReportData()` (que salva em `projects.report_data`), mas NÃO chamava `vc.saveConfig()`. Agora chama ambos.

---

## 7. Quebra de Página

### No Preview:
- Capa e conteúdo são renderizados como containers A4 **separados** com `mb-8` e `shadow-2xl`
- Cada container tem `min-h-[297mm]` para simular tamanho real A4

### No PDF:
- `addPage()` em `pdfHelpers.ts` adiciona nova página jsPDF
- `ensureSpace()` verifica se conteúdo cabe antes de `MAX_Y`
- Fotos: `addPhotoGrid()` e `addPhotoLayout()` gerenciam quebras automáticas

---

## 8. Rodapé — Montagem

| Onde | Arquivo | Função |
|---|---|---|
| Preview (web) | `src/pages/ReportGenerator.tsx` | `ReportFooter` componente (L133-158) |
| PDF (post-pass) | `src/lib/pdfHelpers.ts` | `addFooterAndPageNumbers()` (L570-651) |
| DOCX | `src/lib/docxExport.ts` | Seção `Footer` no `Document` |

### Estrutura do rodapé institucional:
- Linha 1: **Negrito**, tamanho configurável (`footerLine1FontSize`)
- Linha 2: Normal, tamanho configurável (`footerLine2FontSize`)
- Linha 3: Normal, tamanho configurável (`footerLine3FontSize`)
- Toggle global: `footerInstitutionalEnabled`
- Espaçamentos: `footerLineSpacing` (entre linhas), `footerTopSpacing` (acima)

---

## 9. Cabeçalho — Montagem

| Onde | Arquivo | Função |
|---|---|---|
| Preview (web) | `src/pages/ReportGenerator.tsx` | `ReportHeader()` (L103-128) |
| PDF (post-pass) | `src/lib/pdfHelpers.ts` | `renderHeaderOnPage()` (L481-567) |
| DOCX | `src/lib/docxExport.ts` | Seção `Header` no `Document` |

### Dois modos:
- **Modo A (Banner)**: imagem de largura total com altura configurável
- **Modo B (3 Logos)**: esquerda + centro + direita, com alinhamento e gap configuráveis

---

## 10. Pontos de Sobreposição Conhecidos

| Problema | Causa | Arquivo | Correção |
|---|---|---|---|
| Banner cobrindo texto no PDF | `getContentStartY` não usava `bannerHeightMm` | `pdfHelpers.ts` L80-96 | ✅ Corrigido |
| Banner cobrindo texto no preview | `minHeight` usava `headerHeight` fixo | `ReportGenerator.tsx` L99 | ✅ Corrigido (usa `effectiveHeaderHeightPx`) |
| Config não persistia com rascunho | `saveReportData` não chamava `saveConfig` | `ReportGenerator.tsx` L224 | ✅ Corrigido |

---

## 11. Dependências entre Arquivos

```
useReportVisualConfig.tsx
  ├── supabase client (project_report_templates)
  └── useAuth (user.id para created_by)

useReportState.tsx
  ├── AppDataContext (activeProject, updateReportData)
  └── supabase storage (uploads)

ReportGenerator.tsx
  ├── useReportState (conteúdo)
  ├── useReportVisualConfig (visual)
  ├── ReportVisualConfigEditor (UI de config)
  ├── ReportEditSection (edição)
  ├── ReportPreviewSection (preview)
  ├── reportPdfExport.ts (export PDF)
  └── docxExport.ts (export DOCX)

pdfHelpers.ts (ÚNICA FONTE DE VERDADE para PDF)
  ├── Constantes ABNT
  ├── PdfContext (estado de renderização)
  ├── Funções de texto (addParagraph, addBulletItem, etc.)
  ├── Funções de imagem (addPhotoGrid, addPhotoLayout)
  ├── Header/Footer (renderHeaderOnPage, addFooterAndPageNumbers)
  └── Assinatura (addSignatureBlock)
```

---

## 12. Problema Pendente: Edição WYSIWYG no Preview

**Status**: Não implementado. Atualmente o sistema tem dois modos separados (`edit` e `preview`).

**Para implementar**:
1. Converter `ReportPreviewSection` para aceitar callbacks de edição inline
2. Tornar títulos editáveis via `contentEditable` ou `<Input>` inline
3. Permitir drag-and-drop de fotos diretamente no preview
4. Sincronizar alterações inline com o estado do `useReportState`

**Complexidade**: Alta — requer refatoração dos componentes de preview para aceitar interatividade bidirecional.

---

## 13. Checklist de Validação

Antes de qualquer alteração no sistema de relatórios, verificar:

- [ ] Banner com altura máxima (60mm) não cobre texto no preview
- [ ] Banner com altura máxima não cobre texto no PDF exportado
- [ ] Salvar rascunho persiste banner, logos e config visual
- [ ] Reabrir relatório carrega config visual do `project_report_templates`
- [ ] Alterar config em "Relatório do Objeto" NÃO afeta "Relatório da Equipe"
- [ ] Páginas aparecem separadas visualmente no preview
- [ ] Rodapé institucional aparece no PDF (páginas internas)
- [ ] Rodapé institucional NÃO aparece na capa
- [ ] Export DOCX inclui rodapé institucional
