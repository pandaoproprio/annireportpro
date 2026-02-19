import { useAuth } from '@/hooks/useAuth';

export type AppPermission = 'dashboard' | 'diary' | 'report_object' | 'report_team' | 'team_management';

export const usePermissions = () => {
  const { role, permissions } = useAuth();

  const hasPermission = (permission: AppPermission): boolean => {
    // Super admin bypasses all checks
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
