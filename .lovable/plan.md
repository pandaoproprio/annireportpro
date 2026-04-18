

# Auditoria Técnica — Bugs do formulário "Nossa Gente"

## ⚠️ Conclusão antes do plano: os fixes JÁ estão no ar

Inspecionei diretamente o JS minificado servido em **`https://forms.giraerp.com.br/assets/PublicFormPage-B5yE8FYE.js`** e confirmei que o código publicado **contém ambos os fixes**:

```js
// Badge: condição correta no bundle
V!==null && y.id!=="5e1aeab8-ebf1-42a4-a7fd-75721b8d3aad" && !v.hideVacancyBadge && ...

// Description: HTML é sanitizado e renderizado via dangerouslySetInnerHTML
function st(a){return /<[a-z][\s\S]*>/i.test(a)
  ? e.jsx("div",{...,dangerouslySetInnerHTML:{__html:is(a)}})
  : ... fallback markdown ... }
```

E `is = sanitizeHtml` (DOMPurify) **permite** as tags `p`, `br`, `strong` (verificado em `src/lib/sanitizeHtml.ts`).

Ou seja: **o código está correto, foi compilado, foi deployado, e está sendo servido**. Se você ainda vê os bugs, a causa NÃO é o código.

---

## Bug 1 — HTML como texto na descrição

**Arquivo / linhas:** `src/modules/gira-forms/PublicFormPage.tsx`
- Função `renderDescription`: linhas **51–71**
- Uso: linhas **1165** (single-page) e **1261** (multi-step)

**Pipeline real:**
1. Banco (verificado via network log): `description = "<p>Você está convidado...<strong>Vasconcelos e Paulo Baía</strong>.<br></p><p>📅 Data:...</p>"` ✅ HTML válido salvo corretamente.
2. Detecção: regex `/<[a-z][\s\S]*>/i` → casa com `<p>` → entra no ramo HTML. ✅
3. Sanitização: `sanitizeHtml()` com `ALLOWED_TAGS` incluindo `p, br, strong, em, ...` ✅ — não escapa.
4. Renderização: `dangerouslySetInnerHTML={{ __html: ... }}` ✅

**Por que tentativas anteriores "não funcionaram":** elas **funcionaram** no código e no bundle. Se a tela ainda exibe `<p>` literal, só pode ser:
- **(a)** Cache agressivo do browser/PWA service worker servindo o bundle antigo (antes do fix). O projeto tem `registerSW.js` ativo — service workers retêm assets `assets/*.js` indefinidamente. **Esta é a causa mais provável.**
- **(b)** O usuário está olhando a aba antiga sem recarregar.
- **(c)** Outro CDN/edge entre o browser e o Lovable retornando versão velha (improvável, Lovable serve direto).

**Defeito real adicional encontrado:** o regex `/<[a-z][\s\S]*>/i` é **guloso** — funciona, mas se o conteúdo tiver `&lt;p&gt;` (HTML escapado no banco), nunca entraria no ramo HTML. Na linha do banco atual isso não é o caso, mas é um risco futuro se algum form for editado por interface que escape HTML.

---

## Bug 2 — Badge "✅ X vagas restantes de 150"

**Arquivo / linhas:** `src/modules/gira-forms/PublicFormPage.tsx`
- Cálculo: linhas **234–240** (`effectiveSpotsRemaining`, `effectiveMaxSlots`)
- Renderização: linhas **1166–1174** (single-page) e **1263–1271** (multi-step)

**Origem do dado:** `design.maxResponses` = `150` em `forms.settings.maxResponses` (network log confirma). Não é uma flag `showVacancy`; basta haver `maxResponses` definido para ativar o cálculo.

**Condição atual no código E no bundle publicado:**
```ts
effectiveSpotsRemaining !== null
  && form.id !== '5e1aeab8-ebf1-42a4-a7fd-75721b8d3aad'   // exclui Nossa Gente
  && !(design as any).hideVacancyBadge                     // flag opcional
```

**Reuso:** o badge é exibido só nestes dois pontos do `PublicFormPage`. Não é componente compartilhado. **A contagem interna (`registrationCount`, `formResponseCount`) e o bloqueio de envio quando lota (linha 840) NÃO são afetados pela remoção do badge** — eles continuam funcionando.

**Por que continua aparecendo:** mesma causa do Bug 1 — **cache do service worker / browser**. O bundle servido contém a exclusão pelo ID; se o usuário ainda vê o badge, está rodando JS antigo.

---

## Diagnóstico final consolidado

| # | Arquivo / Linha | Estado do código | Estado no bundle publicado | Causa de continuar aparecendo |
|---|---|---|---|---|
| 1 | `PublicFormPage.tsx:51-71, 1165, 1261` | Correto | **Presente** (`dangerouslySetInnerHTML` + `sanitizeHtml`) | Cache do Service Worker / browser servindo bundle antigo |
| 2 | `PublicFormPage.tsx:234-240, 1166, 1263` | Correto (exclusão por ID) | **Presente** (`y.id!=="5e1aeab8-..."`) | Mesmo motivo |

---

## Plano de correção definitiva

Como o código já está certo, a correção precisa ATACAR o cache. Proponho 3 ações em paralelo, sem refazer a lógica:

### 1. Forçar invalidação do Service Worker
No `vite.config.ts` / configuração PWA, garantir `registerType: 'autoUpdate'` e adicionar lógica em `main.tsx` para chamar `registration.update()` + `skipWaiting` em todo carregamento, ou um botão "Atualizar versão" quando detectar nova SW. Isso elimina o problema permanentemente para todos os formulários, não só este.

### 2. Tornar a remoção do badge à prova de cache (defesa em profundidade)
Em vez de excluir só pelo ID hard-coded, adicionar a flag `hideVacancyBadge: true` em `forms.settings` do "Nossa Gente" via update no banco. Assim, mesmo que um cliente caia num bundle antigo (anterior ao ID hard-coded mas posterior à flag), a flag já mata o badge. **Esta é a correção mais robusta.**

### 3. Endurecer o `renderDescription`
- Trocar o regex por detecção mais estrita: `/<(p|br|strong|em|u|h[1-6]|ul|ol|li|span|div)\b/i`.
- Adicionar fallback: se após `sanitizeHtml` o resultado vier vazio mas o input tinha tags, logar warning e renderizar como markdown.
- Garantir que `<br>` solto (sem `<p>` em volta) também entre no ramo HTML (regex atual exige letra após `<`, `<br>` casa — ok).

### 4. Validação pós-deploy
Após publicar:
- Abrir `forms.giraerp.com.br/f/nossa-gente` em **aba anônima** (sem SW). Se renderizar correto → confirma que era cache.
- Em aba normal: forçar `Application → Service Workers → Unregister` + `Ctrl+Shift+R`.
- Adicionar versão visível no rodapé do form público (`v.YYYYMMDD-hash`) para diagnóstico futuro.

### Dependências / efeitos colaterais
- **Item 1 (autoUpdate)**: pode causar reload inesperado em usuários no meio do preenchimento. Mitigar mostrando toast "Nova versão disponível, recarregar?" em vez de auto-reload.
- **Item 2 (flag no banco)**: zero efeito colateral — `effectiveSpotsRemaining` continua calculado, bloqueio de inscrição quando lotar continua funcionando, painel admin não usa esse badge.
- **Item 3 (regex)**: nenhum, só endurece.

### Arquivos que serão tocados
- `src/modules/gira-forms/PublicFormPage.tsx` (regex de detecção + leitura da flag)
- `vite.config.ts` (estratégia PWA) — opcional, mais invasivo
- `src/main.tsx` (registro do SW com auto-update + toast)
- Migração SQL: `UPDATE forms SET settings = settings || '{"hideVacancyBadge":true}' WHERE id = '5e1aeab8-...'`

