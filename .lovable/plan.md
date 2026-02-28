

# Camada de Gestao de Performance - Plano de Implementacao

## Resumo

Adicionar uma camada complementar de metricas de desempenho ao sistema GIRA Relatorios, sem modificar nenhuma funcionalidade, tabela, trigger ou fluxo existente. Tudo sera aditivo.

---

## 1. Migracao de Banco de Dados

Criar tabela `report_performance_tracking`:

```text
report_performance_tracking
+-------------------------+----------------------------+
| id                      | uuid PK                    |
| report_type             | sla_report_type (enum)     |
| report_id               | uuid NOT NULL              |
| project_id              | uuid NOT NULL              |
| user_id                 | uuid NOT NULL              |
| created_at              | timestamptz DEFAULT now()  |
| published_at            | timestamptz NULL           |
| calculated_lead_time    | double precision NULL      |
| calculated_cycle_time   | double precision NULL      |
| reopen_count            | integer DEFAULT 0          |
| priority                | integer DEFAULT 3 (1-5)    |
| performance_status      | text DEFAULT 'normal'      |
| updated_at              | timestamptz DEFAULT now()  |
+-------------------------+----------------------------+
```

**Indice unico**: `(report_type, report_id)` para evitar duplicatas.

**RLS**:
- SELECT: usuario ve os proprios (`auth.uid() = user_id`) + admins veem todos
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id` OU admin/super_admin
- DELETE: bloqueado (`false`)

**Trigger complementar `track_report_publication`**: Sera criado nas tabelas `team_reports` e `justification_reports` (AFTER UPDATE). Quando `is_draft` mudar de `true` para `false`:
- Faz UPSERT em `report_performance_tracking` preenchendo `published_at = now()` e calculando `calculated_lead_time` (horas entre `created_at` do relatorio original e `now()`).
- Quando `is_draft` mudar de `false` para `true` (reopen): incrementa `reopen_count`.

Esse trigger NAO altera as tabelas originais, apenas escreve na tabela complementar.

---

## 2. Novos Arquivos Frontend

### `src/types/performance.ts`
Tipos TypeScript para `ReportPerformanceTracking` e `PerformanceSummary`.

### `src/hooks/usePerformanceTracking.tsx`
Hook com React Query para:
- Buscar metricas por projeto (`report_performance_tracking` filtrado por `project_id`)
- Calcular agregacoes: tempo medio de publicacao, % no prazo (cruzando com `report_sla_tracking`), rascunhos > 7 dias
- Ranking por colaborador (agrupando por `user_id`, join com `profiles` para nomes)
- Contagem de rascunhos do usuario atual (para alerta WIP)
- Funcao `updatePriority(id, priority)` para atualizar prioridade

### `src/components/performance/PerformanceDashboard.tsx`
Nova aba "Performance" no Dashboard, com:
- Cards: Tempo Medio de Publicacao, % No Prazo, Rascunhos Criticos (> 7 dias), Total Atrasados
- Tabela de ranking por colaborador (nome, qtd publicados, tempo medio, reaberturas)
- Lista de relatorios em rascunho > 7 dias com responsavel e tempo em rascunho
- Tudo somente leitura

### `src/components/performance/WipAlertBanner.tsx`
Banner de alerta visual: se o usuario logado tiver mais de 5 rascunhos ativos (somando `team_reports` + `justification_reports` com `is_draft = true`), exibe um alerta amarelo no Dashboard. NAO bloqueia nenhuma acao.

---

## 3. Alteracoes em Arquivos Existentes

### `src/pages/Dashboard.tsx`
- Adicionar abas (Tabs) ao Dashboard: "Painel" (conteudo atual) e "Performance" (novo)
- O conteudo atual fica intacto dentro da aba "Painel"
- A aba "Performance" renderiza `<PerformanceDashboard />`
- Adicionar `<WipAlertBanner />` junto aos banners existentes (SLA, Pending)
- Visivel apenas para admins (`role === 'SUPER_ADMIN' || role === 'ADMIN'`)

### `src/integrations/supabase/types.ts`
NAO sera editado manualmente - atualizado automaticamente apos a migracao.

---

## 4. Garantias de Nao-Regressao

- Nenhuma coluna existente sera alterada
- Nenhum trigger existente sera modificado
- Nenhuma politica RLS existente sera tocada
- O fluxo de isDraft permanece identico
- O SLA atual continua funcionando independentemente
- A tabela complementar apenas observa mudancas via trigger AFTER UPDATE
- O Dashboard atual fica preservado dentro da aba "Painel"

