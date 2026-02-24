

# Correcao Controlada + Padronizacao ABNT

## Escopo

6 correcoes pontuais, sem refatoracao, sem alteracao de logica de negocio, sem mudanca de schema/RLS.

---

## 1. Titulos de Metas Duplicados

**Causa raiz:** Os `goal.title` no banco ja contem o prefixo "META X -" (ex: "META 1 -- Realizar o planejamento..."). O `GoalsPreview` e o `docxExport.ts` adicionam dinamicamente outro prefixo `META {idx+1} -`, gerando "META 1 -- META 1 -- Realizar...".

**Estrategia:** Remover o prefixo dinamico do codigo (preview e DOCX). Manter o titulo como esta no banco.

**Arquivos afetados:**
- `src/components/report/ReportPreviewSection.tsx` -- linha 84: trocar `META {idx + 1} – {goal.title}` por `{goal.title}`
- `src/lib/docxExport.ts` -- linha 141: trocar `` `META ${idx + 1} – ${goal.title}` `` por `goal.title`

---

## 2. DOCX nao Quebra Paragrafos com `\n`

**Causa raiz:** Narrativas longas (objectText, summary, goalNarratives, otherActionsNarrative, communicationNarrative, satisfaction, futureActions, custom content) sao passadas como `text` unico a `new Paragraph()`. Quebras de linha sao ignoradas.

**Correcao:** Criar funcao helper `textToParagraphs(text, options)` que faz `text.split('\n').filter(Boolean).map(...)`. Aplicar em todos os cases do switch que tratam narrativas (object, summary, goals narrative, other, communication, satisfaction, future, custom).

**Arquivo afetado:** `src/lib/docxExport.ts`

---

## 3. Remover alert() / confirm() Nativos

**Correcao por arquivo:**

| Arquivo | Linha | De | Para |
|---|---|---|---|
| `src/pages/ReportGenerator.tsx` | 63 | `alert('Erro ao exportar PDF...')` | `toast.error('Erro ao exportar PDF...')` |
| `src/pages/ReportGenerator.tsx` | 81 | `alert('Erro ao exportar DOCX...')` | `toast.error('Erro ao exportar DOCX...')` |
| `src/pages/ActivityManager.tsx` | 142 | `alert('A data de término...')` | `toast.error('A data de término...')` |
| `src/pages/Onboarding.tsx` | 104 | `alert('Erro ao criar projeto...')` | `toast.error('Erro ao criar projeto...')` |
| `src/pages/Onboarding.tsx` | 107 | `alert('Por favor, preencha...')` | `toast.error('Por favor, preencha...')` |
| `src/hooks/useReportState.tsx` | 154 | `confirm('Tem certeza...')` | Estado + ConfirmDialog |
| `src/hooks/useJustificationReportState.tsx` | 192 | `confirm('Tem certeza...')` | Estado + ConfirmDialog |
| `src/components/BatchDeleteProjects.tsx` | 38 | `window.confirm(...)` | Estado + ConfirmDialog |

Para os `confirm()` em hooks (`useReportState`, `useJustificationReportState`): como hooks nao podem renderizar UI, a correcao sera expor estados `pendingRemoveIndex` e `confirmRemoveSection` como retorno do hook, e renderizar o `ConfirmDialog` no componente pai (`ReportGenerator.tsx` e `JustificationReportGenerator.tsx`).

Para `BatchDeleteProjects.tsx`: adicionar estado local + ConfirmDialog inline.

Importar `toast` de `sonner` nos arquivos que usam `alert()`.

---

## 4. Remover Placeholder Textual "LOGO"

**Causa raiz:** `ReportHeader` em `ReportGenerator.tsx` (linhas 91, 94) renderiza `<div>...LOGO</div>` quando nao ha logo. O html2pdf captura esse texto.

**Correcao:** Trocar por `<div className="w-12 h-12" />` (div vazia com dimensoes fixas, sem texto).

**Arquivo afetado:** `src/pages/ReportGenerator.tsx` -- linhas 91 e 94

---

## 5. DOCX Headings com Times New Roman

**Causa raiz:** O estilo global `styles.default.document.run` define Times New Roman para texto normal, mas headings usam estilos do Word (Calibri/Arial por padrao).

**Correcao:** Adicionar `paragraphStyles` customizados para Heading1, Heading2 e Heading3 no bloco `styles` do documento, forcando `font: 'Times New Roman'`.

**Arquivo afetado:** `src/lib/docxExport.ts` -- bloco `styles` (linhas 367-380)

---

## 6. Ajustes ABNT Finais no PDF

**Estado atual do PDF:**
- Margens: `[30, 20, 25, 30]` (top 30mm, right 20mm, bottom 25mm, left 30mm) -- bottom deveria ser 20mm
- Paginacao: posicao X calculada incorretamente com `pageWidth - 20 - textWidth`
- Capa exibe numero de pagina (ABNT: capa nao exibe)

**Correcoes:**
- Margem bottom: `25` para `20` --> `[30, 20, 20, 30]`
- Padding inline do preview: `30mm 20mm 25mm 30mm` para `30mm 20mm 20mm 30mm`
- Paginacao: posicionar com `pdf.text(text, pageWidth - 20, 20)` (alinhamento direito nativo nao e suportado, usar offset fixo a 2cm da borda)
- Pular pagina 1 (capa) na numeracao: iniciar loop em `i = 2`
- Texto da paginacao: apenas numero (ex: `"2"`) em vez de `"Página 2 de 5"` (ABNT usa apenas o numero)

**Arquivo afetado:** `src/pages/ReportGenerator.tsx` -- linhas 41, 51-58, 166

---

## Secao Tecnica -- Resumo de Arquivos e Linhas

| Arquivo | Alteracoes |
|---|---|
| `src/pages/ReportGenerator.tsx` | alert->toast (2x), logo placeholder (2x), margens PDF, paginacao PDF |
| `src/lib/docxExport.ts` | Meta title, paragraphs split, heading styles |
| `src/components/report/ReportPreviewSection.tsx` | Meta title (1 linha) |
| `src/pages/ActivityManager.tsx` | alert->toast (1x) |
| `src/pages/Onboarding.tsx` | alert->toast (2x) |
| `src/hooks/useReportState.tsx` | confirm->estado (1x) |
| `src/hooks/useJustificationReportState.tsx` | confirm->estado (1x) |
| `src/components/BatchDeleteProjects.tsx` | window.confirm->ConfirmDialog (1x) |

**Nenhum arquivo fora deste escopo sera tocado.**

---

## Validacao Pos-Correcao

1. Preview do relatorio: metas sem duplicacao no titulo
2. Exportar PDF: margens corretas, paginacao no canto superior direito sem numero na capa, sem texto "LOGO"
3. Exportar DOCX: paragrafos quebrados corretamente, headings em Times New Roman, margens ABNT
4. Console sem erros
5. Nenhum `alert()` ou `confirm()` restante no codigo
6. Build sem warnings de TypeScript
