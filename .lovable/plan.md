
# Plano: Reestruturacao RBAC + Correcao de Senha

**STATUS: ✅ IMPLEMENTADO**

---

## Mudanças Realizadas

### Fase 1: Migration SQL ✅
- Enum `app_role` atualizado: adicionados `analista` e `usuario`
- Tabela `user_permissions` criada com RLS
- Função `has_permission()` SECURITY DEFINER criada
- Função `populate_default_permissions()` criada
- Dados migrados: `user` → `usuario`, `oficineiro` → `usuario`
- Permissões populadas para todos os usuários existentes
- Trigger `handle_new_user` atualizado para usar `usuario`

### Fase 2: Edge Function ✅
- `admin-users` atualizada com novos roles
- Admin pode gerenciar usuários (usuario/analista apenas)
- Super Admin mantém controle total
- Endpoint `?action=permissions` para gestão de permissões granulares
- `populate_default_permissions` chamada ao criar/atualizar role

### Fase 3: Frontend Types + Hooks ✅
- `UserRole` atualizado: `USUARIO | ANALISTA | ADMIN | SUPER_ADMIN`
- `useAuth` carrega permissões junto com role
- `usePermissions` hook criado (centralizado)
- `useAdminUsers` tipos atualizados

### Fase 4: UI ✅
- Sidebar: Admin e Super Admin veem Gestão de Usuários
- `UserManagement`: novos roles, Admin restrito a criar usuario/analista
- `useTeamMembers`: criação de acesso usa `usuario` (não `user`)
- Labels de role atualizados em toda a UI
- `ResetPassword`: inline style removido (fix regressão)

### Fase 5: Correção Senha ✅
- Role correta (`usuario`) na criação via TeamManagement
- Permissões default populadas automaticamente
- ProtectedRoute não bloqueia mais por role incorreta

---

## Arquitetura Final

### Roles de Sistema (user_roles)
| Role | Descrição |
|------|-----------|
| super_admin | Acesso total, bypass de permissões |
| admin | Gerencia usuários (usuario/analista), acesso a dashboard/diary/reports |
| analista | Dashboard, Diário, Relatórios |
| usuario | Dashboard (somente leitura) |

### Permissões Granulares (user_permissions)
- `dashboard`, `diary`, `report_object`, `report_team`, `team_management`
- Super Admin pode customizar permissões individualmente
- `has_permission()` verifica no banco (SECURITY DEFINER)

### Roles de Equipe (team_members.function_role)
- Coordenador, Analista, Oficineiro, etc.
- NÃO são roles de sistema — são cargos dentro do projeto
