

# Padronizacao Definitiva dos Exportadores PDF

## Resumo

Criar `src/lib/pdfHelpers.ts` como modulo central unico, extraindo as funcoes de renderizacao do `teamReportPdfExport.ts` (modelo correto). Refatorar os 3 exportadores para importar desse modulo. Eliminar `html2pdf.js` da Justificativa.

---

## Estrutura Final de Dependencia

```text
src/lib/pdfHelpers.ts  (UNICA FONTE DE VERDADE)
    |
    +-- src/lib/teamReportPdfExport.ts   (importa de pdfHelpers)
    |
    +-- src/lib/reportPdfExport.ts       (importa de pdfHelpers)
    |
    +-- src/lib/justificationPdfExport.ts (importa de pdfHelpers)

src/pages/JustificationReportGenerator.tsx
    -> remove html2pdf.js
    -> chama exportJustificationToPdf()
```

---

## ETAPA 1 -- Criar `src/lib/pdfHelpers.ts`

Novo arquivo contendo todas as constantes e funcoes extraidas do `teamReportPdfExport.ts`:

**Constantes ABNT exportadas:**
- `PAGE_W = 210`, `PAGE_H = 297`
- `ML = 30`, `MR = 20`, `MT = 30`, `MB = 20`
- `CW = 160` (PAGE_W - ML - MR)
- `MAX_Y = 277` (PAGE_H - MB)
- `LINE_H = 7.2`
- `INDENT = 12.5`
- `FONT_BODY = 12`, `FONT_CAPTION = 10`

**Tipo auxiliar exportado:**
- `TextBlock = { type: 'paragraph' | 'bullet'; content: string }`

**Interface de contexto (para evitar passar pdf + currentY como globals):**
- `PdfContext = { pdf: jsPDF; currentY: number; pageCount: number }`

**Funcoes exportadas (todas recebem/retornam PdfContext):**

| Funcao | Descricao |
|---|---|
| `createPdfContext()` | Cria jsPDF A4 portrait e retorna PdfContext |
| `addPage(ctx)` | Adiciona pagina, reseta currentY |
| `ensureSpace(ctx, h)` | Verifica espaco, chama addPage se necessario |
| `addParagraph(ctx, text)` | Paragrafo justificado com recuo 12.5mm, 1.5 spacing |
| `addSectionTitle(ctx, title)` | Titulo de secao em negrito, Times 12pt |
| `addBulletItem(ctx, text)` | Item com bullet, deteccao de label em negrito |
| `addHeaderLine(ctx, label, value)` | Par label:valor no cabecalho |
| `parseHtmlToBlocks(html)` | Converte HTML em TextBlock[] |
| `loadImage(url)` | Carrega imagem como dataURL |
| `addPhotoGrid(ctx, photos, label)` | Grade 2 colunas com legendas |
| `addFooterAndPageNumbers(ctx, orgName, skipPage1)` | Loop final: rodape + paginacao |
| `addSignatureBlock(ctx, orgName, date, sigLabel, extra?)` | Bloco de assinatura padrao |

---

## ETAPA 2 -- Refatorar `teamReportPdfExport.ts`

**Remover:** Todas as constantes duplicadas (PAGE_W, ML, LINE_H, etc.), funcoes `addParagraph`, `addBulletText`, `addSectionTitle`, `addHeaderLine`, `ensureSpace`, `loadImage`, `parseHtmlToBlocks`.

**Adicionar:** `import { ... } from '@/lib/pdfHelpers'`

**Manter:** Logica especifica do relatorio da equipe (dados de identificacao, relato de execucao, secoes adicionais, fotos com legendas customizadas, bloco de assinatura com Nome/Cargo/CNPJ).

Nenhuma alteracao visual -- o PDF gerado sera identico ao atual.

---

## ETAPA 3 -- Refatorar `reportPdfExport.ts`

**Remover:** Todas as constantes duplicadas e funcoes locais (`addParagraph`, `addSectionTitle`, `addSubSectionTitle`, `addBulletItem`, `addPhotoGrid`, `loadImage`, `ensureSpace`).

**Adicionar:** `import { ... } from '@/lib/pdfHelpers'`

**Correcoes aplicadas:**
- Remover `.toUpperCase()` do `addSectionTitle` (linha 111) -- o titulo ja vem formatado corretamente da estrutura de secoes
- Assinatura: usar `addSignatureBlock()` do pdfHelpers para alinhar com o modelo da Equipe
- Rodape: usar `addFooterAndPageNumbers()` unificado

**Manter:** Logica especifica (capa, tabela de despesas, links, atividades por meta).

---

## ETAPA 4 -- Reescrever `justificationPdfExport.ts`

**Remover:** Todo o conteudo atual (constantes `ABNT`, funcoes `writeWrappedText`, `parseHtmlAndWrite`, `checkPageBreak`, `addFooter`).

**Reescrever usando pdfHelpers:**
- `import { createPdfContext, addParagraph, addSectionTitle, addHeaderLine, parseHtmlToBlocks, addBulletItem, addFooterAndPageNumbers, addSignatureBlock, ensureSpace, LINE_H, ML, PAGE_W, CW } from '@/lib/pdfHelpers'`
- Titulo centralizado (Times 16pt bold)
- Header: 3x `addHeaderLine()` (Projeto, Termo, Organizacao)
- Destinatario: paragrafo "Ao [funder],"
- Secoes: loop usando `addSectionTitle()` + `parseHtmlToBlocks()` + `addParagraph()`/`addBulletItem()`
- Assinatura: `addSignatureBlock()`
- Rodape: `addFooterAndPageNumbers(ctx, orgName, true)` (pular pag 1)

**Bugs corrigidos:**
- LINE_HEIGHT de 7 para 7.2
- Adicionar `align: 'justify'` nos paragrafos
- Adicionar recuo 12.5mm na primeira linha
- Assinatura com linha horizontal (nao underscores)

---

## ETAPA 5 -- Corrigir `JustificationReportGenerator.tsx`

**Remover:**
- `import html2pdf from 'html2pdf.js'` (linha 8)
- `const reportRef = useRef<HTMLDivElement>(null)` (linha 19) -- nao mais necessario para PDF
- Todo o bloco `handleExportPdf` (linhas 59-93) que usa html2pdf

**Adicionar:**
- `import { exportJustificationToPdf } from '@/lib/justificationPdfExport'`

**Novo `handleExportPdf`:**
```typescript
const handleExportPdf = async () => {
  if (!hasContent) { toast.error('Preencha ao menos uma secao'); return; }
  setIsExporting(true);
  setExportType('pdf');
  try {
    await exportJustificationToPdf({ project, report: buildReportData() });
    toast.success('PDF exportado com sucesso!');
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    toast.error('Erro ao exportar PDF');
  } finally {
    setIsExporting(false);
    setExportType(null);
  }
};
```

**Nota:** O `reportRef` ainda e necessario para o preview HTML, entao ele permanece, mas nao e mais usado pelo exportador PDF.

---

## Arquivos Modificados (resumo)

| Arquivo | Acao |
|---|---|
| `src/lib/pdfHelpers.ts` | **NOVO** -- modulo central |
| `src/lib/teamReportPdfExport.ts` | Refatorado -- importa de pdfHelpers |
| `src/lib/reportPdfExport.ts` | Refatorado -- importa de pdfHelpers, remove .toUpperCase() |
| `src/lib/justificationPdfExport.ts` | Reescrito -- usa pdfHelpers, corrige LINE_H/justify/indent |
| `src/pages/JustificationReportGenerator.tsx` | Remove html2pdf, chama exportJustificationToPdf nativo |

---

## Riscos de Regressao

1. **Equipe:** Risco minimo -- apenas extraindo funcoes para modulo externo, sem alterar logica
2. **Objeto:** Risco baixo -- remocao do .toUpperCase() pode alterar visualmente titulos de secao (intencional)
3. **Justificativa:** Risco medio -- reescrita completa do exportador; o PDF tera aparencia diferente da versao html2pdf (intencional, pois agora seguira ABNT corretamente)
4. **html2pdf.js removido:** O pacote ainda ficara no package.json mas nao sera mais importado em nenhum lugar; pode ser removido do package.json separadamente se desejado

