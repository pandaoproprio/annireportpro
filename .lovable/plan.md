

# Plano: Modulo Reports V2 — Isolado com html2pdf.js

## Objetivo

Criar um modulo novo e independente em `src/modules/reports-v2/` que oferece um formulario de relatorio simplificado, preview fiel em formato A4 com grid de fotos funcional, e exportacao PDF via `html2pdf.js` — sem alterar nenhum componente existente do sistema.

## Estrutura de Arquivos

```text
src/modules/reports-v2/
  ├── types.ts            -- Tipos locais do modulo
  ├── ReportForm.tsx       -- Formulario de edicao com upload multiplo
  ├── ReportPreview.tsx    -- Preview A4 fiel com grid de fotos
  ├── pdfGenerator.ts      -- Exportacao PDF via html2pdf.js
  └── ReportV2Page.tsx     -- Pagina container (orquestra form, preview, export)
```

## Detalhes Tecnicos

### 1. `types.ts`
- Tipos locais: `ReportV2Data` com campos `title`, `object`, `summary`, `sections` (array de secoes dinamicas com titulo + conteudo + fotos `string[]`).
- Nao importa tipos de `src/types/index.ts` nem de `pdfHelpers.ts`.

### 2. `ReportForm.tsx`
- Formulario com campos: Titulo, Objeto (textarea), Resumo (textarea).
- Secoes dinamicas: botao "Adicionar Secao" cria nova secao com titulo, conteudo (textarea) e upload de fotos.
- Upload de fotos:
  - `<input type="file" accept="image/*" multiple />`
  - Integra com o hook existente `useFileUploader` (importado de `@/hooks/useFileUploader`), reutilizando o upload para Supabase Storage.
  - Estado local de URLs (`string[]`) por secao.
  - Grid de preview imediato: `grid grid-cols-2 md:grid-cols-3 gap-4`, cada imagem com `rounded-md object-cover h-40 w-full`.
  - Botao de remover foto individual.

### 3. `ReportPreview.tsx`
- Container A4: `w-[794px] min-h-[1123px] bg-white p-16 space-y-8`, fonte Times New Roman.
- Renderiza o conteudo real do formulario (nao placeholders).
- Secoes: titulo em negrito uppercase + texto justificado + grid de fotos.
- Grid de fotos identico ao form: `grid grid-cols-2 md:grid-cols-3 gap-4`.
- O elemento raiz recebe `id="report-preview"` para captura pelo html2pdf.
- Quebras de pagina via CSS `break-inside: avoid` nos blocos de secao.

### 4. `pdfGenerator.ts`
- Usa `html2pdf.js` (ja instalado).
- Funcao `generatePdf(filename: string): Promise<void>`:
  - Captura o elemento `#report-preview`.
  - Configuracao:
    - `margin: 10`
    - `format: 'a4'`
    - `orientation: 'portrait'`
    - `html2canvas: { scale: 2, useCORS: true }`
    - `pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }`
  - Filename dinamico recebido como parametro.
- Nenhum calculo manual de coordenada. O PDF e a renderizacao exata do preview HTML.

### 5. `ReportV2Page.tsx`
- Pagina container com dois modos: "Editar" e "Visualizar".
- Toolbar com botoes: Editar, Visualizar, Gerar PDF (visivel apenas no modo preview).
- No modo editar: renderiza `ReportForm`.
- No modo visualizar: renderiza `ReportPreview` + botao "Gerar PDF" que chama `generatePdf`.
- Busca dados do projeto ativo via `useAppData` para preencher titulo e objeto iniciais.

### 6. Rota
- Adicionar rota `/report-v2` no `AppRoutes.tsx` (lazy-loaded), dentro do `Layout`, protegida por `PermissionGuard permission="report_object"`.
- Adicionar link na sidebar sob "Gestao": "Relatorio V2" (icone FileText).

## O que NAO sera alterado

- `src/lib/pdfHelpers.ts` — intocado
- `src/hooks/useReportState.tsx` — intocado
- `src/components/report/*` — intocados
- `src/pages/ReportGenerator.tsx` — intocado
- Nenhum componente UI global (sidebar layout, hooks de auth, etc.)
- Nenhuma tabela ou RLS no banco de dados

## Fluxo do Usuario

1. Acessa `/report-v2` pelo sidebar.
2. Preenche titulo, objeto, resumo.
3. Adiciona secoes com texto e fotos (upload multiplo → Storage → URLs).
4. Fotos aparecem imediatamente no grid do formulario.
5. Clica "Visualizar" → ve o preview A4 fiel.
6. Clica "Gerar PDF" → `html2pdf.js` converte o preview exatamente como renderizado.
7. PDF baixado automaticamente com quebras de pagina automaticas.

