

# Plano: 5 Melhorias Rapidas para o GIRA

## 1. Corrigir Asana no TeamReport -- adicionar `logAction` unificado

**Problema**: `useTeamReports.tsx` usa apenas `logAuditEvent` (tabela `audit_logs`) mas nao usa `logAction` (tabela `system_logs`). Todos os outros modulos (Activities, Justification) ja usam ambos. Alem disso, o Asana task e criado corretamente, mas falta log de sistema para rastreabilidade.

**Acoes**:
- Em `useTeamReports.tsx`, importar `logAction` de `@/lib/systemLog`
- No `onSuccess` do `saveDraftMutation`, adicionar `logAction` para `team_report_created` (quando nao e draft) e `team_report_updated`
- No `deleteDraftMutation`, adicionar `logAction` para `team_report_deleted`

---

## 2. Unificar logs -- criar funcao wrapper

**Problema**: O sistema tem dois sistemas de log paralelos (`logAction` para `system_logs` e `logAuditEvent` para `audit_logs`) que sao chamados separadamente em cada modulo, gerando inconsistencias.

**Acoes**:
- Criar `src/lib/unifiedLog.ts` com uma funcao `logUnified` que chama ambos (`logAction` + `logAuditEvent`) em uma unica chamada fire-and-forget
- Migrar progressivamente: atualizar `useTeamReports.tsx`, `useActivities.tsx` e `useJustificationReports.tsx` para usar `logUnified` ao inves de chamadas separadas
- Manter os arquivos `systemLog.ts` e `auditLog.ts` existentes (sem quebrar nada)

---

## 3. Trigger de setor -- DB trigger para preencher `setor_responsavel` automaticamente

**Problema**: O campo `setor_responsavel` da tabela `activities` e preenchido no frontend via `deriveSetor()`. Se alguem inserir via API ou outro cliente, o campo fica vazio.

**Acoes**:
- Criar migration SQL com um trigger `BEFORE INSERT` na tabela `activities`
- O trigger consulta `user_roles` para obter o role do usuario e preenche `setor_responsavel` automaticamente usando a mesma logica de mapeamento do `deriveSetor()`
- Se o campo ja estiver preenchido no INSERT, o trigger nao sobrescreve (respeita valor explicito)

```text
Logica do trigger:
  role super_admin -> "Administracao Geral"
  role admin       -> "Administracao"
  role analista    -> "Setor Tecnico"
  role coordenador -> "Coordenacao de Projeto"
  role oficineiro  -> "Oficinas / Execucao"
  default          -> "Equipe Tecnica"
```

---

## 4. Revisar RLS -- corrigir politicas RESTRICTIVE em `report_diary_links`

**Problema**: As politicas da tabela `report_diary_links` sao todas RESTRICTIVE. Isso significa que um Admin que tenta fazer SELECT precisa satisfazer AMBAS as politicas (admin AND author), o que e incorreto. O comportamento esperado e que admin OU author possam ver.

**Acoes**:
- Remover as politicas existentes e recria-las como PERMISSIVE (padrao do Postgres)
- Manter a mesma logica: admins podem gerenciar tudo; usuarios podem ver/inserir/deletar os proprios links
- Isso alinha `report_diary_links` com o padrao das demais tabelas do sistema

---

## 5. Ajustar staleTime -- otimizar cache do SLA

**Problema**: O `staleTime` de `sla-tracking-all` esta em 30 segundos, mas essa query retorna TODOS os trackings e e usada em dashboards. Isso causa requisicoes excessivas. Ja `sla-configs` esta em 60s, o que e adequado.

**Acoes**:
- Em `useSlaTracking.tsx`: aumentar `staleTime` de `sla-tracking-all` de `30_000` para `120_000` (2 minutos)
- Manter `sla-tracking` por projeto em `30_000` (e mais granular e muda mais)
- Aumentar `sla-configs` de `60_000` para `300_000` (5 minutos, pois configs raramente mudam)

---

## Resumo tecnico dos arquivos afetados

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useTeamReports.tsx` | Adicionar `logAction`, migrar para `logUnified` |
| `src/lib/unifiedLog.ts` | **Novo** -- wrapper que chama ambos os logs |
| `src/hooks/useActivities.tsx` | Migrar para `logUnified` |
| `src/hooks/useSlaTracking.tsx` | Ajustar staleTime |
| Migration SQL | Trigger `setor_responsavel` + recriacao RLS `report_diary_links` |

Nenhuma funcionalidade existente sera removida. Todas as alteracoes sao aditivas ou corretivas.

