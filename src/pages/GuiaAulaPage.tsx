import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

const GUIDE_CONTENT = `# 📘 Guia de Aula — Sistema GIRA Relatórios

Data: 10 de março de 2026
Plataforma: https://annireportpro.lovable.app
Powered by: AnnIReport | AnnITech

═══════════════════════════════════════════════════════════
1. O QUE É O GIRA?
═══════════════════════════════════════════════════════════

O GIRA Relatórios é um sistema web completo para gestão de projetos sociais e culturais financiados por editais públicos. Ele centraliza o registro de atividades, geração de relatórios oficiais, controle de equipes, orçamento, riscos e automações inteligentes.

PÚBLICO-ALVO:
• Coordenadores de projetos culturais
• Analistas e gestores de editais
• Equipes de campo (oficineiros)
• Gestores administrativos

STACK TECNOLÓGICA:
• Frontend: React + TypeScript + Vite
• Estilização: Tailwind CSS + shadcn/ui
• Backend: Lovable Cloud (Supabase/PostgreSQL)
• Autenticação: Auth nativo com MFA
• IA: Lovable AI (Gemini, GPT)
• PWA: Vite PWA com cache offline

═══════════════════════════════════════════════════════════
2. ARQUITETURA DO SISTEMA
═══════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                  │
│  Dashboard │ Diário de Bordo │ Relatórios │ Estratégico │
├─────────────────────────────────────────────────────────┤
│                  LOVABLE CLOUD (Backend)                 │
│  PostgreSQL+RLS │ Auth+MFA │ Edge Functions │ Storage   │
├─────────────────────────────────────────────────────────┤
│               AUTOMAÇÕES (Automato Engine)               │
│  Monitor Horário │ Orquestrador │ Weekly Digest │ Perf  │
└─────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
3. MÓDULOS DO SISTEMA
═══════════════════════════════════════════════════════════

3.1 🏠 DASHBOARD (/)
─────────────────────
Painel principal com visão consolidada:
• Cards de métricas (atividades, participantes, relatórios)
• Gráficos de atividades por mês e por tipo
• Heatmap de atividades
• Resumo executivo gerado por IA
• Análise Preditiva de atrasos
• Benchmarking entre projetos (Radar Chart)
• Contribuição da equipe

3.2 📝 DIÁRIO DE BORDO (/activities)
──────────────────────────────────────
Registro cronológico de todas as atividades do projeto:
• Campos: Data, tipo, local, descrição, resultados, desafios, equipe
• Fotos: Upload com legendas individuais
• Lista de presença: Upload de arquivos de frequência
• Despesas: Registro de custos vinculados à atividade
• Classificação IA: Tipo de atividade sugerido automaticamente
• Narrativa IA: Texto narrativo gerado a partir dos dados
• Kanban: Visualização em quadro (Rascunho / Publicado)
• Soft Delete: Atividades excluídas vão para a lixeira

3.3 📄 RELATÓRIO DO OBJETO (/report)
──────────────────────────────────────
Relatório Parcial de Cumprimento do Objeto — documento oficial:
• Seções reordenáveis (drag-and-drop)
• Config visual independente (banner, logos, rodapé institucional)
• Exportação PDF (ABNT NBR 14724) e DOCX
• Vinculação de atividades do Diário
• Geração de narrativa por IA
• Fluxo de aprovação (Workflow Engine)

3.4 👥 RELATÓRIO DA EQUIPE (/team-report)
──────────────────────────────────────────
Relatório individual de cada membro da equipe:
• Seleção de prestador/membro
• Relato de execução com editor rich-text
• Upload de fotos com legendas
• Seções adicionais customizáveis
• Exportação PDF e DOCX
• Workflow de aprovação

3.5 📋 JUSTIFICATIVA DE PRORROGAÇÃO (/justificativa)
─────────────────────────────────────────────────────
Documento formal para solicitar extensão de prazo:
• Seções: Objeto, Justificativa, Ações Executadas, Ações Futuras, Prazo
• Upload de documentos comprobatórios por seção
• Fotos de evidência por seção
• Exportação PDF e DOCX

3.6 📊 RELATÓRIO V2 (/report-v2)
──────────────────────────────────
Geração avançada via renderização server-side:
• Suporta grandes volumes de mídia
• Processamento via Edge Function (Puppeteer/Browserless)
• Paridade visual absoluta entre preview e PDF

3.7 📝 GIRA FORMS (/forms)
────────────────────────────
Construtor de formulários dinâmicos:
• Tipos de campo: texto, múltipla escolha, checkbox, data, email, CPF, escala, upload
• Design visual customizável (cores, logo, banner)
• Link público para respostas (/f/:id)
• Dashboard de respostas com gráficos
• Exportação CSV/Excel/PDF
• Notificações de novas respostas

3.8 🎪 GIRA EVENTOS (/eventos)
───────────────────────────────
Gestão de eventos vinculados ao projeto:
• Criação com data, local, categoria, vagas
• Imagem de capa
• Página pública de inscrição (/e/:id)
• Lista de inscritos com status
• Calendário visual

3.9 👥 GESTÃO DE EQUIPES (/team)
──────────────────────────────────
• Membros da equipe por projeto
• Vínculo com usuários do sistema
• Perfis e funções

═══════════════════════════════════════════════════════════
4. MÓDULOS ESTRATÉGICOS (Admin)
═══════════════════════════════════════════════════════════

4.1 ⚠️ GESTÃO DE RISCOS (/risks)
──────────────────────────────────
• Categorias: Técnico, Financeiro, Operacional, Legal, Externo
• Probabilidade × Impacto (Matriz 5×5)
• Planos de mitigação e contingência
• Status: Identificado → Mitigando → Resolvido

4.2 💰 CUSTOS CONSOLIDADOS (/budget)
─────────────────────────────────────
• Rubricas com valores planejados
• Despesas vinculadas a atividades
• Dashboard de execução financeira

4.3 🚀 SPRINTS & VELOCITY (/sprints)
──────────────────────────────────────
• Sprints com datas e itens
• Story points e velocidade
• Burndown chart

4.4 🔄 RETROSPECTIVAS (/retrospectives)
─────────────────────────────────────────
• O que foi bem / O que melhorar / Ações
• Vinculação a sprints

═══════════════════════════════════════════════════════════
5. SISTEMA DE SEGURANÇA
═══════════════════════════════════════════════════════════

5.1 AUTENTICAÇÃO
• Login com email/senha
• Verificação de email obrigatória
• MFA (autenticação de dois fatores)
• Troca de senha obrigatória no primeiro login
• Consentimento LGPD

5.2 PAPÉIS (ROLES)
┌──────────────┬───────┬──────────────────────────────────────────┐
│ Papel        │ Nível │ Permissões                               │
├──────────────┼───────┼──────────────────────────────────────────┤
│ Super Admin  │   5   │ Acesso total, gestão de usuários         │
│ Admin        │   4   │ Gestão completa, templates, logs         │
│ Analista     │   3   │ Criação/edição de relatórios             │
│ Coordenador  │   2   │ Gestão de atividades e aprovação         │
│ Oficineiro   │   1   │ Apenas registro de atividades            │
│ Usuário      │   0   │ Acesso básico                            │
└──────────────┴───────┴──────────────────────────────────────────┘

5.3 PERMISSÕES GRANULARES
• Sistema de 30+ permissões individuais
• Atribuídas automaticamente pelo papel
• Customizáveis por Super Admin
• Exemplos: diary_create, report_object_edit, forms_export

5.4 ROW-LEVEL SECURITY (RLS)
• Toda tabela tem políticas de segurança no banco
• Usuários só veem/editam dados autorizados
• Admins têm acesso ampliado
• Ninguém pode deletar fisicamente (soft-delete)

═══════════════════════════════════════════════════════════
6. WORKFLOW ENGINE (Fluxo de Aprovação)
═══════════════════════════════════════════════════════════

  Rascunho → Em Revisão → Aprovado → Publicado
                 ↓
             Devolvido → Em Revisão (resubmissão)

FUNCIONALIDADES:
• Auto-atribuição: seleciona revisor automaticamente
• Escalação automática: workflows parados >48h sobem de nível
• Notificações: in-app + email para cada transição
• Trilha de auditoria: toda mudança registrada (quem, quando, notas)

═══════════════════════════════════════════════════════════
7. AUTOMATO — Motor de Automação
═══════════════════════════════════════════════════════════

7.1 MONITOR (Horário — pg_cron)
• Detecta SLAs vencidos
• Identifica rascunhos estagnados (>7 dias)
• Alerta projetos inativos (>7 dias sem atividade)
• Escala workflows parados (>48h)
• Deduplicação (não repete alertas em 24h)
• Envia emails transacionais agrupados por usuário

7.2 ORQUESTRADOR (Avançado)
┌────────────────────────┬────────────────────────────────────────┐
│ Subsistema             │ Função                                 │
├────────────────────────┼────────────────────────────────────────┤
│ Detecção de Anomalias  │ Baseline estatístico (média + 2σ)     │
│ Auto-ajuste Thresholds │ Calcula P90 de lead time              │
│ Auto-remediação        │ Escala, notifica cadeia, alerta drafts│
│ Monitoramento padrão   │ SLAs, workflows, inatividade          │
└────────────────────────┴────────────────────────────────────────┘

7.3 JOBS AGENDADOS
• weekly-digest: Segunda 09h — resumo semanal para gestores
• daily-proactive-summary: Diário 07h — análise preditiva via IA
• monthly-performance-snapshot: Mensal — métricas históricas

═══════════════════════════════════════════════════════════
8. SLA (Service Level Agreement)
═══════════════════════════════════════════════════════════

CONFIGURAÇÃO:
• Prazo padrão: Dias + horas por tipo de relatório
• Alerta: Threshold de atenção
• Escalação: Threshold de escalação

STATUS:
🟢 No Prazo    — Dentro do tempo esperado
🟡 Atenção     — Aproximando-se do limite
🔴 Atrasado    — Prazo expirado
⛔ Bloqueado   — Ultrapassou tempo de escalação

═══════════════════════════════════════════════════════════
9. INTELIGÊNCIA ARTIFICIAL
═══════════════════════════════════════════════════════════

FUNCIONALIDADES IA:
• Classificação de atividade (Gemini Flash) — Diário de Bordo
• Narrativa de atividade (Gemini Flash) — Diário de Bordo
• Narrativa de relatório (Gemini Flash) — Relatórios
• Resumo executivo do Dashboard (Gemini Flash) — Dashboard
• Resumo proativo diário (Gemini Flash Lite) — Automato
• Chat assistente (Gemini Flash) — AiChatBot
• Feedback Loop — sistema aprende com aceites/rejeições

═══════════════════════════════════════════════════════════
10. EXPORTAÇÃO DE DOCUMENTOS
═══════════════════════════════════════════════════════════

FORMATOS SUPORTADOS:
• PDF (jsPDF cliente) — Relatórios padrão ABNT
• PDF (Puppeteer servidor) — Relatório V2, GIRA Forms
• DOCX (docx.js) — Todos os relatórios
• CSV/Excel — GIRA Forms

PADRÃO ABNT NBR 14724:
• Margens: Esquerda 30mm, Direita 20mm, Superior 30mm, Inferior 20mm
• Fonte: Times New Roman 12pt
• Entrelinha: 1.5
• Recuo de parágrafo: 12.5mm

═══════════════════════════════════════════════════════════
11. PWA — Progressive Web App
═══════════════════════════════════════════════════════════

• Instalação: Disponível em Android, iOS e Desktop
• Offline: Cache de API com NetworkFirst (5s timeout)
• Cache: Assets estáticos com CacheFirst
• Atualização: Service Worker com skipWaiting
• Guia: /instalar

═══════════════════════════════════════════════════════════
12. INTEGRAÇÕES
═══════════════════════════════════════════════════════════

ASANA:
• Criação automática de tarefas ao publicar relatórios
• Sincronização de status SLA
• Configurável em /settings

WEBHOOKS:
• Configuração por projeto
• Eventos: criação, atualização, publicação
• Assinatura HMAC para segurança

═══════════════════════════════════════════════════════════
13. NAVEGAÇÃO DO SISTEMA
═══════════════════════════════════════════════════════════

📊 VISÃO GERAL
  └─ Dashboard

📁 PROJETOS
  └─ [Seletor de Projeto]

📋 GESTÃO
  ├─ Diário de Bordo
  ├─ Relatório do Objeto
  ├─ Relatório da Equipe
  ├─ Justificativa Prorrogação
  ├─ Relatório V2
  ├─ Gestão de Equipes
  ├─ GIRA Forms
  └─ GIRA Eventos

📐 TEMPLATES (Admin)
  ├─ Templates de Relatórios
  ├─ Editor de Documentos
  └─ Editor WYSIWYG

📈 ESTRATÉGICO (Admin)
  ├─ Gestão de Riscos
  ├─ Custos Consolidados
  ├─ Sprints & Velocity
  ├─ Retrospectivas
  ├─ Auditoria de Maturidade
  ├─ Auditoria de IA
  └─ Valuation Report

⚙️ ADMINISTRAÇÃO
  ├─ Configurações
  ├─ Gestão de Usuários
  ├─ Logs do Sistema
  └─ Automato

═══════════════════════════════════════════════════════════
14. FLUXO TÍPICO DE USO
═══════════════════════════════════════════════════════════

COORDENADOR DE PROJETO:
1. Login → Primeiro acesso: trocar senha + consentimento LGPD
2. Criar Projeto (Onboarding) → Nome, fomento, datas, metas
3. Registrar Atividades no Diário de Bordo → Fotos, equipe, resultados
4. Gerar Relatório do Objeto → Vincular atividades, escrever narrativas
5. Configurar visual → Banner, logos, rodapé institucional
6. Enviar para aprovação → Workflow: Rascunho → Em Revisão
7. Após aprovação → Exportar PDF/DOCX para prestação de contas

OFICINEIRO:
1. Login (pode ser via /diario/login)
2. Selecionar Projeto
3. Registrar Atividade → Data, local, fotos, lista de presença
4. Classificação automática por IA
5. Salvar (rascunho ou publicar)

ADMIN:
1. Dashboard → Visão geral de todos os projetos
2. Revisar relatórios pendentes (Workflow)
3. Monitorar SLAs e alertas (Automato)
4. Gerenciar usuários e permissões
5. Configurar templates e integrações
6. Analisar riscos e orçamento

═══════════════════════════════════════════════════════════
15. TABELAS PRINCIPAIS DO BANCO
═══════════════════════════════════════════════════════════

• projects — Projetos com metas, equipe, datas
• activities — Atividades do diário de bordo
• team_reports — Relatórios da equipe
• justification_reports — Justificativas de prorrogação
• profiles — Perfis de usuário (nome, email)
• user_roles — Papéis dos usuários
• user_permissions — Permissões granulares
• report_workflows — Fluxo de aprovação
• report_sla_tracking — Tracking de SLAs
• report_sla_config — Configuração de SLAs
• automation_alerts — Alertas do Automato
• automation_runs — Execuções do Automato
• forms / form_fields / form_responses — GIRA Forms
• events / event_registrations — GIRA Eventos
• project_risks — Gestão de riscos
• project_budget_lines / project_expenses — Orçamento
• audit_logs / system_logs — Auditoria
• ai_feedback — Feedback de classificações IA
• webhook_config / webhook_logs — Webhooks
• retrospectives — Retrospectivas

═══════════════════════════════════════════════════════════
16. GLOSSÁRIO
═══════════════════════════════════════════════════════════

Fomento — Número do edital/contrato de financiamento
Objeto — Descrição formal do que o projeto deve entregar
SLA — Acordo de nível de serviço (prazo para conclusão)
Workflow — Fluxo de aprovação de relatórios
Automato — Motor de monitoramento autônomo
Rascunho — Documento salvo mas não publicado
Soft Delete — Exclusão lógica (marca como deletado, não apaga)
RLS — Row-Level Security (segurança no nível do banco)
PWA — Progressive Web App (app instalável no navegador)
Edge Function — Função serverless executada no backend
ABNT — Norma brasileira para formatação de documentos

═══════════════════════════════════════════════════════════

GIRA Relatórios © 2026 — powered by AnnIReport | AnnITech
`;

export default function GuiaAulaPage() {
  const handleDownloadTxt = () => {
    const blob = new Blob([GUIDE_CONTENT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Guia_Aula_GIRA_Relatorios.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with actions */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-foreground">📘 Guia de Aula — GIRA Relatórios</h1>
        <div className="flex gap-2">
          <Button onClick={handleDownloadTxt} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Baixar .TXT
          </Button>
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir / PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground bg-muted/30 p-8 rounded-lg border border-border">
          {GUIDE_CONTENT}
        </pre>
      </div>
    </div>
  );
}
