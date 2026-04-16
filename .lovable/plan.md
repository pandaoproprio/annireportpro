

## Plano: Integração Bidirecional Asana ↔ GIRA Relatórios

### Situação Atual

O sistema já possui uma integração básica com o Asana:
- Tabelas `asana_config` e `asana_task_mappings` no banco
- Edge Function `asana-integration` com ações: criar tarefas, sincronizar status, notificar, importar tarefas, backfill
- Painel de configuração em Settings (somente super_admin)
- Configuração salva por workspace/projeto único (um `project_gid` global)

O que **falta** para atender ao pedido:
- Seleção granular de múltiplos boards/projetos do Asana
- Sincronização bidirecional automática (webhook + polling)
- Status de sincronização por board com log de erros
- UI completa de gerenciamento por board

---

### Etapa 1 — Schema do banco (migration)

Criar duas novas tabelas e alterar `asana_config`:

1. **`asana_synced_projects`** — boards selecionados para sincronização
   - `id`, `asana_project_gid`, `asana_project_name`, `workspace_gid`, `sync_status` (ativo/pausado/erro), `last_synced_at`, `last_error`, `is_active`, `created_by`, timestamps
   - RLS: super_admin gerencia, authenticated lê

2. **`asana_sync_logs`** — log de erros e eventos de sincronização
   - `id`, `synced_project_id` (FK), `direction` (asana_to_gira / gira_to_asana), `event_type`, `entity_type`, `entity_id`, `asana_task_gid`, `status` (success/error), `error_message`, `created_at`
   - RLS: admin/super_admin lê

3. **Alterar `asana_config`**: adicionar `is_globally_enabled boolean DEFAULT true` para ativar/desativar integração global sem perder configurações

4. **Alterar `asana_task_mappings`**: adicionar `asana_project_gid text`, `last_remote_update timestamptz` para rastrear origem e resolver conflitos por timestamp

### Etapa 2 — Edge Function: `asana-sync` (nova)

Função dedicada à sincronização bidirecional, separada da edge function existente:

**Ações:**
- `sync_from_asana` — busca tarefas de um board selecionado, cria/atualiza atividades no GIRA. Mapeia: título→description, responsável→assignee, prazo→date, status→completed, descrição→results
- `sync_to_asana` — envia atualizações do GIRA (status, comentários) para tarefas mapeadas no Asana
- `webhook_receive` — endpoint para receber webhooks do Asana (POST de eventos)
- `register_webhook` — registra webhook no Asana para um projeto selecionado
- `force_sync` — sincronização manual forçada de um board específico
- `periodic_sync` — chamada pelo cron, itera todos os boards ativos

**Lógica de conflito**: compara `modified_at` do GIRA com `modified_at` do Asana — o mais recente prevalece.

**Logs**: toda operação grava em `asana_sync_logs` com board de origem, direção e resultado.

### Etapa 3 — Edge Function existente: `asana-integration`

Adicionar ações:
- `list_synced_projects` — retorna boards selecionados com status
- `add_synced_project` — adiciona board à sincronização
- `remove_synced_project` — remove board
- `toggle_global` — ativa/desativa integração global
- `get_sync_logs` — retorna logs paginados por board

### Etapa 4 — Cron job para fallback periódico

Agendar `asana-sync` (action: `periodic_sync`) a cada 15 minutos via `pg_cron` + `pg_net`.

### Etapa 5 — Hook `useAsana.tsx` — novos métodos

Adicionar ao hook existente:
- `useSyncedProjects()` — query dos boards selecionados com status
- `addSyncedProject`, `removeSyncedProject` — mutations
- `forceSyncBoard` — sincronização manual
- `toggleGlobalIntegration` — ativar/desativar global
- `useSyncLogs(boardId?)` — query dos logs com filtro por board

### Etapa 6 — UI: Novo `AsanaConfigPanel` expandido

Substituir o painel atual com seções:

1. **Cabeçalho** — status da conexão + toggle global (ativar/desativar tudo)
2. **Lista de boards** — tabela com:
   - Checkbox de seleção
   - Nome do board
   - Badge de status (ativo ✅ / pausado ⏸ / erro ❌)
   - Último sync
   - Botão "Sincronizar agora"
   - Botão remover
3. **Adicionar board** — botão que lista boards disponíveis do workspace com checkbox
4. **Funcionalidades existentes** — toggles já existentes (criar tarefas, sync status, etc.)
5. **Log de sincronização** — tabela paginada com filtro por board, mostrando direção, evento, status, erro, timestamp

### Etapa 7 — Integração GIRA → Asana nos hooks existentes

Adicionar chamadas automáticas em:
- `useActivities` — quando status de atividade muda, chamar `sync_to_asana`
- `useReportWorkflow` — quando status do workflow muda, sincronizar
- Comentários/progresso — criar comentário na tarefa do Asana correspondente

---

### Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/new.sql` | Novas tabelas + alterações |
| `supabase/functions/asana-sync/index.ts` | Nova edge function |
| `supabase/functions/asana-integration/index.ts` | Novas ações |
| `src/hooks/useAsana.tsx` | Novos hooks |
| `src/components/asana/AsanaConfigPanel.tsx` | UI expandida |
| `src/components/asana/AsanaSyncLogsTable.tsx` | Novo componente |
| `src/components/asana/AsanaBoardSelector.tsx` | Novo componente |

### Limitações

- Webhooks do Asana exigem que o endpoint seja publicamente acessível e passe pelo handshake de verificação — a edge function suporta isso nativamente
- O Asana tem rate limit de ~1500 req/min; a sincronização periódica respeitará isso com batches
- A resolução de conflito por timestamp funciona bem para edições não-simultâneas; edições no mesmo segundo podem perder uma das alterações

