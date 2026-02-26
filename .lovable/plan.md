

# Plano: Refatoracao Completa do Modulo Reports V2

## Visao Geral

Refatorar o modulo `src/modules/reports-v2/` para suportar atividades ilimitadas com upload de video, remover despesas, e migrar a geracao de PDF para server-side via Edge Function com Browserless (Puppeteer).

---

## Pre-requisito: API Key do Browserless

Antes da implementacao, sera necessario configurar a chave de API do servico Browserless como secret no backend. Voce precisara:

1. Criar uma conta em [browserless.io](https://www.browserless.io/)
2. Obter sua API Key no painel do Browserless
3. Informar a chave quando solicitado pelo sistema

---

## Estrutura de Arquivos

```text
src/modules/reports-v2/
  ├── types.ts                    -- Tipos atualizados (sem despesas, com media)
  ├── ReportForm.tsx              -- Formulario com atividades ilimitadas + upload video
  ├── ReportPreviewTemplate.tsx   -- HTML puro para PDF (independente do React no server)
  ├── ReportPreview.tsx           -- Preview client-side (reutiliza template)
  ├── reportService.ts            -- Servico que chama a Edge Function
  └── ReportV2Page.tsx            -- Orquestrador (form, preview, export)

supabase/functions/
  └── gerar-pdf-relatorio/
      └── index.ts                -- Edge Function com Puppeteer via Browserless
```

---

## Detalhes Tecnicos

### 1. `types.ts` -- Atualizacao

Substituir a estrutura atual por:

```typescript
interface MediaItem {
  type: "image" | "video";
  url: string;
  caption?: string;
}

interface ReportV2Activity {
  id: string;
  title: string;
  description: string;
  date: string;
  media: MediaItem[];
}

interface ReportV2Data {
  title: string;
  object: string;
  summary: string;
  activities: ReportV2Activity[];  // substitui sections
  header: ReportV2Header;
}
```

- Campo `sections` renomeado para `activities` com estrutura enriquecida
- Campo `photos: string[]` substituido por `media: MediaItem[]`
- Nenhuma referencia a despesas

### 2. `ReportForm.tsx` -- Refatoracao

- Manter campos globais: Titulo, Objeto, Resumo, Logos do cabecalho
- Substituir "Secoes" por "Atividades" com campos: titulo, descricao, data
- Upload de midia aceita `image/*,video/*`
- Grid de preview: imagens renderizadas normalmente; videos exibidos com thumbnail e icone de play
- Botao adicionar/remover atividade sem limite
- Remover completamente qualquer referencia a despesas

### 3. `ReportPreviewTemplate.tsx` -- HTML Puro para PDF

- Funcao que recebe `ReportV2Data` e retorna string HTML completa
- CSS inline, layout A4 real (210mm x 297mm)
- `page-break-before` configurado entre atividades
- Secoes vazias nao renderizadas
- Videos representados por thumbnail placeholder + legenda "(video)"
- Independente do React (template string puro)

### 4. `ReportPreview.tsx` -- Preview Client

- Reutiliza a mesma logica visual do template
- Renderiza como componente React para preview no navegador
- Videos exibidos com elemento `<video>` nativo com controls

### 5. `reportService.ts` -- Servico de PDF

```typescript
export async function generateReportPdf(data: ReportV2Data): Promise<Blob> {
  const { data: result, error } = await supabase.functions.invoke(
    'gerar-pdf-relatorio',
    { body: data }
  );
  // retorna blob do PDF
}
```

### 6. Edge Function `gerar-pdf-relatorio`

- Recebe JSON do relatorio no body
- Renderiza HTML template com CSS inline (mesma funcao de `ReportPreviewTemplate`)
- Conecta ao Browserless via API key
- Usa Puppeteer para:
  - `page.setContent(html)`
  - `page.pdf({ format: 'A4', printBackground: true })`
- Retorna PDF como blob/base64
- Configuracao em `config.toml`: `verify_jwt = false` (validacao manual via `getClaims`)

### 7. `ReportV2Page.tsx` -- Orquestrador

- State: `ReportV2Data` como source of truth unico
- Modos: Editar / Visualizar
- Botao "Gerar PDF" chama `reportService.generateReportPdf(data)`
- Download automatico do blob retornado
- Sem `useEffect` sincronizando midia

---

## Remocao de Despesas

- Nenhum campo `expense_records`, `ExpenseRecord` ou `DollarSign` no modulo V2
- Nao afeta o `ActivityManager.tsx` existente (que mantem suas despesas)
- Nao altera schema do banco (coluna `expense_records` na tabela `activities` permanece intocada)

---

## O que NAO sera alterado

- `src/pages/ActivityManager.tsx` -- intocado
- `src/hooks/useActivities.tsx` -- intocado
- `src/lib/pdfHelpers.ts` -- intocado
- `src/components/report/*` -- intocados
- `src/pages/ReportGenerator.tsx` -- intocado
- Layout compartilhado, sidebar, hooks globais -- intocados
- RLS policies -- intocadas
- Nenhum contratoService existente

---

## Sequencia de Implementacao

1. Solicitar API Key do Browserless ao usuario
2. Atualizar `types.ts` com nova estrutura
3. Refatorar `ReportForm.tsx` (atividades + midia)
4. Criar `ReportPreviewTemplate.tsx` (HTML puro)
5. Atualizar `ReportPreview.tsx` (usa template)
6. Criar Edge Function `gerar-pdf-relatorio`
7. Criar `reportService.ts`
8. Atualizar `ReportV2Page.tsx` (integrar tudo)
9. Remover `pdfGenerator.ts` (html2pdf antigo)

