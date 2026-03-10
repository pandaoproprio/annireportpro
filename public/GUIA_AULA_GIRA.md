# 📘 Guia de Aula — Sistema GIRA Relatórios

> **Data**: 10 de março de 2026  
> **Plataforma**: https://annireportpro.lovable.app  
> **Powered by**: AnnIReport | AnnITech

---

## 1. O que é o GIRA?

O **GIRA Relatórios** é um sistema web completo para **gestão de projetos sociais e culturais financiados por editais públicos**. Ele centraliza o registro de atividades, geração de relatórios oficiais, controle de equipes, orçamento, riscos e automações inteligentes.

### Público-alvo
- Coordenadores de projetos culturais
- Analistas e gestores de editais
- Equipes de campo (oficineiros)
- Gestores administrativos

### Stack Tecnológica
| Camada | Tecnologia |
|---|---|
| Frontend | React + TypeScript + Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Backend | Lovable Cloud (Supabase) |
| Banco de Dados | PostgreSQL |
| Autenticação | Auth nativo com MFA |
| IA | Lovable AI (Gemini, GPT) |
| PWA | Vite PWA com cache offline |

---

## 2. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Dashboard │ │Diário de │ │Relatórios│ │  Módulos   │ │
│  │          │ │ Bordo    │ │PDF/DOCX  │ │Estratégicos│ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────┤
│                  LOVABLE CLOUD (Backend)                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │PostgreSQL│ │  Auth +  │ │  Edge    │ │  Storage   │ │
│  │  + RLS   │ │  MFA     │ │Functions │ │  (Fotos)   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
├─────────────────────────────────────────────────────────┤
│               AUTOMAÇÕES (Automato Engine)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Monitor  │ │Orquestrad│ │ Weekly   │ │Performance │ │
│  │ Horário  │ │  or      │ │ Digest   │ │ Snapshots  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Módulos do Sistema

### 3.1 🏠 Dashboard
**Rota**: `/`

Painel principal com visão consolidada:
- Cards de métricas (atividades, participantes, relatórios)
- Gráficos de atividades por mês e por tipo
- Heatmap de atividades
- Resumo executivo gerado por IA
- Análise Preditiva de atrasos
- Benchmarking entre projetos (Radar Chart)
- Contribuição da equipe

---

### 3.2 📝 Diário de Bordo
**Rota**: `/activities`

Registro cronológico de todas as atividades do projeto:
- **Campos**: Data, tipo, local, descrição, resultados, desafios, equipe
- **Fotos**: Upload com legendas individuais
- **Lista de presença**: Upload de arquivos de frequência
- **Despesas**: Registro de custos vinculados à atividade
- **Classificação IA**: Tipo de atividade sugerido automaticamente
- **Narrativa IA**: Texto narrativo gerado a partir dos dados
- **Kanban**: Visualização em quadro (Rascunho / Publicado)
- **Soft Delete**: Atividades excluídas vão para a lixeira

---

### 3.3 📄 Relatório do Objeto
**Rota**: `/report`

Relatório Parcial de Cumprimento do Objeto — documento oficial para prestação de contas:
- Seções reordenáveis (drag-and-drop)
- Config visual independente (banner, logos, rodapé institucional)
- Exportação PDF (ABNT NBR 14724) e DOCX
- Vinculação de atividades do Diário
- Geração de narrativa por IA
- Fluxo de aprovação (Workflow Engine)

---

### 3.4 👥 Relatório da Equipe
**Rota**: `/team-report`

Relatório individual de cada membro da equipe:
- Seleção de prestador/membro
- Relato de execução com editor rich-text
- Upload de fotos com legendas
- Seções adicionais customizáveis
- Exportação PDF e DOCX
- Workflow de aprovação

---

### 3.5 📋 Justificativa de Prorrogação
**Rota**: `/justificativa`

Documento formal para solicitar extensão de prazo:
- Seções: Objeto, Justificativa, Ações Executadas, Ações Futuras, Prazo
- Upload de documentos comprobatórios por seção
- Fotos de evidência por seção
- Exportação PDF e DOCX

---

### 3.6 📊 Relatório V2
**Rota**: `/report-v2`

Geração avançada de relatórios via renderização server-side:
- Suporta grandes volumes de mídia
- Processamento via Edge Function (Puppeteer/Browserless)
- Paridade visual absoluta entre preview e PDF

---

### 3.7 📝 GIRA Forms
**Rota**: `/forms`

Construtor de formulários dinâmicos:
- Tipos de campo: texto curto/longo, múltipla escolha, checkbox, data, email, telefone, CPF, escala, upload
- Design visual customizável (cores, logo, banner)
- Link público para respostas (`/f/:id`)
- Dashboard de respostas com gráficos
- Exportação CSV/Excel/PDF
- Notificações de novas respostas

---

### 3.8 🎪 GIRA Eventos
**Rota**: `/eventos`

Gestão de eventos vinculados ao projeto:
- Criação com data, local, categoria, vagas
- Imagem de capa
- Página pública de inscrição (`/e/:id`)
- Lista de inscritos com status
- Calendário visual

---

### 3.9 👥 Gestão de Equipes
**Rota**: `/team`

Cadastro e vinculação de membros da equipe:
- Membros da equipe por projeto
- Vínculo com usuários do sistema
- Perfis e funções

---

## 4. Módulos Estratégicos (Admin)

### 4.1 ⚠️ Gestão de Riscos
**Rota**: `/risks`

Matriz de riscos do projeto:
- Categorias: Técnico, Financeiro, Operacional, Legal, Externo
- Probabilidade × Impacto (Matriz 5×5)
- Planos de mitigação e contingência
- Status: Identificado → Mitigando → Resolvido

### 4.2 💰 Custos Consolidados
**Rota**: `/budget`

Controle orçamentário:
- Rubricas com valores planejados
- Despesas vinculadas a atividades
- Dashboard de execução financeira

### 4.3 🚀 Sprints & Velocity
**Rota**: `/sprints`

Gestão ágil:
- Sprints com datas e itens
- Story points e velocidade
- Burndown chart

### 4.4 🔄 Retrospectivas
**Rota**: `/retrospectives`

Registro de lições aprendidas:
- O que foi bem / O que melhorar / Ações
- Vinculação a sprints

---

## 5. Sistema de Segurança

### 5.1 Autenticação
- Login com email/senha
- Verificação de email obrigatória
- MFA (autenticação de dois fatores)
- Troca de senha obrigatória no primeiro login
- Consentimento LGPD

### 5.2 Papéis (Roles)
| Papel | Nível | Permissões |
|---|---|---|
| Super Admin | 5 | Acesso total, gestão de usuários |
| Admin | 4 | Gestão completa, templates, logs |
| Analista | 3 | Criação/edição de relatórios e atividades |
| Coordenador | 2 | Gestão de atividades e aprovação |
| Oficineiro | 1 | Apenas registro de atividades |
| Usuário | 0 | Acesso básico |

### 5.3 Permissões Granulares
- Sistema de 30+ permissões individuais
- Atribuídas automaticamente pelo papel
- Customizáveis por Super Admin
- Exemplos: `diary_create`, `report_object_edit`, `forms_export`

### 5.4 Row-Level Security (RLS)
- **Toda** tabela tem políticas de segurança no banco
- Usuários só veem/editam dados autorizados
- Admins têm acesso ampliado
- Colaboradores de projetos têm acesso ao projeto
- Ninguém pode deletar fisicamente (soft-delete)

---

## 6. Workflow Engine (Fluxo de Aprovação)

```
  Rascunho → Em Revisão → Aprovado → Publicado
                  ↓
              Devolvido → Em Revisão (resubmissão)
```

### Funcionalidades:
- **Auto-atribuição**: Quando um relatório entra em revisão, o sistema automaticamente seleciona um revisor (coordenador ou analista do projeto)
- **Escalação automática**: Workflows parados >48h aumentam nível de escalação
- **Notificações**: In-app + email para cada transição de status
- **Trilha de auditoria**: Toda mudança de status é registrada com quem, quando e notas

---

## 7. Automato — Motor de Automação

O **Automato** é o sistema autônomo de monitoramento do GIRA.

### 7.1 Monitor (Horário)
Executa a cada hora via `pg_cron`:
- ✅ Detecta SLAs vencidos
- ✅ Identifica rascunhos estagnados (>7 dias)
- ✅ Alerta projetos inativos (>7 dias sem atividade)
- ✅ Escala workflows parados (>48h)
- ✅ Deduplicação (não repete alertas em 24h)
- ✅ Envia emails transacionais agrupados por usuário

### 7.2 Orquestrador (Avançado)
Motor cognitivo com 4 subsistemas:

| Subsistema | Função |
|---|---|
| **Detecção de Anomalias** | Baseline estatístico (média + 2σ) — detecta picos/quedas atípicas |
| **Auto-ajuste de Thresholds** | Calcula P90 de lead time e ajusta limites automaticamente |
| **Auto-remediação** | Escala workflows, notifica cadeia de gestores, alerta drafts críticos |
| **Monitoramento padrão** | SLAs, workflows parados, inatividade |

### 7.3 Outros Jobs Agendados

| Job | Frequência | Função |
|---|---|---|
| `weekly-digest` | Segunda 09h UTC | Resumo executivo semanal para gestores |
| `daily-proactive-summary` | Diário 07h UTC | Análise preditiva de status via IA |
| `monthly-performance-snapshot` | Mensal | Métricas históricas de lead/cycle time |

---

## 8. SLA (Service Level Agreement)

### Configuração
- **Prazo padrão**: Dias + horas por tipo de relatório
- **Alerta**: Threshold de atenção
- **Escalação**: Threshold de escalação
- Configurável por Admin em `/settings`

### Status
| Status | Significado |
|---|---|
| 🟢 No Prazo | Dentro do tempo esperado |
| 🟡 Atenção | Aproximando-se do limite |
| 🔴 Atrasado | Prazo expirado |
| ⛔ Bloqueado | Ultrapassou tempo de escalação |

---

## 9. Inteligência Artificial

### Funcionalidades IA
| Recurso | Modelo | Onde |
|---|---|---|
| Classificação de atividade | Gemini Flash | Diário de Bordo |
| Narrativa de atividade | Gemini Flash | Diário de Bordo |
| Narrativa de relatório | Gemini Flash | Relatórios |
| Resumo executivo do Dashboard | Gemini Flash | Dashboard |
| Resumo proativo diário | Gemini Flash Lite | Automato |
| Chat assistente | Gemini Flash | AiChatBot |
| Feedback Loop | Todos | Sistema aprende com aceites/rejeições |

### Feedback Loop
- Quando o usuário aceita ou rejeita uma classificação IA, o feedback é salvo
- Tabela `ai_feedback` armazena: output IA, feedback do usuário, correção
- Usado como few-shot para melhorar sugestões futuras

---

## 10. Exportação de Documentos

### Formatos Suportados
| Formato | Motor | Uso |
|---|---|---|
| PDF | jsPDF (cliente) | Relatórios padrão (ABNT) |
| PDF | Puppeteer (servidor) | Relatório V2, GIRA Forms |
| DOCX | docx.js | Todos os relatórios |
| CSV/Excel | Papa Parse | GIRA Forms |

### Padrão ABNT NBR 14724
- Margens: Esquerda 30mm, Direita 20mm, Superior 30mm, Inferior 20mm
- Fonte: Times New Roman 12pt
- Entrelinha: 1.5
- Recuo de parágrafo: 12.5mm

---

## 11. PWA — Progressive Web App

O GIRA funciona como app instalável:
- **Instalação**: Disponível em Android, iOS e Desktop
- **Offline**: Cache de API com NetworkFirst (5s timeout)
- **Cache**: Assets estáticos com CacheFirst
- **Atualização**: Service Worker com skipWaiting

### Guia de Instalação
- Rota: `/instalar`
- Instruções visuais para Android, iOS e Desktop

---

## 12. Integrações

### Asana
- Criação automática de tarefas ao publicar relatórios
- Sincronização de status SLA
- Configurável em `/settings`

### Webhooks
- Configuração por projeto
- Eventos: criação, atualização, publicação
- Assinatura HMAC para segurança
- Logs de execução

---

## 13. Navegação do Sistema

### Menu Lateral (Sidebar)

```
📊 Visão Geral
  └─ Dashboard

📁 Projetos
  └─ [Seletor de Projeto]

📋 Gestão
  ├─ Diário de Bordo
  ├─ Relatório do Objeto
  ├─ Relatório da Equipe
  ├─ Justificativa Prorrogação
  ├─ Relatório V2
  ├─ Gestão de Equipes
  ├─ GIRA Forms
  └─ GIRA Eventos

📐 Templates (Admin)
  ├─ Templates de Relatórios
  ├─ Editor de Documentos
  └─ Editor WYSIWYG

📈 Estratégico (Admin)
  ├─ Gestão de Riscos
  ├─ Custos Consolidados
  ├─ Sprints & Velocity
  ├─ Retrospectivas
  ├─ Auditoria de Maturidade
  ├─ Auditoria de IA
  └─ Valuation Report

⚙️ Administração
  ├─ Configurações
  ├─ Gestão de Usuários
  ├─ Logs do Sistema
  └─ Automato
```

---

## 14. Fluxo Típico de Uso

### Para um Coordenador de Projeto:

```
1. Login → Primeiro acesso: trocar senha + consentimento LGPD
2. Criar Projeto (Onboarding) → Nome, fomento, datas, metas
3. Registrar Atividades no Diário de Bordo → Fotos, equipe, resultados
4. Gerar Relatório do Objeto → Vincular atividades, escrever narrativas
5. Configurar visual → Banner, logos, rodapé institucional
6. Enviar para aprovação → Workflow: Rascunho → Em Revisão
7. Após aprovação → Exportar PDF/DOCX para prestação de contas
```

### Para um Oficineiro:

```
1. Login (pode ser via /diario/login)
2. Selecionar Projeto
3. Registrar Atividade → Data, local, fotos, lista de presença
4. Classificação automática por IA
5. Salvar (rascunho ou publicar)
```

### Para um Admin:

```
1. Dashboard → Visão geral de todos os projetos
2. Revisar relatórios pendentes (Workflow)
3. Monitorar SLAs e alertas (Automato)
4. Gerenciar usuários e permissões
5. Configurar templates e integrações
6. Analisar riscos e orçamento
```

---

## 15. Banco de Dados — Tabelas Principais

| Tabela | Registros |
|---|---|
| `projects` | Projetos com metas, equipe, datas |
| `activities` | Atividades do diário de bordo |
| `team_reports` | Relatórios da equipe |
| `justification_reports` | Justificativas de prorrogação |
| `profiles` | Perfis de usuário (nome, email) |
| `user_roles` | Papéis dos usuários |
| `user_permissions` | Permissões granulares |
| `report_workflows` | Fluxo de aprovação de relatórios |
| `report_sla_tracking` | Tracking de SLAs |
| `report_sla_config` | Configuração de SLAs |
| `automation_alerts` | Alertas do Automato |
| `automation_runs` | Execuções do Automato |
| `forms` / `form_fields` / `form_responses` | GIRA Forms |
| `events` / `event_registrations` | GIRA Eventos |
| `project_risks` | Gestão de riscos |
| `project_budget_lines` / `project_expenses` | Orçamento |
| `audit_logs` / `system_logs` | Auditoria |
| `ai_feedback` | Feedback de classificações IA |
| `webhook_config` / `webhook_logs` | Webhooks |
| `retrospectives` | Retrospectivas |

---

## 16. Glossário

| Termo | Definição |
|---|---|
| **Fomento** | Número do edital/contrato de financiamento |
| **Objeto** | Descrição formal do que o projeto deve entregar |
| **SLA** | Acordo de nível de serviço — prazo para conclusão |
| **Workflow** | Fluxo de aprovação de relatórios |
| **Automato** | Motor de monitoramento autônomo |
| **Rascunho** | Documento salvo mas não publicado |
| **Soft Delete** | Exclusão lógica (marca como deletado, não apaga) |
| **RLS** | Row-Level Security — segurança no nível do banco |
| **PWA** | Progressive Web App — app instalável no navegador |
| **Edge Function** | Função serverless executada no backend |
| **ABNT** | Norma brasileira para formatação de documentos |

---

## 17. URLs Importantes

| Recurso | URL |
|---|---|
| Sistema (Produção) | https://annireportpro.lovable.app |
| Formulário público | https://annireportpro.lovable.app/f/{slug} |
| Evento público | https://annireportpro.lovable.app/e/{id} |
| Guia de instalação | https://annireportpro.lovable.app/instalar |
| Política de Privacidade | https://annireportpro.lovable.app/lgpd |
| Termos de Uso | https://annireportpro.lovable.app/licenca |

---

> **GIRA Relatórios** © 2026 — powered by AnnIReport | AnnITech
