Aplicar a correção do cabeçalho da capa em `supabase/functions/export-object-report-pdf/index.ts` — usado por TODOS os projetos no Gerador de Relatórios do Objeto.

Cada projeto tem seus logotipos, não são iguais, o unico que é comum pra todos é o do CEAP  
  
  
Mudanças

**1. `buildCoverHtml()` (l.658-671)** — substituir estrutura:

```html
<div class="cover">
  <div class="cover-header">${buildHeaderHtml(vc)}</div>   <!-- mesmo componente das internas -->
  <div class="cover-body">
    [logo do projeto]
    [eyebrow / título / projeto / fomento / org]
  </div>
</div>
```

Remover `cover-inner` e `coverFooterHtml` (rodapé já vem do `footerTemplate` global do Puppeteer).

**2. CSS `.cover*` (l.1017-1029)** — substituir por:

- `.cover` — flex column, `min-height: 260mm`, `break-after: page`
- `.cover-header` — `height: 18mm`, `border-bottom: 0.5pt solid #000`, `padding-bottom: 4mm`, flex centralizado
- `.cover-body` — `flex: 1`, centralizado vertical e horizontalmente, padding 10mm
- `.cover-logo` — aumentar para `max-width: 70mm; max-height: 50mm; margin-bottom: 14mm`

## Resultado

- Capa passa a ter o MESMO cabeçalho institucional (CEAP + Ministério/Gov) das páginas internas, vindo do mesmo `buildHeaderHtml()`.
- Logo do projeto fica centralizado verticalmente no corpo, não mais no topo.
- Linha separadora 0.5pt abaixo dos logos da capa, idêntica ao padrão das seções.
- Rodapé CEAP continua sendo aplicado pelo `footerTemplate` global (sem duplicação).

## Escopo

Apenas o arquivo `supabase/functions/export-object-report-pdf/index.ts`. Aplica-se a TODOS os projetos automaticamente — não há configuração por projeto, é o template único da edge function. Nenhum outro módulo afetado.

Deploy: redeploy de `export-object-report-pdf`.