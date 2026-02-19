
# Plano RBAC + Logs — GIRA Relatórios

## Etapa 1 — Corrigir permissões Settings + Sidebar ✅ CONCLUÍDO

### Mudanças realizadas:
- **Settings.tsx**: Excluir Projeto, Excluir em Lote, Lixeira só visíveis com `project_delete`
- **AppRoutes.tsx**: "Novo Projeto" no seletor só visível com `project_create`
- USUARIO pode ver e editar projeto vinculado + sair da conta

---

## Etapa 2 — Matriz RBAC Granular ✅ CONCLUÍDO

### Mudanças realizadas:
1. Enum `app_permission` expandido com ações CRUD por módulo
2. `populate_default_permissions` atualizado com permissões padrão por role
3. `UserPermissionsDialog` com matriz módulo × ações (Ver/Criar/Editar/Excluir)
4. Sidebar condicional por permissão: `user_management`, `system_logs`, `team_management`
5. Guards em rotas: `/users`, `/team`, `/logs` protegidos por permissão específica

### Permissões granulares disponíveis:
- `dashboard` (ver)
- `diary` + `diary_create`, `diary_edit`, `diary_delete`
- `report_object` + `report_object_create`, `report_object_edit`, `report_object_delete`
- `report_team` + `report_team_create`, `report_team_edit`, `report_team_delete`
- `team_management` + `team_management_create`, `team_management_edit`, `team_management_delete`
- `user_management` + `user_management_create`, `user_management_edit`, `user_management_delete`
- `system_logs` (ver)
- `settings_edit` (editar configurações do projeto)
- `project_create`, `project_delete`

---

## Etapa 3 — Módulo de Logs do Sistema ✅ CONCLUÍDO

### Mudanças realizadas:
- Página `/logs` com tabela paginada, filtros e JSON expandível
- Visibilidade controlada por permissão `system_logs` e RLS hierárquica

---

## Etapa 4 — Aplicar guards CRUD nos módulos (PENDENTE)

### Objetivo
Usar permissões granulares (_create, _edit, _delete) nos botões/ações de cada módulo.

### Implementação pendente:
- TeamManagement: esconder botões Novo/Editar/Excluir baseado em permissões
- ActivityManager: idem
- ReportGenerator/TeamReportGenerator: idem
