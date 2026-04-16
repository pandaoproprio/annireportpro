# Plano: Evolução Completa do Monitoramento de Produtividade

## Situação Atual

O sistema hoje tem uma estrutura básica:

- Tabela `user_productivity_snapshots` com métricas simples (activities_count, days_inactive, tasks_per_day, sla_violations)
- Edge Function que calcula snapshots baseado apenas em `activities` e login
- Dashboard com ranking, timeline e tabela de usuários
- Configuração básica (dias inativos, min tarefas/dia, max tempo tarefa)

## O que Será Adicionado

### 1. Novas Colunas no Snapshot (migração)

Adicionar à `user_productivity_snapshots`:

- `tasks_started` (int) — tarefas iniciadas no período
- `tasks_finished` (int) — tarefas finalizadas (não-rascunho)
- `reopen_count` (int) — tarefas reabertas (retrabalho)
- `overdue_count` (int) — tarefas fora do prazo SLA
- `concurrent_tasks` (int) — tarefas simultâneas em aberto
- `delivery_regularity` (numeric) — desvio padrão normalizado de entregas por semana
- `team_avg_activities` (numeric) — média da equipe para benchmark
- `percentile_rank` (numeric) — percentil do usuário na equipe
- `score` (numeric) — score consolidado 0-100

Adicionar à `monitoring_config`:

- `score_weights` (jsonb) — pesos configuráveis para cada dimensão do score

### 2. Edge Function Aprimorada

Expandir `daily-productivity-monitor` para calcular:

- **Engajamento**: frequência de login, dias inativo
- **Volume**: atividades totais, rascunho vs publicadas, entregas/semana
- **Eficiência**: tempo médio, taxa de atraso (usando `report_workflows` + SLA)
- **Qualidade**: reopen_count de `report_performance_tracking`, tarefas devolvidas em workflows
- **Consistência**: desvio padrão de entregas semanais
- **Benchmark**: média da equipe, percentil individual
- **Carga**: tarefas simultâneas em rascunho
- **Score consolidado**: média ponderada das dimensões

### 3. Alertas Inteligentes

Expandir a lógica de alertas:

- Queda brusca de produtividade (comparar snapshot atual vs anterior)
- Atrasos recorrentes (>2 violações SLA consecutivas)
- Tempo médio acima do normal (>1.5x da média da equipe)
- Incluir tipo de alerta no email

### 4. Dashboard Redesenhado

**Aba Dashboard** — 4 novas seções:

- **Cards KPI expandidos**: 6 cards (ativos, inativos, baixa prod., violações SLA, score médio, taxa retrabalho)
- **Gráfico Radar**: visão multidimensional por usuário (engajamento, volume, eficiência, qualidade, consistência)
- **Benchmark comparativo**: gráfico de barras agrupadas (indivíduo vs equipe)
- **Tendência de score**: LineChart com evolução do score ao longo do tempo

**Aba Usuários** — tabela expandida:

- Colunas adicionais: Score, Tarefas Iniciadas/Finalizadas, Retrabalho, Carga, Percentil
- Filtro por status e ordenação por qualquer coluna
- Mini-sparkline de tendência por usuário

**Nova Aba "Alertas"**:

- Histórico de alertas gerados
- Tipo, usuário, data, motivo

**Aba Config** — novos campos:

- Pesos do score por dimensão (sliders)
- Limiar de queda brusca (%)

### 5. PDF Expandido

Atualizar `monitoringPdfExport.ts` com:

- Novos KPIs
- Tabela com score e percentil
- Seção de alertas inteligentes

## O que NÃO será alterado

- Nenhuma alteração em arquivos globais (routeConfig, sidebarConfig, etc.)
- Lógica existente de login, atividades, ou workflows
- Tabelas existentes que funcionam corretamente

## Sequência de Implementação

1. Migração DB (novas colunas + tabela de alertas)
2. Edge Function atualizada
3. Hook `useProductivityMonitoring` expandido
4. Página `ProductivityMonitoringPage` redesenhada
5. PDF atualizado
6. Deploy e teste  
  
  
Tem que vincular também os usuários aos projetos que eles estão alocados e mostrar a função também