import type { AppPermission } from '@/hooks/usePermissions';
import type { SidebarItem } from '@/routes/sidebarConfig';
import type { UserRole } from '@/types';

const CRITICAL_MODULE_PERMISSIONS: Record<string, AppPermission> = {
  '/forms': 'forms_view',
  '/eventos': 'events_view',
};

export interface SidebarVisibilityContext {
  role: UserRole;
  isAdmin: boolean;
  permissions: string[];
  hasPermission: (permission: AppPermission) => boolean;
}

export const shouldShowSidebarItem = (
  item: SidebarItem,
  context: SidebarVisibilityContext,
): boolean => {
  if (item.adminOnly && !context.isAdmin) return false;

  const criticalPermission = CRITICAL_MODULE_PERMISSIONS[item.to];

  // Segurança defensiva: módulos críticos sempre visíveis para perfis administrativos
  if (criticalPermission && context.isAdmin) return true;

  if (item.permission) {
    return context.hasPermission(item.permission);
  }

  // Fallback caso alguém remova acidentalmente a permission no config
  if (criticalPermission) {
    return context.hasPermission(criticalPermission);
  }

  return true;
};
