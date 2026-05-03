import type { AppPermission } from '@/hooks/usePermissions';
import type { SidebarItem } from '@/routes/sidebarConfig';
import type { UserRole } from '@/types';
import { isFormsOnlyHost } from '@/lib/hostMode';

const CRITICAL_MODULE_PERMISSIONS: Record<string, AppPermission> = {
  '/forms': 'forms_view',
  '/eventos': 'events_view',
};

/** Itens permitidos quando rodando no subdomínio Forms-only (forms.giraerp.com.br). */
const FORMS_ONLY_ALLOWED_PATHS = new Set<string>([
  '/forms',
  '/settings',
  '/users',
  '/logs',
]);

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
  // No subdomínio Forms-only, esconder qualquer item fora da whitelist
  if (isFormsOnlyHost() && !FORMS_ONLY_ALLOWED_PATHS.has(item.to)) {
    return false;
  }

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

  // Itens sem permission declarada: visíveis apenas para admin/super_admin.
  // Perfis restritos (oficineiro/voluntario/usuario sem liberação) só veem
  // o que tem permission explícita liberada.
  return context.isAdmin;
};
