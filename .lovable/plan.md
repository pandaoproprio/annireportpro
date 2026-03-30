

# Correção Definitiva: PDF Export — thead/tfoot + pdf-lib

## Problema
O `headerTemplate`/`footerTemplate` do Puppeteer executam em contexto DOM isolado. Imagens (logos) não carregam, scripts não funcionam, e não há API para ocultar elementos por página.

## Solução (3 partes)

### Parte 1: Reestruturar HTML (`buildHtml`)

**Capa** — `<div class="cover">` com `break-after: page` (já existe, linha 660). Contém seu próprio rodapé institucional inline (já existe, linha 651-657). Fica FORA da tabela.

**Corpo** — Envolver o conteúdo (TOC + seções + assinatura) em uma `<table class="pdf-layout">`:
- `<thead>`: cabeçalho institucional (logos via `buildHeaderHtml`) — repete automaticamente pelo Chromium
- `<tfoot>`: rodapé institucional (via `buildFooterHtml`) — repete automaticamente
- `<tbody>`: sumário + seções + assinatura + audit footer

CSS necessário:
```css
.pdf-layout { width: 100%; border-collapse: collapse; }
.pdf-layout thead { display: table-header-group; }
.pdf-layout tfoot { display: table-footer-group; }
.pdf-layout td { padding: 0; border: none; vertical-align: top; }
.pdf-header-cell { padding-bottom: 4mm; border-bottom: 1px solid #9ca3af; }
.pdf-footer-cell { padding-top: 2mm; border-top: 1px solid #9ca3af; }
```

### Parte 2: Simplificar Puppeteer options

```typescript
displayHeaderFooter: true,
headerTemplate: '<span></span>',  // vazio mas obrigatório
footerTemplate: '<div style="width:100%;text-align:right;padding-right:20mm;font-size:10pt;font-family:serif;"><span class="pageNumber"></span></div>',
margin: { top: "30mm", bottom: "25mm", left: "30mm", right: "20mm" }
```

Logos e texto institucional agora estão no HTML do corpo (thead/tfoot), não nos templates isolados.

### Parte 3: Post-processing com pdf-lib (remover nº página 1)

Após receber o buffer do Browserless:
```typescript
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const pdfDoc = await PDFDocument.load(pdfBuffer);
const firstPage = pdfDoc.getPages()[0];
const { width } = firstPage.getSize();
// Retângulo branco sobre a numeração "1" no canto inferior direito
firstPage.drawRectangle({
  x: width - 55, y: 18, width: 45, height: 20,
  color: rgb(1, 1, 1),
});
const finalPdf = await pdfDoc.save();
```

## Arquivo editado
`supabase/functions/export-object-report-pdf/index.ts` — único arquivo. Nenhuma mudança nos consumidores client-side.

## Mudanças específicas no código

1. **Linhas 906-1295** (`buildHtml`): Reestruturar o body para `cover` + `table.pdf-layout` com thead/tfoot/tbody
2. **Linhas 1363-1377** (Puppeteer options): Simplificar headerTemplate/footerTemplate para apenas numeração
3. **Linhas 1400-1403** (pós-Browserless): Adicionar import de pdf-lib e post-processing do buffer
4. **CSS** (linhas 910-1240): Adicionar estilos para `.pdf-layout`, `.pdf-header-cell`, `.pdf-footer-cell`

## Resultado esperado
- **Capa**: Logo + título + info + rodapé institucional, SEM numeração, SEM cabeçalho repetido
- **Páginas 2+**: Cabeçalho com logos (via thead), rodapé institucional (via tfoot), numeração (via Puppeteer)
- **Determinístico**: Sem scripts, sem heurísticas, sem dependência de contexto isolado

