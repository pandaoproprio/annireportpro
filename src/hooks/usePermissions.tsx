import { useAuth } from '@/hooks/useAuth';

export type AppPermission =
  | 'dashboard'
  | 'diary' | 'diary_create' | 'diary_edit' | 'diary_delete'
  | 'report_object' | 'report_object_create' | 'report_object_edit' | 'report_object_delete'
  | 'report_team' | 'report_team_create' | 'report_team_edit' | 'report_team_delete'
  | 'team_management' | 'team_management_create' | 'team_management_edit' | 'team_management_delete'
  | 'user_management' | 'user_management_create' | 'user_management_edit' | 'user_management_delete'
  | 'system_logs'
  | 'settings_edit'
  | 'project_create' | 'project_delete';

/** Modules shown in the RBAC matrix */
export const RBAC_MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    actions: [] as const, // view-only module
  },
  {
    key: 'diary',
    label: 'Diário de Bordo',
    actions: ['create', 'edit', 'delete'] as const,
  },
  {
    key: 'report_object',
    label: 'Relatório do Objeto',
    actions: ['create', 'edit', 'delete'] as const,
  },
  {
    key: 'report_team',
    label: 'Relatório da Equipe',
    actions: ['create', 'edit', 'delete'] as const,
  },
  {
    key: 'team_management',
    label: 'Gestão de Equipes',
    actions: ['create', 'edit', 'delete'] as const,
  },
  {
    key: 'user_management',
    label: 'Gestão de Usuários',
    actions: ['create', 'edit', 'delete'] as const,
  },
  {
    key: 'system_logs',
    label: 'Logs do Sistema',
    actions: [] as const,
  },
  {
    key: 'settings_edit',
    label: 'Editar Configurações',
    actions: [] as const,
  },
  {
    key: 'project_create',
    label: 'Criar Projetos',
    actions: [] as const,
  },
  {
    key: 'project_delete',
    label: 'Excluir Projetos',
    actions: [] as const,
  },
] as const;

export const usePermissions = () => {
  const { role, permissions } = useAuth();

  const hasPermission = (permission: AppPermission): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    return permissions.includes(permission);
  };

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;

  return {
    hasPermission,
    isSuperAdmin,
    isAdmin,
    permissions,
    role,
  };
};
