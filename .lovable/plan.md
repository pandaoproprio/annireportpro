

## Diagnóstico

**Bug**: Em `https://forms.giraerp.com.br/f/nossa-gente`, ao clicar no botão de check-in, o sistema pede login. O check-in deveria ser público (via QR code do participante), validado por geolocalização.

### Causas raiz

1. **Rota de check-in protegida ou inexistente no domínio público**
   - O componente `CheckinPage.tsx` existe em `src/modules/gira-eventos/components/CheckinPage.tsx`, mas é da arquitetura **Eventos** (`event_id` + `event_registrations`), não de **Forms** (`form_id` + `form_responses`).
   - O domínio `forms.giraerp.com.br` usa `FormsOnlyRoutes.tsx`, que **provavelmente não inclui** uma rota pública `/checkin/:formResponseId`. Quando o link de check-in é aberto, cai numa rota protegida → redireciona para login.

2. **Edge function `validate-checkin-geofence` só lê de `events`/`forms`, não de `form_responses`**
   - O formulário "Nossa Gente" tem `geofence_lat = null` no banco — a coordenada do local (R. Souza e Silva, 112) **nunca foi configurada**.
   - Sem geofence configurada, mesmo se a rota existir, a validação falha.

3. **Não existe lista pública de quem fez check-in no painel admin**
   - O painel `FormCheckinPanel.tsx` existe mas precisa exibir contador + lista em tempo real.

---

## Plano de Correção

### 1. Configurar geofence do formulário "Nossa Gente"
Geocodificar o endereço **R. Souza e Silva, 112 - Saúde/Gamboa, Rio de Janeiro** → aproximadamente `lat: -22.8989, lng: -43.1869`. Salvar em `forms`:
```sql
UPDATE forms SET 
  geofence_lat = -22.8989, 
  geofence_lng = -43.1869, 
  geofence_radius_meters = 150,
  pre_checkin_enabled = true
WHERE id = '5e1aeab8-ebf1-42a4-a7fd-75721b8d3aad';
```

### 2. Criar rota pública de check-in para Forms
Criar **`src/modules/gira-forms/PublicCheckinPage.tsx`** (análogo ao `CheckinPage.tsx` de eventos, mas operando em `form_responses` + `form_checkins`).

Fluxo:
- URL: `/c/:checkinCode` (ex: `forms.giraerp.com.br/c/A3B7K9`)
- Busca `form_responses` por `checkin_code` → obtém `form_id`
- Carrega geofence do `forms`
- Solicita geolocalização → chama `validate-checkin-geofence` com `form_id`
- Registra em `form_checkins` (1 por `form_response_id` — UNIQUE constraint)

Adicionar rota em **`FormsOnlyRoutes.tsx`** e **`AppRoutes.tsx`** como **rota pública** (fora de `ProtectedRoute`).

### 3. Permitir check-in manual pelo organizador
No painel admin (`FormCheckinPanel.tsx`):
- Botão "Marcar presença" ao lado de cada inscrito (cria `form_checkins` com `is_manual=true`).
- Lista em tempo real via Supabase Realtime mostrando: nome, hora do check-in, método (QR/manual), distância.
- Contador "X de Y confirmaram presença".

### 4. Garantir UNIQUE em `form_checkins`
Migration:
```sql
ALTER TABLE form_checkins 
ADD CONSTRAINT unique_response_checkin UNIQUE (form_response_id);
```
(Se já existir, pular.)

### 5. RLS pública para check-in
- `form_checkins` deve permitir INSERT anônimo quando o `form_response_id` existir (validado via edge function).
- SELECT restrito ao dono do form + colaboradores.

---

## Arquivos a tocar

| Arquivo | Ação |
|---|---|
| `src/modules/gira-forms/PublicCheckinPage.tsx` | **Criar** — página pública de check-in |
| `src/routes/FormsOnlyRoutes.tsx` | Adicionar rota `/c/:code` pública |
| `src/routes/AppRoutes.tsx` | Adicionar rota `/c/:code` pública |
| `src/modules/gira-forms/components/FormCheckinPanel.tsx` | Adicionar lista realtime + botão check-in manual |
| `supabase/functions/validate-checkin-geofence/index.ts` | Já lê de `forms` — **OK** |
| Migration SQL | UNIQUE em `form_checkins`, RLS pública para INSERT |
| Update SQL | Definir `geofence_lat/lng` em "Nossa Gente" |

## Observações

- **Cache do Service Worker**: após deploy, testar em janela anônima.
- **Endereço Saúde vs Gamboa**: o CEP 20220-560 é oficialmente Saúde, mas Maps às vezes retorna Gamboa — coordenadas são as mesmas, raio de 150m cobre ambos.
- **Sem login**: a página `/c/:code` será 100% pública; a única "credencial" é o `checkin_code` único (6 chars) gerado em `form_responses`.

