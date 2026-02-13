

# Diagnostico PWA - GIRA Relatorios

## 1. Manifest (OK, com 1 problema)

A configuracao do manifest em `vite.config.ts` esta correta:
- `display: "standalone"` -- OK
- `start_url: "/"` -- OK
- `scope: "/"` -- OK
- `orientation: "portrait"` -- OK
- Icones 192x192 e 512x512 com maskable -- OK

**Problema encontrado:** Inconsistencia de `theme_color`:
- `vite.config.ts` (manifest): `#0EA5E9` (azul claro)
- `index.html` meta tag: `#2E7D32` (verde)
- Cor real da marca: `#0DA3E7` (azul do botao de login)

Isso pode causar barra de status com cor diferente do esperado no Android standalone.

## 2. Service Worker (OK)

- Registrado via `vite-plugin-pwa` com `registerType: "autoUpdate"` -- OK
- `navigateFallbackDenylist: [/^\/~oauth/]` -- OK
- Estrategias de cache corretas (CacheFirst para fonts, NetworkFirst para API)
- Fallback offline em `public/offline.html` -- OK

**Nenhum problema critico aqui.**

## 3. Meta Viewport e iOS (OK)

- `viewport-fit=cover` -- OK
- `apple-mobile-web-app-capable: yes` -- OK
- `apple-mobile-web-app-status-bar-style: default` -- OK
- Safe area CSS com `env(safe-area-inset-bottom)` -- OK

## 4. CAUSA RAIZ PRINCIPAL: Layout nao e mobile-first

Este e o problema central. O app "parece desktop encapsulado" porque o layout principal usa uma **sidebar fixa de 264px** que so se esconde via translate no mobile, mas o container principal ainda usa `min-h-screen` em vez de `100dvh`.

### Problemas especificos encontrados:

| Arquivo | Problema |
|---------|----------|
| `AppRoutes.tsx` linha 80 | `min-h-screen` no container raiz do Layout |
| `AppRoutes.tsx` linha 191 | `main` com `min-h-screen` redundante (causa scroll) |
| `DiaryLayout.tsx` linha 53 | `min-h-screen` no container |
| `DiaryLayout.tsx` linhas 29, 37 | `min-h-screen` nos estados de loading/vazio |
| `Onboarding.tsx` linhas 113, 120 | `min-h-screen` |
| `LgpdConsent.tsx` linha 43 | `min-h-screen` |
| `ResetPassword.tsx` linhas 115, 126, 155 | `min-h-screen` (3 ocorrencias) |
| `NotFound.tsx` linha 12 | `min-h-screen` |
| `ProtectedRoute.tsx` linha 16 | `min-h-screen` |
| `PrivacyPolicy.tsx` linha 9 | `min-h-screen` |
| `TermsOfUse.tsx` linha 9 | `min-h-screen` |

### Por que isso importa no standalone:

No modo `display: standalone`, o Android remove a barra de navegacao do browser. O `100vh` passa a significar a tela inteira. Mas `min-h-screen` (que e `min-height: 100vh`) permite que o conteudo **ultrapasse** a viewport, criando scroll indesejado. Usar `h-[100dvh]` com `overflow-hidden` no container raiz garante que o app ocupe exatamente a tela visivel.

### Layout do container principal (AppRoutes.tsx):

```text
Atual:
+---------------------------+
| min-h-screen flex         |  <-- permite scroll infinito
|  +--------+-----------+   |
|  |sidebar |  main     |   |  <-- main tambem min-h-screen (redundante!)
|  | w-64   | flex-col  |   |
|  |        | min-h-scr |   |
|  +--------+-----------+   |
+---------------------------+

Correto:
+---------------------------+
| h-[100dvh] flex           |  <-- altura fixa da viewport
| overflow-hidden           |
|  +--------+-----------+   |
|  |sidebar |  main     |   |  <-- main flex-1 overflow-auto
|  | w-64   | flex-col  |   |
|  |        | flex-1    |   |
|  +--------+-----------+   |
+---------------------------+
```

## 5. Sidebar no mobile

A sidebar atual ja funciona como drawer (slide-in com overlay), o que esta correto. Mas o container `main` nao compensa corretamente porque usa `min-h-screen` em vez de `flex-1` com `overflow-auto`.

## 6. Resumo das Correcoes Necessarias (Priorizado)

### Prioridade 1 - Critico
1. **Unificar `theme_color`**: Alinhar `index.html` meta tag com o manifest (`#0EA5E9` ou `#0DA3E7`)
2. **Container raiz do Layout** (`AppRoutes.tsx` linha 80): Trocar `min-h-screen` por `h-[100dvh] overflow-hidden`
3. **Main do Layout** (`AppRoutes.tsx` linha 191): Remover `min-h-screen`, manter `flex-1 flex flex-col`, conteudo interno com `overflow-y-auto`

### Prioridade 2 - Importante
4. **DiaryLayout.tsx**: Trocar todas as 3 ocorrencias de `min-h-screen` por `h-[100dvh]` com overflow adequado
5. **Onboarding.tsx**: Mesma correcao
6. **LgpdConsent.tsx**: Mesma correcao
7. **ResetPassword.tsx**: Trocar as 3 ocorrencias
8. **ProtectedRoute.tsx**: Trocar loader

### Prioridade 3 - Menor
9. **NotFound.tsx, PrivacyPolicy.tsx, TermsOfUse.tsx**: Trocar `min-h-screen`
10. Adicionar `overscroll-behavior: none` no CSS global para evitar "bounce" no iOS

## 7. Checklist de Validacao Standalone

Apos implementar as correcoes:

- [ ] `theme_color` no manifest e no `index.html` sao identicos
- [ ] Nenhum arquivo usa `min-h-screen` nos containers raiz
- [ ] Container principal usa `h-[100dvh] overflow-hidden`
- [ ] Area de conteudo usa `flex-1 overflow-y-auto`
- [ ] Sem scroll vertical na pagina inteira (apenas dentro do conteudo)
- [ ] Testar `window.matchMedia('(display-mode: standalone)').matches` retorna `true` apos instalacao
- [ ] Lighthouse PWA score acima de 90
- [ ] Nao ha bounce/overscroll no iOS

## Conclusao

O PWA esta **tecnicamente configurado corretamente** (manifest, service worker, meta tags). O problema e puramente de **layout CSS**: o uso sistematico de `min-h-screen` em vez de `h-[100dvh]` faz com que o app se comporte como uma pagina web scrollavel em vez de um app nativo com viewport fixa. A correcao envolve trocar ~15 ocorrencias de `min-h-screen` e ajustar o overflow dos containers.

