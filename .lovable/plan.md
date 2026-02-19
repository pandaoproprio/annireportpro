
# Plano: Reestruturacao RBAC + Correcao de Senha

---

## PARTE 1: DIAGNOSTICO COMPLETO

### 1.1 Estado Atual do RBAC

O enum `app_role` no banco possui 4 valores: `user`, `admin`, `super_admin`, `oficineiro`.

**Problemas identificados:**

| # | Problema | Impacto |
|---|---------|---------|
| 1 | Roles atuais nao mapeiam para os perfis solicitados (SuperAdmin, Admin, **Analista**, Usuario) | Estrutural |
| 2 | "Analista" nao existe como role — nao ha como controlar acesso granular | Bloqueante |
| 3 | `oficineiro` e role de **sistema** mas deveria ser role de **equipe** (function_role na tabela team_members) | Confusao de dominio |
| 4 | Nao existe conceito de **permissoes customizaveis** por usuario — roles sao fixas | Limitacao |
| 5 | Sidebar mostra/esconde links apenas com `role === 'SUPER_ADMIN'` no frontend | Seguranca fraca |
| 6 | `admin-users` edge function aceita apenas `super_admin` — Admin nao consegue gerenciar nada | Inconsistente com spec |
| 7 | Nao ha RLS diferenciada entre Admin e SuperAdmin — ambos tem mesma policy (`has_role admin OR super_admin`) | Sem gradacao |
| 8 | Nenhuma tabela de **permissoes granulares** existe | Bloqueante para customizacao |

### 1.2 Erro na Criacao de Senha

**Fluxo atual na TeamManagement (Criar Acesso ao Diario):**

1. Frontend chama `createAccessForMember` no hook `useTeamMembers`
2. Hook chama edge function `admin-users` com `POST { email, password, name, role: 'user' }`
3. Edge function usa `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
4. Depois faz `user_roles.update({ role }).eq('user_id', ...)`

**Problemas encontrados:**

| # | Problema | Causa |
|---|---------|-------|
| 1 | Role hardcoded como `'user'` na linha 203 do `useTeamMembers.tsx` | Ignora o `function_role` do membro |
| 2 | Se o trigger `handle_new_user` ja insere role 'user', o `UPDATE` na edge function (linha 234) funciona. Mas se o trigger falhar ou houver delay, a role fica incorreta | Race condition potencial |
| 3 | `createUser` com `email_confirm: true` funciona, mas o usuario **nunca recebe** instrucoes de como acessar o sistema | UX incompleta |
| 4 | Na `UserManagement` (reset de senha), o `updateUser` via `admin.updateUserById` funciona corretamente | OK |
| 5 | Na `ResetPassword.tsx` (self-service), o botao ainda usa `style={{ backgroundColor }}` inline — nao e bug funcional mas e regressao do fix da Semana 1 | Inconsistencia |

**Causa raiz do "erro na criacao de senha":**
- O fluxo de criacao via `admin.createUser` funciona tecnicamente
- O problema provavel e que o usuario criado com `role: 'user'` quando deveria ser `oficineiro` nao consegue acessar o Diario de Bordo porque o `ProtectedRoute` redireciona `OFICINEIRO` para `/diario` mas `USER` fica no layout principal sem projetos visiveis
- Ou seja: **nao e erro de senha, e erro de role incorreta** no momento da criacao

---

## PARTE 2: ARQUITETURA PROPOSTA

### 2.1 Novo Modelo de Roles (Banco de Dados)

**Alterar o enum `app_role`:**

```text
Atual:  user | admin | super_admin | oficineiro
Novo:   usuario | analista | admin | super_admin
```

- `oficineiro` deixa de ser role de sistema e passa a ser apenas `function_role` na tabela `team_members`
- Novo role `analista` substitui o antigo `user` com permissoes expandidas

### 2.2 Nova Tabela de Permissoes Granulares

```text
user_permissions
  id          uuid PK
  user_id     uuid FK -> auth.users
  permission  text (enum ou check constraint)
  granted_by  uuid FK -> auth.users
  created_at  timestamptz
```

Permissoes possiveis:
- `team_management` — acesso a Gestao de Equipes
- `report_object` — acesso ao Relatorio do Objeto
- `report_team` — acesso ao Relatorio da Equipe
- `diary` — acesso ao Diario de Bordo
- `dashboard` — acesso ao Dashboard

**Defaults por role:**

| Role | Permissoes Default |
|------|-------------------|
| super_admin | Todas (bypass total) |
| admin | dashboard, diary, report_object, report_team |
| analista | dashboard, diary, report_object, report_team |
| usuario | dashboard (somente leitura) |

**SuperAdmin pode:**
- Conceder `team_management` a qualquer analista
- Conceder permissoes de analista a qualquer usuario
- Customizar permissoes individualmente

### 2.3 Gestao de Equipes — Roles Internas

Os perfis de equipe (Coordenador, Analista, Oficineiro, etc.) continuam sendo definidos pelo campo `function_role` na tabela `team_members`. Estes NAO sao roles de sistema — sao cargos dentro do projeto.

O acesso ao sistema (login/Diario de Bordo) e controlado pelo `user_roles.role` do usuario vinculado ao membro (`team_members.user_id`).

---

## PARTE 3: PLANO DE IMPLEMENTACAO

### Fase 1: Migracao do Banco (SQL)

1. Adicionar novos valores ao enum `app_role`: `analista`, `usuario`
2. Criar tabela `user_permissions` com RLS
3. Migrar dados existentes:
   - `user` -> `usuario`
   - `oficineiro` -> `usuario` (e manter `function_role` no `team_members`)
4. Remover valor `oficineiro` do enum (apos migracao)
5. Criar funcao `has_permission(_user_id, _permission)` SECURITY DEFINER
6. Atualizar RLS policies para usar `has_permission` onde necessario
7. Criar trigger para popular `user_permissions` com defaults ao criar usuario

### Fase 2: Edge Function `admin-users`

1. Atualizar tipos aceitos: `usuario | analista | admin | super_admin`
2. Ao criar usuario, popular `user_permissions` com defaults da role
3. Adicionar endpoint PATCH para gerenciar permissoes individuais
4. Permitir que `admin` gerencie usuarios dentro do escopo permitido (nao apenas `super_admin`)

### Fase 3: Frontend — Tipos e Auth

1. Atualizar `UserRole` type: `'USUARIO' | 'ANALISTA' | 'ADMIN' | 'SUPER_ADMIN'`
2. Atualizar `useAuth` para carregar permissoes junto com role
3. Criar hook `usePermissions` que expoe: `hasPermission('team_management')`, etc.
4. Atualizar `ProtectedRoute` para usar permissoes ao inves de roles hardcoded

### Fase 4: Frontend — UI

1. Atualizar sidebar para mostrar/esconder links baseado em permissoes
2. Atualizar `UserManagement` com novo seletor de roles e painel de permissoes
3. Atualizar `TeamManagement` — criacao de acesso usa role `usuario` (nao `oficineiro`)
4. Atualizar labels, badges e textos para novos nomes de roles
5. Corrigir botao `ResetPassword.tsx` que ainda usa inline style

### Fase 5: Correcao do Fluxo de Senha

1. Na `TeamManagement`, ao criar acesso: usar role apropriada baseada no contexto
2. Ao criar acesso via Diario, automaticamente conceder permissao `diary`
3. Garantir que `email_confirm: true` funciona e o usuario consegue logar imediatamente
4. Adicionar feedback claro ao admin: "Conta criada. Login: email / Senha: [definida]"

---

## PARTE 4: MAPEAMENTO DE ARQUIVOS AFETADOS

| Arquivo | Mudanca |
|---------|---------|
| `supabase/migrations/` | Novo migration: enum, tabela, funcoes, RLS |
| `supabase/functions/admin-users/index.ts` | Novos roles + permissoes |
| `src/types/index.ts` | `UserRole` atualizado |
| `src/hooks/useAuth.tsx` | Carregar permissoes |
| `src/hooks/usePermissions.tsx` | **NOVO** — hook centralizado |
| `src/components/ProtectedRoute.tsx` | Usar permissoes |
| `src/routes/AppRoutes.tsx` | Sidebar condicional por permissao |
| `src/pages/UserManagement.tsx` | Novos roles + UI de permissoes |
| `src/pages/TeamManagement.tsx` | Role correta na criacao |
| `src/hooks/useAdminUsers.tsx` | Tipos atualizados |
| `src/hooks/useTeamMembers.tsx` | Role na criacao de acesso |
| `src/pages/ResetPassword.tsx` | Fix inline style |
| `src/pages/Dashboard.tsx` | Labels atualizados |
| `src/pages/DiaryLogin.tsx` | Sem mudanca funcional |

---

## PARTE 5: GARANTIAS DE ZERO REGRESSAO

1. **Migracao de dados**: todos os `user` existentes viram `usuario`, todos os `oficineiro` viram `usuario` com permissao `diary`
2. **Backward compat**: `has_role` continua funcionando para roles existentes durante transicao
3. **RLS**: policies existentes continuam validas — novas policies adicionam granularidade
4. **Ordem de execucao**: banco primeiro, depois edge function, depois frontend
5. **Rollback**: enum pode ser revertido adicionando valores antigos de volta
6. **Testes**: validar cada role consegue acessar apenas suas rotas permitidas

---

## PARTE 6: SEQUENCIA DE IMPLEMENTACAO

```text
1. Migration SQL (enum + tabela + funcoes + dados)
2. Deploy edge function atualizada
3. Atualizar types + hooks (useAuth, usePermissions)
4. Atualizar ProtectedRoute + AppRoutes
5. Atualizar UserManagement + TeamManagement
6. Fix ResetPassword inline style
7. Testes end-to-end por role
```

Cada passo pode ser implementado e testado isoladamente antes de prosseguir ao proximo.
