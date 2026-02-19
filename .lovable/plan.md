
# Auditoria Estrutural Completa — GIRA Relatorios

---

## 1. AUTH (Autenticacao)

### 1.1 Fluxo Login/Logout
- **Status**: Funcional
- Login via email/senha em `Login.tsx` e `DiaryLogin.tsx`
- Logout limpa estado local (`user`, `session`, `profile`, `role`, `permissions`)
- Cadastro publico desativado — apenas admins criam usuarios

### 1.2 Persistencia de Sessao
- **Status**: OK
- `persistSession: true` e `autoRefreshToken: true` configurados no cliente
- `localStorage` como storage

### 1.3 Guards de Rota
- **Status**: Funcional com ressalva
- `ProtectedRoute` valida: `user` -> `profile` -> `lgpd_consent`
- **MEDIO**: Nao ha guard por permissao nas rotas internas. Qualquer usuario autenticado pode acessar `/report`, `/team-report`, `/team`, `/activities` via URL direta. A sidebar esconde links, mas as rotas estao abertas.

### 1.4 Refresh Token Handling
- **Status**: OK
- `autoRefreshToken: true` no cliente Supabase
- `onAuthStateChange` listener configurado antes de `getSession()`

### 1.5 Problemas Encontrados

| # | Severidade | Problema |
|---|-----------|----------|
| 1 | **CRITICO** | Rotas internas (`/activities`, `/report`, `/team-report`, `/team`) nao verificam permissoes — qualquer usuario autenticado acessa via URL |
| 2 | **MEDIO** | `UserManagement.tsx` faz `fetchUsers()` no `useEffect` com dependencia `[role, fetchUsers]`, mas `fetchUsers` e estavel via `useCallback([], [])` — funciona agora, mas `role` como dependencia causa refetch desnecessario se role mudar |
| 3 | **MEDIO** | `UserManagement` so verifica role no frontend (`role !== 'SUPER_ADMIN' && role !== 'ADMIN'` -> redirect). Edge function valida no backend, mas a pagina carrega antes do redirect |

---

## 2. RBAC (Controle de Acesso)

### 2.1 Onde roles sao definidas?
- Banco: tabela `user_roles` com enum `app_role`
- Frontend: `useAuth` carrega role e mapeia para `UserRole` type
- Edge function: valida role via `user_roles` table com `service_role`

### 2.2 Sincronizacao com RLS
- **PARCIAL**: RLS usa `has_role()` e `has_permission()` SECURITY DEFINER functions
- `has_permission` verifica super_admin bypass + tabela `user_permissions`
- **Problema**: RLS nao e usada para controlar acesso a modulos (diary, reports) — apenas dados

### 2.3 Validacao dupla (frontend + banco)?
- **PARCIAL**: Edge function `admin-users` valida role no backend
- Rotas de dados (projects, activities) validadas via RLS
- **Rotas de UI nao validadas no backend** — so frontend

### 2.4 Problemas Encontrados

| # | Severidade | Problema |
|---|-----------|----------|
| 1 | **CRITICO** | Enum `app_role` ainda contem valores legados (`user`, `oficineiro`) alem dos novos (`usuario`, `analista`). Se existem registros com `user`/`oficineiro` que nao foram migrados, o sistema quebra silenciosamente |
| 2 | **ALTO** | `useAuth` mapeia `'user'` -> `'USUARIO'` e `'oficineiro'` -> `'USUARIO'` para backward compat, mas o `populate_default_permissions` e `handle_new_user` agora usam `'usuario'`. Inconsistencia entre dados legados e novas funcoes |
| 3 | **ALTO** | Sidebar no `AppRoutes.tsx` so esconde "Gestao de Usuarios" para non-admin/super_admin. Nao verifica permissoes granulares (`team_management`, `diary`, etc.) para outros links |
| 4 | **MEDIO** | Dashboard.tsx mostra role badge com apenas 3 opcoes: `Super Admin`, `Admin`, `Usuario` — ignora `Analista` |
| 5 | **MEDIO** | `usePermissions` hook existe mas nao e usado em nenhum componente exceto possivelmente o ProtectedRoute |

---

## 3. BANCO DE DADOS

### 3.1 RLS em todas tabelas?
- **SIM** — Linter retornou 0 issues
- Todas tabelas com RLS habilitado

### 3.2 Policies completas (SELECT/INSERT/UPDATE/DELETE)?
- **activities**: SELECT, INSERT, UPDATE cobertos. DELETE bloqueado (hard delete). Soft delete via UPDATE.
- **projects**: SELECT, INSERT, UPDATE cobertos. DELETE bloqueado.
- **profiles**: SELECT, INSERT, UPDATE cobertos. DELETE bloqueado.
- **team_members**: SELECT, INSERT, UPDATE, DELETE cobertos.
- **team_reports**: SELECT, INSERT, UPDATE cobertos. DELETE bloqueado.
- **audit_logs**: SELECT, INSERT cobertos. UPDATE/DELETE bloqueados (imutavel).
- **user_roles**: SELECT coberto. INSERT/UPDATE/DELETE **bloqueados para usuarios**. So via trigger/edge function.
- **user_permissions**: ALL para super_admin. SELECT para proprio usuario.
- **project_team_members**: SELECT, INSERT, DELETE cobertos. **UPDATE ausente** (nao necessario).
- **project_collaborators**: SELECT + ALL para owner/super_admin.

### 3.3 updated_at trigger?
- **SIM** para: `profiles`, `projects`, `activities`, `team_reports`, `team_members`
- **OK** — todas tabelas com `updated_at` possuem trigger

### 3.4 Foreign Keys?
- `activities.project_id` -> `projects.id` (confirmado em types)
- `project_team_members` — FK aparente mas nao listada explicitamente nas constraints (pode ser via migration)
- `team_members.user_id` — **nullable**, referencia opcional a auth.users
- `user_permissions.user_id` — sem FK explicita para `auth.users` (correto para evitar issues com schema reservado)

### 3.5 Indices faltando?

| # | Severidade | Tabela | Indice Recomendado |
|---|-----------|--------|-------------------|
| 1 | **ALTO** | `activities` | `idx_activities_project_id` em `project_id` — queries filtram por projeto |
| 2 | **ALTO** | `activities` | `idx_activities_user_id` em `user_id` — RLS filtra por usuario |
| 3 | **MEDIO** | `activities` | `idx_activities_deleted_at` em `deleted_at` — partial index WHERE deleted_at IS NULL |
| 4 | **MEDIO** | `projects` | `idx_projects_user_id` em `user_id` |
| 5 | **MEDIO** | `projects` | `idx_projects_deleted_at` em `deleted_at` — partial index |
| 6 | **MEDIO** | `team_reports` | `idx_team_reports_project_id` em `project_id` |
| 7 | **MEDIO** | `user_permissions` | `idx_user_permissions_user_id` em `user_id` |
| 8 | **MEDIO** | `project_collaborators` | `idx_project_collaborators_user_id` em `user_id` |

### 3.6 Multi-tenancy isolado?
- **SIM** — dados isolados por `user_id` + `project_id`
- Admins veem tudo via RLS policies com `has_role(admin/super_admin)`
- Colaboradores veem projetos atribuidos via `is_project_collaborator`

### 3.7 Problemas Encontrados

| # | Severidade | Problema |
|---|-----------|----------|
| 1 | **MEDIO** | `team_reports.team_member_id` e tipo `text` mas deveria ser `uuid` com FK para `team_members.id` |
| 2 | **MEDIO** | `activities` tem FK para `projects` mas nao para `team_members` ou `user_roles` |
| 3 | **BAIXO** | Enum `app_role` tem 6 valores (4 legados + 2 novos) — valores legados deveriam ser removidos apos confirmar migracao completa |

---

## 4. FRONTEND

### 4.1 Hooks globais perigosos?

| # | Severidade | Problema |
|---|-----------|----------|
| 1 | **ALTO** | `AppDataProvider` e renderizado **fora do Router** (em `App.tsx`, `AppDataProvider` envolve `BrowserRouter`). Hooks internos que usam `useAuth` funcionam, mas `useAppData` e chamado em todas as paginas incluindo Login — queries disparam mesmo sem usuario logado (protegido por `enabled: !!user` — OK, mas desnecessario) |
| 2 | **MEDIO** | `useMemo` em `AppDataContext` depende de `[projectsData, activitiesData]` — como esses sao objetos recriados a cada render, o `useMemo` e **ineficaz** e nao previne re-renders |

### 4.2 Componentes com logica condicional?
- Sidebar em `AppRoutes.tsx` usa `role` para mostrar/esconder "Gestao de Usuarios"
- **Nenhuma outra verificacao de permissao** no sidebar
- `UserManagement` faz redirect se role nao e admin
- `TeamManagement` nao faz verificacao de permissao

### 4.3 TanStack Query — queryKeys
- **OK** — keys sao granulares e incluem parametros relevantes
- `['projects', userId, isAdmin, page, pageSize]` — bom
- `['activities', userId, isAdmin, projectId, page, pageSize]` — bom
- `['admin-users']` — simples mas adequado (so 1 consumidor)
- **Ressalva**: `invalidateQueries({ queryKey: ['projects'] })` invalida todas as variantes — correto

### 4.4 Loading States
- **OK** — todos hooks exposem `isLoading`
- Mutations incluem `isPending` no calculo de `isLoading`
- Skeleton fallbacks para lazy-loaded pages

### 4.5 Error Boundaries
| # | Severidade | Problema |
|---|-----------|----------|
| 1 | **ALTO** | **Nenhum Error Boundary** em todo o app. Um erro em qualquer componente derruba toda a aplicacao |

### 4.6 Hardcoded Values

| # | Severidade | Local | Valor |
|---|-----------|-------|-------|
| 1 | **BAIXO** | `Dashboard.tsx:96` | Role badge ignora `ANALISTA` — mostra "Usuario" para analistas |
| 2 | **BAIXO** | `Dashboard.tsx:78` | Calculo de "Dias Restantes" nao considera timezone |
| 3 | **BAIXO** | `DiaryLayout.tsx:126` | `(c) 2026 AnnITech` hardcoded |

---

## 5. TYPES

### 5.1 Types Supabase sincronizados?
- **PARCIAL**: `types.ts` mostra `app_role` com 6 valores (`user`, `admin`, `super_admin`, `oficineiro`, `analista`, `usuario`) — reflete estado do banco (valores legados ainda presentes no enum)
- Frontend `UserRole` type tem 4 valores (`USUARIO`, `ANALISTA`, `ADMIN`, `SUPER_ADMIN`) — correto

### 5.2 Uso de `any`?
- **55 ocorrencias** em 7 arquivos
- Maioria em optimistic updates (`old: any`) e mapeamento de dados (`row: any`, `d: any`)
- `AiNarrativeButton.tsx`: `activities: any[]` e `catch (err: any)` — falta tipagem
- **Nenhum caso de seguranca critica** — mas reduz qualidade do codigo

### 5.3 Inferencia quebrada?
- Nao — tipos Supabase gerados estao consistentes com o schema

---

## 6. SEGURANCA

### 6.1 service_role exposto?
- **NAO** — nenhuma referencia a `service_role` no codigo frontend (`src/`)
- `service_role` so e usado em edge functions via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`

### 6.2 Variaveis de ambiente vazando?
- **NAO** — `.env` so contem `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Publishable/anon key e segura para exposicao no frontend

### 6.3 Policies permissivas demais?

| # | Severidade | Problema |
|---|-----------|----------|
| 1 | **ALTO** | `config.toml`: **TODAS** as 4 edge functions tem `verify_jwt = false`. Isso significa que qualquer pessoa pode chamar `admin-users`, `send-password-reset`, `generate-narrative`, `migrate-base64-photos` sem autenticacao. Embora `admin-users` faca validacao manual de JWT, as outras funcoes podem nao fazer |
| 2 | **ALTO** | `admin-users` edge function: valida JWT manualmente, mas se o header `Authorization` estiver ausente, retorna 401. Porem `generate-narrative` e `migrate-base64-photos` devem ser verificadas — se nao validam JWT, qualquer pessoa pode invocar |
| 3 | **MEDIO** | `team-report-photos` storage bucket e **publico** (`Is Public: Yes`). Qualquer pessoa com o URL pode acessar as fotos |
| 4 | **MEDIO** | Activities RLS: `Admins can view all activities` — admin ve tudo, incluindo de outros admins. Pode ser intencional mas nao ha restricao por organizacao |

### 6.4 Dados sensiveis sem protecao?
- `profiles.email` e `profiles.name` protegidos por RLS (so proprio usuario)
- `team_members.document` (CPF/CNPJ) protegido por RLS do criador
- **Fotos no storage publico** — dado sensivel potencialmente exposto

---

## 7. PERFORMANCE

### 7.1 Queries N+1?

| # | Severidade | Local | Problema |
|---|-----------|-------|----------|
| 1 | **ALTO** | `useProjects.tsx:76-97` | Para usuarios nao-admin: faz 1 query para `projects`, depois 1 query para `project_collaborators`, depois 1 query para projetos colaborados. 3 queries sequenciais em vez de 1 |
| 2 | **MEDIO** | `useTeamMembers.tsx:218-225` | `createAccessForMember`: loop `for...of` com `await` sequencial para cada assignment — N queries para N projetos |
| 3 | **MEDIO** | `admin-users GET`: faz 4 queries sequenciais (listUsers, profiles, roles, permissions) — poderia ser otimizado com joins |

### 7.2 Falta de Index?
- Ver secao 3.5 — **8 indices recomendados**

### 7.3 Realtime desnecessario?
- **NAO** — nenhuma tabela adicionada ao `supabase_realtime`. Nenhum uso de realtime no codigo.

### 7.4 Re-renders excessivos?

| # | Severidade | Local | Problema |
|---|-----------|-------|----------|
| 1 | **MEDIO** | `AppDataContext.tsx:60` | `useMemo` com `[projectsData, activitiesData]` — objetos recriados a cada render, invalidando o memo |
| 2 | **BAIXO** | `AppRoutes.tsx:58` | `useEffect` para fechar sidebar depende de `location.pathname` — dispara em cada navegacao (intencional) |

---

## RESUMO PRIORIZADO

### CRITICOS (corrigir imediatamente)

1. **Rotas sem guard de permissao**: Qualquer usuario autenticado acessa `/activities`, `/report`, `/team-report`, `/team` via URL. Implementar verificacao de `hasPermission` em cada rota.
2. **Enum `app_role` com valores legados**: `user` e `oficineiro` ainda existem no enum. Verificar se ha registros pendentes e limpar.

### ALTOS (corrigir em sprint atual)

3. **Sem Error Boundary**: Qualquer erro JS derruba o app inteiro. Adicionar `ErrorBoundary` global e por secao.
4. **Edge functions sem JWT verification**: `generate-narrative` e `migrate-base64-photos` podem estar acessiveis sem autenticacao.
5. **Indices de banco ausentes**: 8 indices faltando em tabelas com queries frequentes por `user_id`, `project_id`, `deleted_at`.
6. **Sidebar nao usa permissoes**: Links de Diario, Relatorios, Equipes aparecem para todos — devem respeitar `usePermissions`.
7. **Dashboard badge ignora Analista**: Badge mostra "Usuario" para analistas.
8. **Storage bucket publico**: `team-report-photos` acessivel sem autenticacao.

### MEDIOS (proxima iteracao)

9. **`useMemo` ineficaz** em `AppDataContext`
10. **55 usos de `any`** — tipagem fraca em hooks de dados
11. **N+1 queries** em `useProjects` para non-admin
12. **`team_reports.team_member_id` como `text`** em vez de `uuid` com FK
13. **`AppDataProvider` fora do Router** — carrega hooks desnecessariamente em paginas publicas

---

## CORRECOES EXATAS RECOMENDADAS

### 1. Guard de permissao nas rotas (CRITICO)

Criar componente `PermissionGuard`:

```text
<PermissionGuard permission="diary">
  <ActivityManager />
</PermissionGuard>
```

Aplicar em `AppRoutes.tsx` Layout Routes:
- `/activities` -> `diary`
- `/report` -> `report_object`
- `/team-report` -> `report_team`
- `/team` -> `team_management`
- `/users` -> verificacao de role admin

### 2. Error Boundary (ALTO)

Criar `ErrorBoundary` component com fallback UI. Envolver `<Layout>` e cada rota lazy-loaded.

### 3. Sidebar com permissoes (ALTO)

Em `AppRoutes.tsx`, importar `usePermissions` e condicionar cada `SidebarLink`:

```text
{hasPermission('diary') && <SidebarLink to="/activities" ... />}
{hasPermission('report_object') && <SidebarLink to="/report" ... />}
{hasPermission('report_team') && <SidebarLink to="/team-report" ... />}
{hasPermission('team_management') && <SidebarLink to="/team" ... />}
```

### 4. Indices SQL (ALTO)

```text
CREATE INDEX idx_activities_project_id ON activities(project_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_not_deleted ON activities(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_not_deleted ON projects(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_reports_project_id ON team_reports(project_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_project_collaborators_user_id ON project_collaborators(user_id);
```

### 5. Dashboard badge (MEDIO)

Linha 96 de `Dashboard.tsx` — adicionar `ANALISTA`:

```text
{role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin' : role === 'ANALISTA' ? 'Analista' : 'Usuario'}
```

### 6. Limpeza do enum (apos confirmar migracao)

```text
-- Verificar se existem registros legados
SELECT role, count(*) FROM user_roles GROUP BY role;
-- Se nao houver 'user' ou 'oficineiro', remover do enum
```

---

## RISCOS DE REGRESSAO

| Mudanca | Risco | Mitigacao |
|---------|-------|-----------|
| Guard de permissao nas rotas | Usuarios sem permissao podem perder acesso a paginas que usavam | Verificar que todos usuarios ativos tem permissoes corretas antes de deploy |
| Sidebar condicional | Links podem sumir para usuarios que deveriam ter acesso | Testar com cada role: super_admin, admin, analista, usuario |
| Indices SQL | Nenhum risco — indices sao adicionais | N/A |
| Error Boundary | Nenhum risco — adicionam protecao | N/A |
| Limpeza enum | Se existem registros com `user`/`oficineiro`, queries quebram | Verificar dados antes de remover |
