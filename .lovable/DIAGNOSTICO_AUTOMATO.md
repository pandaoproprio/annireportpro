# DIAGNÓSTICO DE AUTOMAÇÃO — GIRA Relatórios → Automato

> Gerado em: 2026-03-10
> Objetivo: Avaliar o nível de maturidade de automação do sistema GIRA Relatórios
> Status: Somente diagnóstico (nenhuma alteração no sistema)

---

## ETAPA 1 — ANÁLISE DE ARQUITETURA

### O que existe

| Componente | Status | Evidência |
|---|---|---|
| **Triggers de banco** | ✅ Implementado | `update_sla_status` (trigger que recalcula status SLA em UPDATE), `fill_setor_responsavel` (preenche setor automaticamente), `track_report_publication` (rastreia publicação de relatórios), `handle_new_user` (cria perfil + role + permissões ao registrar), `update_updated_at_column` |
| **Realtime (event-driven parcial)** | ✅ Implementado | `useFormNotifications` usa `postgres_changes` para notificações em tempo real de respostas de formulário |
| **Polling periódico** | ✅ Implementado | `useFormNotifications` com `refetchInterval: 30s`, `useSlaTracking` com `staleTime: 30s` |
| **Integração externa automática** | ✅ Implementado | `createAsanaTaskOnPublish` dispara criação automática de tarefa no Asana ao publicar rascunho; `syncSlaToAsana` sincroniza status SLA |

### O que NÃO existe

| Componente | Status |
|---|---|
| **Fila de eventos (event queue)** | ❌ Inexistente — não há sistema de fila (Bull, pg_boss, etc.) |
| **Jobs agendados (cron)** | ❌ Inexistente — não há `pg_cron` configurado |
| **Worker de background** | ❌ Inexistente — toda lógica roda no browser do usuário |
| **Event bus central** | ❌ Inexistente — eventos são processados de forma dispersa |
| **Webhook receiver** | ❌ Inexistente — nenhum endpoint para receber webhooks externos |

### Avaliação: **Parcial — 35%**
O sistema tem triggers de banco e realtime, mas todo processamento depende de ação do usuário (abrir a página). Não há jobs autônomos rodando no servidor.

---

## ETAPA 2 — CAPACIDADE DE PERCEPÇÃO

### O que existe

| Capacidade | Status | Evidência |
|---|---|---|
| **Detectar novas respostas de formulário** | ✅ | Realtime subscription em `form_notifications` + `NotificationBell` |
| **Detectar inatividade do diário** | ✅ | `PendingActivitiesBanner` detecta se não há atividades há 7+ dias |
| **Detectar SLA vencido** | ✅ | `SlaLoginToast` exibe alerta ao login; `SlaOverdueBanner` mostra itens atrasados |
| **Detectar rascunhos estagnados** | ✅ | `usePerformanceTracking` calcula `staleDrafts` com threshold configurável |
| **Detectar excesso de WIP** | ✅ | `WipAlertBanner` compara rascunhos em aberto vs. limite configurável |

### O que NÃO existe

| Capacidade | Status |
|---|---|
| **Detecção proativa server-side** | ❌ — toda percepção é client-side (depende do usuário abrir o app) |
| **Monitoramento de anomalias** | ❌ — sem detecção automática de picos, quedas ou padrões incomuns |
| **Alertas por email/SMS** | ❌ — notificações existem apenas in-app |
| **Webhooks para sistemas externos** | ❌ — nenhuma integração de alertas push |

### Avaliação: **Parcial — 50%**
O sistema percebe várias condições importantes, mas depende 100% do usuário estar logado. Nenhuma percepção ocorre de forma autônoma.

---

## ETAPA 3 — CAPACIDADE DE ANÁLISE

### O que existe

| Capacidade | Status | Evidência |
|---|---|---|
| **Resumo executivo com IA** | ✅ | `AiExecutiveSummary` + edge function `generate-dashboard-summary` — gera análise de progresso, indicadores, riscos e recomendações |
| **Classificação automática de atividades** | ✅ | Edge function `classify-activity` classifica atividades por tipo usando IA |
| **OCR de listas de presença** | ✅ | Edge function `ocr-attendance` extrai nomes de imagens |
| **Narrativa automática para relatórios** | ✅ | Edge function `generate-narrative` gera textos narrativos |
| **Métricas de performance** | ✅ | `usePerformanceTracking` calcula lead time, cycle time, ranking de colaboradores |
| **Dashboard com gráficos** | ✅ | `ActivitiesByMonthChart`, `ActivityTypesChart`, `AttendeesByGoalChart` |

### O que NÃO existe

| Capacidade | Status |
|---|---|
| **Análise estatística automática** | ❌ — sem detecção de tendências, sazonalidade, correlações |
| **Análise comparativa entre projetos** | ❌ — cada projeto é analisado isoladamente |
| **Análise preditiva** | ❌ — sem modelos de projeção temporal |
| **Geração automática de insights** | ❌ — o resumo executivo é acionado manualmente |
| **Detecção de padrões** | ❌ — sem clustering ou análise de comportamento |

### Avaliação: **Parcial — 45%**
As ferramentas de análise existem, mas são todas acionadas manualmente pelo usuário. Nenhuma análise é executada automaticamente.

---

## ETAPA 4 — CAPACIDADE DE DECISÃO

### O que existe

| Capacidade | Status | Evidência |
|---|---|---|
| **Decisão de status SLA (regras)** | ✅ | Trigger `update_sla_status` decide automaticamente se é `no_prazo`, `atencao`, `atrasado` ou `bloqueado` baseado em thresholds configuráveis |
| **Atribuição automática de role** | ✅ | `handle_new_user` + `populate_default_permissions` atribui role e permissões automaticamente |
| **Classificação de tipo de atividade** | ✅ | IA classifica atividades baseado na descrição |
| **Preenchimento automático de setor** | ✅ | Trigger `fill_setor_responsavel` decide o setor baseado no role do usuário |

### O que NÃO existe

| Capacidade | Status |
|---|---|
| **Recomendações automáticas** | ❌ — o resumo executivo gera recomendações, mas não as executa nem prioriza |
| **Priorização automática de tarefas** | ❌ — a prioridade em `report_performance_tracking` é definida manualmente |
| **Detecção e resposta a problemas** | ❌ — detecta SLA atrasado mas não toma nenhuma ação corretiva |
| **Escalonamento automático** | ❌ — não há cadeia de escalonamento (notificar gestor, coordenador, etc.) |
| **Decisões baseadas em histórico** | ❌ — sem uso de dados históricos para decisões futuras |

### Avaliação: **Básico — 30%**
Existem decisões baseadas em regras simples (SLA, roles), mas nenhuma decisão inteligente, preditiva ou adaptativa.

---

## ETAPA 5 — CAPACIDADE DE AÇÃO

### O que existe

| Capacidade | Status | Evidência |
|---|---|---|
| **Criação automática de tarefa Asana** | ✅ | `createAsanaTaskOnPublish` cria tarefa automaticamente ao publicar |
| **Sincronização de status SLA → Asana** | ✅ | `syncSlaToAsana` propaga mudanças de status |
| **Notificação in-app de respostas** | ✅ | `form_notifications` criadas automaticamente; bell badge atualizado em realtime |
| **Rastreamento de publicação** | ✅ | Trigger `track_report_publication` registra automaticamente timestamps e lead time |

### O que NÃO existe

| Capacidade | Status |
|---|---|
| **Envio de email automático** | ❌ — campo `email_sent` existe mas nunca é `true`; nenhuma edge function envia emails de notificação |
| **Geração automática de relatórios** | ❌ — PDFs/DOCX são sempre gerados sob demanda |
| **Disparo de alertas push** | ❌ — sem push notifications (PWA poderia suportar) |
| **Workflows encadeados** | ❌ — nenhuma ação dispara outra ação automaticamente em cadeia |
| **Auto-remediation** | ❌ — sistema não corrige problemas sozinho |

### Avaliação: **Básico — 25%**
As ações existentes são reativas e limitadas. A maioria das operações requer intervenção humana.

---

## ETAPA 6 — CAPACIDADE DE APRENDIZADO

### O que existe

| Capacidade | Status | Evidência |
|---|---|---|
| **Dados históricos disponíveis** | ✅ | `audit_logs`, `system_logs`, `report_performance_tracking` armazenam histórico completo |
| **Métricas de lead time/cycle time** | ✅ | Calculados em `usePerformanceTracking` |

### O que NÃO existe

| Capacidade | Status |
|---|---|
| **Machine Learning** | ❌ — nenhum modelo treinado localmente |
| **Análise preditiva** | ❌ — sem previsão de tendências, prazos ou riscos |
| **Feedback loop** | ❌ — a IA (Gemini) não aprende com uso; é stateless |
| **Detecção de anomalias baseada em padrão** | ❌ — sem baseline comparativo |
| **Ajuste automático de thresholds** | ❌ — SLA e WIP thresholds são manuais |

### Avaliação: **Embrionário — 10%**
Os dados existem, mas não são utilizados para aprendizado ou predição.

---

## ETAPA 7 — ORQUESTRAÇÃO AUTÔNOMA

### O que existe

| Componente | Status |
|---|---|
| **Engine de automação** | ❌ Inexistente |
| **Workflow engine** | ❌ Inexistente |
| **Orquestrador de tarefas** | ❌ Inexistente |
| **Pipeline de processamento** | ❌ Inexistente |
| **State machine para workflows** | ❌ Inexistente |

### Avaliação: **Inexistente — 0%**
Não há nenhum componente de orquestração. Cada funcionalidade opera isoladamente.

---

## ETAPA 8 — GOVERNANÇA E CONTROLE

### O que existe

| Capacidade | Status | Evidência |
|---|---|---|
| **Auditoria de ações** | ✅ | `audit_logs` com action, entity, metadata. `system_logs` com old/new data, user agent, modified_by |
| **Log unificado** | ✅ | `logUnified()` escreve em ambas tabelas simultaneamente |
| **Visibilidade hierárquica** | ✅ | RLS policies em `system_logs`: SuperAdmin vê tudo, Admin vê subordinados, Analista vê oficineiros |
| **Imutabilidade de logs** | ✅ | Policies `Nobody can delete/update` em ambas tabelas de log |
| **Controle de permissões granular** | ✅ | `user_permissions` com 30+ permissões, `PermissionGuard` em rotas |
| **Roles hierárquicos** | ✅ | `user_roles` com 7 níveis, `get_role_level()` para comparação |

### O que NÃO existe

| Capacidade | Status |
|---|---|
| **Logs de automação separados** | ❌ — não há tabela dedicada para registrar decisões automáticas do sistema |
| **Revisão humana de decisões** | ❌ — triggers executam sem aprovação |
| **Dashboard de auditoria de automações** | ❌ — logs existem mas não há visualização focada em automações |
| **Rollback de decisões automáticas** | ❌ — sem capacidade de reverter ações do sistema |

### Avaliação: **Bom — 65%**
A governança existente é sólida para um sistema operado por humanos, mas não está preparada para auditar decisões autônomas.

---

## RESUMO CONSOLIDADO

| Etapa | Capacidade | Nível |
|---|---|---|
| 1. Arquitetura | Triggers + Realtime, sem jobs/filas | 35% |
| 2. Percepção | Client-side only, sem server-side proativo | 50% |
| 3. Análise | IA manual, sem análise automática | 45% |
| 4. Decisão | Regras simples, sem inteligência adaptativa | 30% |
| 5. Ação | Integração Asana + notificações, sem workflows | 25% |
| 6. Aprendizado | Dados existem, sem uso preditivo | 10% |
| 7. Orquestração | Inexistente | 0% |
| 8. Governança | Auditoria sólida, sem auditoria de automações | 65% |

---

## NÍVEL DE MATURIDADE DE AUTOMAÇÃO

### **Nível 1.8 / 5 — Reativo com Elementos Assistidos**

| Nível | Descrição | Status |
|---|---|---|
| **1** | **Manual** — Todas as operações requerem ação humana | ~~Superado~~ |
| **1.8** | **★ ATUAL ★ — Reativo Assistido** — Triggers e alertas reativos existem, IA auxilia sob demanda | ← Aqui |
| **2** | **Assistido** — Sistema detecta condições e sugere ações proativamente | Próximo alvo |
| **3** | **Semi-autônomo** — Sistema executa ações com supervisão humana | Médio prazo |
| **4** | **Autônomo supervisionado** — Sistema opera independentemente com revisão periódica | Longo prazo |
| **5** | **Automato completo** — Sistema autogerido com auto-aprendizado | Visão futura |

---

## MAPA DE GAPS — O QUE FALTA PARA CADA NÍVEL

### Para alcançar Nível 2 (Assistido)

| Prioridade | Componente | Descrição |
|---|---|---|
| 🔴 Crítico | **pg_cron + Jobs agendados** | Verificação periódica de SLA, rascunhos estagnados, inatividade — sem depender do login do usuário |
| 🔴 Crítico | **Email de alertas** | Enviar emails automáticos para SLA atrasado, inatividade, WIP excedido |
| 🟡 Alto | **Push notifications (PWA)** | Service worker já existe; falta implementar push para alertas críticos |
| 🟡 Alto | **Análise automática diária** | Cron job que roda resumo executivo IA e persiste resultado |
| 🟢 Médio | **Dashboard de automações** | Tela para visualizar o que o sistema fez automaticamente |

### Para alcançar Nível 3 (Semi-autônomo)

| Prioridade | Componente | Descrição |
|---|---|---|
| 🔴 Crítico | **Workflow engine** | State machine com etapas: Rascunho → Em Revisão → Aprovado → Publicado |
| 🔴 Crítico | **Escalonamento automático** | Cadeia: colaborador → coordenador → admin quando SLA escala |
| 🟡 Alto | **Geração automática de relatórios** | Relatório mensal gerado automaticamente com dados do período |
| 🟡 Alto | **Detecção de anomalias** | Baseline + desvio padrão para identificar comportamentos atípicos |
| 🟢 Médio | **Feedback loop para IA** | Persistir classificações aceitas/rejeitadas para melhorar sugestões |

### Para alcançar Nível 4+ (Autônomo)

| Prioridade | Componente | Descrição |
|---|---|---|
| 🔴 Crítico | **Orquestrador central** | Engine que coordena todas as automações com prioridade e dependências |
| 🔴 Crítico | **Análise preditiva** | Modelos de projeção: "projeto X vai atrasar em Y dias" |
| 🟡 Alto | **Auto-ajuste de thresholds** | SLA e WIP limits ajustados automaticamente com base no histórico |
| 🟡 Alto | **Auditoria de decisões automáticas** | Tabela dedicada + dashboard de revisão |
| 🟢 Médio | **API webhooks** | Endpoint para receber/enviar eventos de sistemas externos |

---

## ATIVOS EXISTENTES APROVEITÁVEIS

O sistema já possui fundações sólidas que podem ser reutilizadas:

1. **Triggers SQL** → Base para expandir automações server-side
2. **Realtime subscriptions** → Infraestrutura de eventos já operacional
3. **Edge Functions** → Ambiente para jobs e processamento server-side
4. **IA integrada (Gemini)** → Motor de análise pronto para ser automatizado
5. **Audit logs imutáveis** → Governança pronta para auditar automações
6. **SLA engine** → Lógica de deadlines, warnings e escalation já implementada
7. **Performance tracking** → Métricas de produtividade já calculadas
8. **Asana integration** → Padrão para integrar outros serviços externos
9. **PWA com Service Worker** → Infraestrutura para push notifications
10. **Permissões granulares** → Controle de acesso pronto para automações seguras

---

## CONCLUSÃO

O GIRA Relatórios está no **Nível 1.8** — um sistema predominantemente manual com elementos reativos inteligentes (triggers, alertas, IA sob demanda). A principal limitação é que **toda a inteligência depende do usuário estar logado**. Não há nenhum processo que rode autonomamente no servidor.

O caminho mais rápido para o **Nível 2** é implementar **pg_cron + edge functions agendadas** para monitoramento contínuo e **emails automáticos** para alertas críticos. Isso transformaria o sistema de "reativo" para "proativo".

Para o **Nível 3**, o sistema precisa de um **workflow engine** que coordene fluxos de aprovação e escalonamento automático.

Os **ativos existentes** (triggers, IA, SLA, audit logs) são fundações sólidas que reduzem significativamente o esforço de implementação.
