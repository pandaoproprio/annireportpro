

## Plano: 5 correções independentes

### 1. Câmera para leitura de QR Code (FormCheckinPanel)
**Causa raiz:** `startScanner()` apenas abre o `getUserMedia` e mostra o vídeo. Não existe biblioteca decodificando o QR, então mesmo com a câmera ativa nada acontece quando se aponta para o código.

**Correção:**
- Adicionar `@zxing/browser` (decoder leve, funciona em iOS Safari + Android Chrome).
- Em `startScanner()`, instanciar `BrowserMultiFormatReader` e chamar `decodeFromVideoDevice` apontando para o `videoRef`. No callback, extrair o `token` da URL escaneada (ou usar o próprio texto se for o código de 6 letras), buscar a `form_response` correspondente em `responsesQuery.data` e disparar `checkinMutation`.
- Em `stopScanner()`, parar o reader (`reader.reset()`) além de parar o stream.
- Adicionar `playsInline` e `muted` no `<video>` (obrigatório no iOS Safari).
- Tratar erro de permissão de câmera com mensagem amigável.

**Arquivo:** `src/modules/gira-forms/components/FormCheckinPanel.tsx`.

---

### 2. Pré-checkin não funciona
**Causa raiz:** O componente `<PreCheckinButton>` só é renderizado quando `(form as any).pre_checkin_enabled` é true (linha 917 de `PublicFormPage.tsx`), mas a tabela `forms` não tem essa coluna nem existe toggle no editor — então o botão nunca aparece. A API e a tabela `event_pre_checkins` estão prontas e com policies corretas.

**Correção:**
- Trocar a condição de `(form as any).pre_checkin_enabled` por `design.enableCheckin` (chave já existente em `FormDesignSettings`) **OU** por uma nova flag `design.preCheckinEnabled`. Vou usar uma flag dedicada `design.preCheckinEnabled` (default `true` quando `enableCheckin` for true) para não acoplar pré-checkin a checkin presencial.
- Adicionar campo opcional `preCheckinEnabled?: boolean` em `FormDesignSettings` (`types.ts`).
- Adicionar toggle "Pré-checkin (confirmar presença antecipada)" no painel do FormBuilder, junto do toggle de Check-in.
- Garantir que o botão apareça na tela de sucesso quando `design.preCheckinEnabled === true` e `submittedInfo` existe.

**Arquivos:** `src/modules/gira-forms/PublicFormPage.tsx`, `src/modules/gira-forms/types.ts`, `src/modules/gira-forms/FormBuilderPage.tsx`.

---

### 3. Mapa ausente no e-mail de confirmação de evento
**Causa raiz:** `send-event-confirmation/index.ts` não tem nenhum bloco de mapa.

**Correção:** Inserir uma seção "Como chegar" no template HTML usando **OpenStreetMap Static Map** (não exige API key, URLs públicas estáveis). URL: `https://staticmap.openstreetmap.de/staticmap.php?center={lat},{lng}&zoom=16&size=500x250&markers={lat},{lng},red-pushpin`. Para o caso sem coordenadas, fallback para link Google Maps com query do endereço (sem imagem). Incluir botão "Abrir no Google Maps" e "Abrir no Waze" abaixo da imagem (mesmo padrão do `send-form-checkin`).

Aceitar `geofence_lat`/`geofence_lng` opcionais no body da função; o frontend (`useEvents` ou onde dispara o e-mail) já tem essas coordenadas — passar no `invoke`.

**Arquivos:** `supabase/functions/send-event-confirmation/index.ts` + ajuste no caller para enviar `geofence_lat`/`geofence_lng`.

---

### 4. Rodapé do e-mail de confirmação de evento
**Causa raiz:** Linhas 73-78 de `send-event-confirmation/index.ts` exibem "GIRA Diário de Bordo — Gestão de Projetos Sociais".

**Correção:** Trocar o texto do rodapé por algo institucional pertinente apenas ao evento — ex.: "Este e-mail confirma sua inscrição no evento. Em caso de dúvida, responda a esta mensagem." (sem mencionar GIRA Diário de Bordo nem nada relacionado).

**Escopo restrito:** apenas `send-event-confirmation`. O rodapé do `send-form-checkin` (item separado) **não** será alterado.

---

### 5. Mensagem de conclusão ausente no formulário Nossa Gente
**Causa raiz:** A `successMessage` já está salva no DB exatamente como solicitado. Mas em `PublicFormPage.tsx` (linhas 877-909), quando o formulário tem `showRegistrationNumber + enableCheckin` (caso do Nossa Gente), só são renderizados o número, QR Code e código de check-in. A `successMsg` aparece apenas no `else` raso (sem checkin) — por isso nunca é exibida nesse fluxo.

**Correção:**
- Renderizar a `successMsg` **sempre** no card de sucesso, logo abaixo das informações de inscrição/QR/código, em todos os ramos (`registrationResult`, `standaloneRegNumber + checkinResult`, fallback). 
- Preservar quebras de linha (`whitespace-pre-line`) para que o texto multi-parágrafo do Nossa Gente seja exibido corretamente.
- Não alterar a lógica de redirect (continua só substituindo o formulário pela mensagem, sem navegar).
- Funciona em desktop e mobile — o card já é responsivo (`max-w-md w-full`).

**Arquivo:** `src/modules/gira-forms/PublicFormPage.tsx` (linhas 845-915).

---

### Resumo de arquivos tocados
| # | Arquivo | Tipo |
|---|---------|------|
| 1 | `src/modules/gira-forms/components/FormCheckinPanel.tsx` + `package.json` (`@zxing/browser`) | Frontend |
| 2 | `src/modules/gira-forms/PublicFormPage.tsx`, `types.ts`, `FormBuilderPage.tsx` | Frontend |
| 3 | `supabase/functions/send-event-confirmation/index.ts` + caller | Edge Function |
| 4 | `supabase/functions/send-event-confirmation/index.ts` | Edge Function |
| 5 | `src/modules/gira-forms/PublicFormPage.tsx` | Frontend |

Cada item é independente — alterações de um não afetam os outros. Nenhum schema novo, nenhuma migração de banco. Instalo `@zxing/browser` para o item 1; demais itens não precisam de dependência nova.

