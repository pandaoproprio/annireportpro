## Análise

O usuário quer um sistema de **Pré-Checkin + Checkin por Geolocalização** aplicado ao formulário "Convite | Nossa Gente" (`/f/nossa-gente`). O escopo menciona "Agenda e Compromissos", mas o link aponta para um formulário público GIRA Forms — entendo que o "compromisso" aqui é o evento vinculado a este formulário (ou o próprio formulário com data/local).

Já existe infraestrutura relevante no projeto:

- `event_checkins` (tabela) com hash SHA-256, geolocalização, signature_data
- `event_registrations` (tabela) com qr_token e checkin_code
- `CheckinPage.tsx` no módulo gira-eventos (já faz checkin com geo opcional, mas **sem validação de raio**)
- `useEventCheckins.ts` com realtime subscription
- `FormCheckinPanel.tsx` no módulo gira-forms

**O que falta:**

1. Pré-checkin (intenção de comparecer, antes do evento)
2. Validação de raio geográfico no checkin efetivo
3. Configuração de raio + coordenadas por evento/formulário
4. Estado consolidado do participante (convidado / pré-checkin / presente / ausente)
5. Painel em tempo real para o organizador com contadores e checkin manual

## Plano

### 1. Banco de dados (migration)

**Nova tabela `event_pre_checkins`:**

- `id`, `event_id` (nullable), `form_id` (nullable, para suportar formulários sem evento), `registration_id` ou `response_id`, `user_identifier` (email/cpf), `confirmed_at`, `channel` (web/email/whatsapp), `ip_address`, `user_agent`, `metadata jsonb`
- Único por (form_id/event_id, user_identifier)
- RLS: insert público, select para owner do form/evento

**Adicionar colunas em `events` (e `forms` para o caso do Nossa Gente):**

- `geofence_lat numeric`, `geofence_lng numeric`, `geofence_radius_meters integer DEFAULT 200`
- `pre_checkin_enabled boolean DEFAULT true`

**Adicionar colunas em `event_checkins`:**

- `distance_meters numeric` (distância calculada no momento)
- `is_manual boolean DEFAULT false`
- `manual_by uuid` (organizador que fez o checkin manual)

**Função `calculate_distance_meters(lat1, lng1, lat2, lng2)**` — fórmula de Haversine em SQL.

**Realtime:** habilitar `event_pre_checkins` na publicação.

### 2. Backend / lógica de validação

Novo edge function `validate-checkin-geofence` (verify_jwt = false):

- Recebe: event_id/form_id, registration_id, lat, lng do dispositivo
- Busca coordenadas do evento e raio
- Calcula distância (Haversine)
- Se dentro do raio → retorna `allowed: true, distance_meters`
- Se fora → retorna `allowed: false, distance_meters, message`

Validação também acontece no client (rápida) **e** revalidada no insert via trigger ou no edge function antes do insert (para impedir bypass).

### 3. UI — Participante (público)

**Nova página `/f/:slug/pre-checkin**` (e/ou botão no formulário Nossa Gente após envio):

- Após submeter o formulário Nossa Gente, mostra opção "Confirmar presença antecipada (pré-checkin)"
- Registra na `event_pre_checkins`

**Atualizar `CheckinPage.tsx**` (ou criar `GeofencedCheckinPage.tsx` para forms):

- Solicita geolocalização (obrigatória, não opcional)
- Chama `validate-checkin-geofence`
- Se fora do raio: exibe distância em metros + mensagem ("Você está a ~450m do local. Aproxime-se para fazer check-in.")
- Se dentro: prossegue com assinatura + insert em `event_checkins` com `distance_meters`

### 4. UI — Organizador

**Configuração no editor do formulário/evento (`FormBuilderPage` aba "Configurações" ou `EventForm`):**

- Campos: Latitude, Longitude, Raio em metros (default 200), toggle pré-checkin habilitado
- Botão "Usar minha localização atual" para preencher coordenadas

**Atualizar `FormCheckinPanel.tsx` (painel do organizador):**

- 3 contadores no topo: Convidados / Pré-checkins / Presentes
- Tabela com lista de participantes mostrando estado: `Convidado` | `Pré-checkin` | `Presente` | `Ausente`
- Estado "Ausente" calculado: evento encerrado + sem checkin
- Coluna distância para cada checkin
- Botão "Checkin manual" por linha (insere com `is_manual=true, manual_by=auth.uid()`)
- Realtime: subscribe em `event_pre_checkins` e `event_checkins`

### 5. Hooks

- `useEventPreCheckins(eventId|formId)` — query + realtime + mutation create
- Atualizar `useEventCheckins` para incluir `distance_meters` e `is_manual`
- Novo helper `useParticipantStates(eventId|formId)` que cruza registrations + pre_checkins + checkins e devolve estado consolidado

### 6. Escopo

- Mudanças concentradas em: `gira-eventos/` (módulo principal de checkin) e ajuste mínimo no `FormCheckinPanel` do `gira-forms` para o formulário Nossa Gente
- Nenhum outro módulo (diary, reports, budget, etc.) será tocado

### Arquivos a criar/modificar

**Novos:**

- migration SQL (nova tabela + colunas + função haversine)
- `supabase/functions/validate-checkin-geofence/index.ts`
- `src/modules/gira-eventos/hooks/useEventPreCheckins.ts`
- `src/modules/gira-eventos/hooks/useParticipantStates.ts`
- `src/modules/gira-eventos/components/PreCheckinButton.tsx`
- `src/modules/gira-eventos/components/GeofenceConfigPanel.tsx`
- `src/modules/gira-eventos/components/OrganizerLiveDashboard.tsx`

**Modificar:**

- `src/modules/gira-eventos/components/CheckinPage.tsx` — geolocalização obrigatória + validação de raio
- `src/modules/gira-eventos/components/EventForm.tsx` — adicionar painel de geofence
- `src/modules/gira-forms/components/FormCheckinPanel.tsx` — contadores + estados + checkin manual
- `src/modules/gira-eventos/types.ts` — novos tipos
- `src/modules/gira-forms/PublicFormPage.tsx` — oferecer pré-checkin após envio do Nossa Gente

### Pontos a confirmar

1. Para o formulário **Nossa Gente** especificamente: ele tem data/local fixos? Vou ler o registro do form para extrair; se não tiver, o organizador precisará configurar coordenadas + data antes de ativar checkin.
2. Identidade do participante no pré-checkin: usar **email** (do form) ou exigir login? Proposta: usar email + checkin_code gerado no envio do form (já existe a função `generate_checkin_code`).  
  
  
Tem ser enviada também a localização do evento com o google maps, waze etc
3. &nbsp;