
# Auditoria Completa do Sistema GIRA Relatorios

## Nota Geral: 6.2 / 10
**Classificacao: Produto Intermediario** -- acima de MVP, abaixo de Enterprise-ready.

---

## 1. CONTEXTO IDENTIFICADO

- **Tipo**: SaaS para gestao de projetos sociais (prestacao de contas)
- **Publico-alvo**: ONGs brasileiras (CEAP, Aluande)
- **Modelo**: B2B / assinatura (implicitamente)
- **Mercado**: Brasil / nicho de projetos sociais com fomento publico

---

## 2. ANALISE TECNICA

### 2.1 Arquitetura (React + Supabase)

**Pontos positivos:**
- Stack moderna e coerente (React 18, Vite, Tailwind, Supabase)
- Separacao de contextos (AuthProvider, AppDataProvider)
- RBAC com 4 niveis (SUPER_ADMIN, ADMIN, USER, OFICINEIRO)
- Soft delete implementado em todas as tabelas principais
- Audit logs centralizados

**Problemas identificados:**

| Problema | Severidade | Detalhes |
|----------|-----------|---------|
| Fotos armazenadas como Base64 no banco | CRITICO | As imagens de atividades e relatorios sao convertidas em base64 e salvas em colunas text/jsonb. Isso infla o banco de dados exponencialmente e causa lentidao em queries. Um projeto com 100 atividades e 3 fotos cada pode facilmente ultrapassar 1GB somente de imagens. |
| Sem paginacao nas queries | ALTO | `useActivities` e `useProjects` carregam TODOS os registros de uma vez. Com 1000+ atividades o app vai travar. Limite do Supabase eh 1000 linhas por query. |
| Sem TanStack Query para cache | ALTO | Os hooks usam `useState` + `useEffect` manual ao inves de `useQuery`/`useMutation` do TanStack. Isso significa zero cache, zero refetch automatico, zero stale-while-revalidate. O TanStack Query esta instalado mas quase nao eh usado (exceto no SecureDeleteDialog). |
| Estado duplicado (Server State como Client State) | MEDIO | `useProjects` e `useActivities` mantem estado no `useState` e sincronizam manualmente com `setProjects(prev => ...)`. Isso deveria ser server state via TanStack Query. |
| `role` nao incluido no `useCallback` dependencies | MEDIO | Em `useActivities`, o `fetchActivities` callback depende de `role` mas nao o inclui no array de dependencias. Admins podem ver dados incorretos apos troca de sessao. |
| Componente ReportGenerator tem 1033 linhas | MEDIO | Arquivo monolitico dificil de manter e testar. Deveria ser quebrado em subcomponentes. |
| `window.confirm` e `alert()` usados | BAIXO | Em Settings.tsx usa `window.confirm` para exclusao e `alert()` para feedback -- inconsistente com o resto da UX que usa Toast/Dialog. |

### 2.2 Multi-tenancy

**NAO EXISTE multi-tenancy real.** O sistema usa `user_id` para isolamento, mas nao tem conceito de "organizacao" ou "tenant". Se duas ONGs usarem o sistema, seus dados sao isolados por usuario, nao por organizacao. Isso impede:
- Compartilhamento de dados entre membros da mesma ONG
- Dashboard organizacional
- Billing por organizacao

### 2.3 Soft Delete e Auditoria

- Soft delete: Implementado corretamente com `deleted_at` em projects, activities e team_reports
- Audit logs: Funcionando para DELETEs, mas nao para UPDATEs (alteracoes de dados por admins nao sao rastreadas)
- Logs NAO sao imutaveis (sem politica RLS impedindo UPDATE/DELETE em audit_logs)
- Sem sistema de "lixeira" com restore na UI
- Sem exclusao automatica apos N dias

---

## 3. SEGURANCA

### 3.1 Vulnerabilidades Encontradas (Security Scan)

| Risco | Nivel | Descricao |
|-------|-------|-----------|
| Dados sensiveis expostos | CRITICO | Tabelas `profiles`, `team_members` e `projects` nao negam acesso publico explicitamente. Politicas RLS existem para `authenticated` mas nao bloqueiam `anon`. |
| Audit logs podem ser adulterados | ALTO | Nenhuma politica impede UPDATE ou DELETE em `audit_logs`. Um usuario mal-intencionado poderia apagar seus proprios rastros. |
| Hard delete possivel | MEDIO | Tabelas `activities`, `team_reports` e `projects` nao tem politica `DELETE USING (false)` explicita. |
| `user_roles` sem protecao de escrita | MEDIO | Tabela `user_roles` so tem politica SELECT. INSERT/UPDATE/DELETE nao estao protegidos por RLS (mas sao protegidos pelo Service Role Key na edge function). |
| Edge Function admin-users com verify_jwt = false | ALTO | A funcao faz sua propria validacao JWT, mas desabilitar a verificacao no gateway eh um risco se houver erro na implementacao. |

### 3.2 LGPD Compliance

| Requisito | Status |
|-----------|--------|
| Direito ao esquecimento | NAO implementado. Nao ha mecanismo para exclusao total de dados pessoais. |
| Consentimento explicito | NAO implementado. Nao ha termos de uso ou consentimento no cadastro. |
| Politica de privacidade | Links existem no login (/lgpd, /licenca) mas as paginas NAO existem (404). |
| Exportacao de dados (portabilidade) | NAO implementado. |
| DPO / Encarregado | NAO definido. |

### 3.3 Segregacao de Funcoes (SoD)

- **Parcialmente implementada.** SUPER_ADMIN gerencia usuarios, ADMIN ve tudo, USER ve so o proprio, OFICINEIRO so acessa Diario.
- **Falta:** ADMIN pode editar e deletar dados de outros sem aprovacao ou dupla autenticacao. Nao ha "maker/checker" para acoes criticas.
- **10+ niveis de permissao:** NAO. Apenas 4 niveis. Para enterprise seria necessario permissoes granulares (ex: pode_ver_relatorios, pode_exportar_pdf, pode_deletar_projetos).

---

## 4. UX / PRODUTO

### 4.1 Pontos positivos
- Login bem desenhado com beneficios visuais
- Sidebar organizada com secoes claras
- Feedback visual (loaders, toasts, badges de papel)
- Busca e filtros no Diario de Bordo

### 4.2 Problemas
- **Recuperacao de senha:** Nao funciona. Mostra toast "entre em contato com o admin" em vez de fluxo real.
- **Onboarding longo:** Formulario de criacao de projeto tem muitos campos sem wizards ou etapas.
- **Sem dashboard analitico real:** Apenas 4 stat cards e listas simples. Sem graficos, sem tendencias, sem comparativos.
- **Relatório tem 1000+ linhas em um unico componente:** UX de edicao confusa misturada com preview.
- **Sem notificacoes:** Nenhum sistema de avisos, lembretes ou alertas.
- **Sem modo offline:** Perda total se desconectar.

### 4.3 Oportunidades
- IA para gerar narrativas de relatorios a partir das atividades do Diario de Bordo
- Dashboard com graficos (Recharts ja esta instalado mas nao eh usado)
- Automacao de relatorios periodicos
- Templates de relatorios pre-configurados por financiador

---

## 5. ESCALABILIDADE

### Onde quebra primeiro?

| Escala | Ponto de falha |
|--------|---------------|
| 10x usuarios (~50) | Fotos em base64 inflam o banco. Queries lentas. |
| 100x dados (~10k atividades) | `useActivities` carrega tudo sem paginacao. Limite de 1000 do Supabase oculta dados. |
| Multi-ONG | Sem multi-tenancy. Admins de uma ONG veriam dados de outra. |

---

## 6. MERCADO / COMPETITIVIDADE

### Comparacao com lideres
- **PROSAS** (plataforma de gestao de projetos sociais): Mais maduro, multi-tenant, com fluxos de aprovacao
- **Bússola Social**: Dashboards analiticos, indicadores de impacto
- **GIRA (este sistema)**: Diferencial na geracao de relatorios formatados (PDF/DOCX ABNT) e no Diario de Bordo integrado

### Diferencial competitivo
- Relatorios de prestacao de contas automatizados a partir do diario de bordo
- UX limpa e moderna comparada a sistemas legados do setor
- Papel OFICINEIRO dedicado para campo

### Recursos obrigatorios que faltam
1. Recuperacao de senha funcional
2. Paginacao de dados
3. Storage real para fotos (nao base64)
4. Graficos e indicadores de impacto
5. Exportacao de dados para portabilidade

### Recursos irrelevantes que podem ser removidos
- Nenhum identificado. O sistema eh enxuto.

---

## 7. TOP 5 MELHORIAS TECNICAS

1. **Migrar fotos para Storage** -- Usar o bucket de armazenamento existente (team-report-photos) para TODAS as fotos. Remover base64 do banco.
2. **Adotar TanStack Query em todos os hooks** -- Substituir useState+useEffect manual por useQuery/useMutation. Ganho imediato em cache, retry, loading states.
3. **Implementar paginacao** -- Queries com `.range()` e scroll infinito ou paginacao classica.
4. **Blindar audit_logs** -- Adicionar politica `FOR UPDATE USING (false)` e `FOR DELETE USING (false)`.
5. **Adicionar politicas `DELETE USING (false)`** em projects, activities e team_reports para impedir hard delete.

---

## 8. TOP 5 MELHORIAS ESTRATEGICAS

1. **IA para geracao de narrativas** -- Usar o modelo Gemini disponivel para gerar textos de relatorios a partir das atividades registradas.
2. **Dashboard analitico** -- Graficos com Recharts: atividades por mes, participantes por meta, progresso temporal.
3. **Multi-tenancy real** -- Criar tabela `organizations` e vincular projetos a organizacoes em vez de usuarios individuais.
4. **Compliance LGPD** -- Implementar paginas de privacidade, consentimento, exclusao de dados e exportacao.
5. **Recuperacao de senha funcional** -- Implementar fluxo de reset via email usando o Auth do backend.

---

## 9. RISCOS OCULTOS

1. **Base64 como bomba-relogio**: O banco vai crescer descontroladamente com uso real. Estimativa: 5MB por atividade com fotos = 5GB com 1000 atividades.
2. **Limite de 1000 linhas**: Projetos com mais de 1000 atividades simplesmente nao mostrarao as mais antigas. O usuario nao sabera que dados estao faltando.
3. **verify_jwt = false na edge function**: Se a validacao manual de JWT falhar por qualquer motivo, a funcao fica totalmente aberta.
4. **Risco juridico**: Links de LGPD e Termos de Uso apontam para paginas inexistentes. Em caso de inspecao da ANPD, isso eh infração.
5. **Ausencia de versionamento de registros**: Quando um admin altera uma atividade de outro usuario, a versao anterior se perde completamente.

---

## 10. ROADMAP RECOMENDADO (90 DIAS)

### Semanas 1-2: Fundacao Tecnica
- Migrar fotos para Storage (bucket)
- Implementar paginacao em atividades e projetos
- Blindar audit_logs (RLS imutavel)
- Adicionar politicas DELETE USING (false)

### Semanas 3-4: Seguranca e Compliance
- Implementar recuperacao de senha
- Criar paginas LGPD e Termos de Uso
- Adicionar consentimento no cadastro
- Corrigir dependencias do useCallback

### Semanas 5-6: TanStack Query Migration
- Refatorar useProjects para useQuery
- Refatorar useActivities para useQuery
- Refatorar useTeamReports para useQuery
- Implementar optimistic updates

### Semanas 7-8: Produto
- Dashboard analitico com graficos (Recharts)
- IA para sugestao de narrativas nos relatorios
- Quebrar ReportGenerator.tsx em subcomponentes

### Semanas 9-10: Enterprise
- Multi-tenancy (tabela organizations)
- Audit logs para UPDATE (nao so DELETE)
- Sistema de lixeira com restore na UI

### Semanas 11-12: Polish
- Testes automatizados (Vitest)
- Notificacoes e lembretes
- Revisao de acessibilidade
- Documentacao tecnica

---

## Secao Tecnica Detalhada

### Causa raiz dos problemas

**Base64 em banco**: As funcoes `handlePhotoUpload` em ActivityManager.tsx e ReportGenerator.tsx usam `FileReader.readAsDataURL()` e salvam o resultado diretamente nos arrays `photos` que vao para colunas `text[]` no PostgreSQL. A correcao exige upload para Storage com `supabase.storage.from('bucket').upload()` e armazenamento apenas da URL publica.

**Falta de paginacao**: `useActivities` faz `supabase.from('activities').select('*')` sem `.range()`. Quando ultrapassa 1000 rows, o Supabase silenciosamente trunca o resultado.

**TanStack Query subutilizado**: O pacote esta instalado (`@tanstack/react-query ^5.83.0`) e o QueryClientProvider esta configurado no App.tsx, mas os hooks principais (useProjects, useActivities, useTeamReports) fazem fetch manual com useState+useEffect. Apenas SecureDeleteDialog usa useMutation.

**Audit logs frageis**: A tabela `audit_logs` tem RLS para SELECT e INSERT mas nao para UPDATE e DELETE. Um usuario com acesso direto ao banco (ou via falha de seguranca) poderia apagar evidencias.
