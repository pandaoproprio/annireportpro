
# Plano RBAC + Logs — GIRA Relatórios

## Etapa 1 — Corrigir permissões Settings + Sidebar ✅ CONCLUÍDO

### Mudanças realizadas:
- **Settings.tsx**: Excluir Projeto, Excluir em Lote, Lixeira e Armazenamento só visíveis para ADMIN+
- **AppRoutes.tsx**: "Novo Projeto" no seletor só visível para ADMIN+
- USUARIO pode ver e editar projeto vinculado + sair da conta

---

## Etapa 2 — Matriz RBAC Configurável (PRÓXIMA)

### Objetivo
Criar interface na Gestão de Usuários onde SUPER_ADMIN possa visualizar e editar permissões granulares de cada usuário.

### Funcionalidades
1. Na tela de Gestão de Usuários, adicionar aba "Permissões" por usuário
2. Tabela/matriz mostrando: usuário × permissão (dashboard, diary, report_object, report_team, team_management)
3. Checkboxes para toggle individual de permissões
4. SUPER_ADMIN pode editar todas; ADMIN pode ver mas não editar
5. Ao alterar role, permissões padrão são populadas (populate_default_permissions) mas podem ser customizadas depois

### Implementação
- Criar componente `UserPermissionsDialog.tsx`
- Usar endpoint existente `admin-users?action=permissions`
- Tabela `user_permissions` já tem RLS correta para SUPER_ADMIN

---

## Etapa 3 — Módulo de Logs do Sistema

### Objetivo
Criar página dedicada para visualização de logs (`system_logs`) com hierarquia RBAC já implementada no banco.

### Funcionalidades
1. Nova rota `/logs` com link na sidebar (seção Administração)
2. Tabela paginada com colunas: Data/Hora, Ação, Entidade, Usuário (modified_by_name), Detalhes
3. Filtros: por data (range), por ação, por usuário
4. Visibilidade já controlada por RLS hierárquica:
   - SUPER_ADMIN: vê tudo
   - ADMIN: vê próprios + analistas + oficineiros
   - ANALISTA: vê próprios + oficineiros
   - USUARIO: não vê (não aparece link na sidebar)
5. Expandir linha para ver old_data/new_data em JSON formatado

### Implementação
- Criar `src/pages/SystemLogs.tsx`
- Adicionar rota lazy em `AppRoutes.tsx`
- Adicionar link na sidebar condicionado a role ADMIN+
- Query direto na tabela `system_logs` (RLS cuida da filtragem)
