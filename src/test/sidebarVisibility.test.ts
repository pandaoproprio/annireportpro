import { describe, expect, it } from 'vitest';
import { sidebarSections } from '@/routes/sidebarConfig';
import { shouldShowSidebarItem } from '@/routes/sidebarVisibility';
import type { AppPermission } from '@/hooks/usePermissions';
import type { UserRole } from '@/types';

const allItems = sidebarSections.flatMap((section) => section.items);

const getItem = (path: string) => {
  const item = allItems.find((entry) => entry.to === path);
  if (!item) throw new Error(`Item de sidebar não encontrado: ${path}`);
  return item;
};

const buildContext = (role: UserRole, permissions: AppPermission[] = []) => {
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  return {
    role,
    isAdmin,
    permissions,
    hasPermission: (permission: AppPermission) => isAdmin || permissions.includes(permission),
  };
};

describe('sidebarVisibility', () => {
  it('sempre mostra /forms e /eventos para SUPER_ADMIN', () => {
    const context = buildContext('SUPER_ADMIN');

    expect(shouldShowSidebarItem(getItem('/forms'), context)).toBe(true);
    expect(shouldShowSidebarItem(getItem('/eventos'), context)).toBe(true);
  });

  it('mostra /forms apenas com permissão para usuário comum', () => {
    const context = buildContext('USUARIO', ['forms_view']);

    expect(shouldShowSidebarItem(getItem('/forms'), context)).toBe(true);
    expect(shouldShowSidebarItem(getItem('/eventos'), context)).toBe(false);
  });

  it('esconde módulos críticos sem permissão para usuário comum', () => {
    const context = buildContext('USUARIO');

    expect(shouldShowSidebarItem(getItem('/forms'), context)).toBe(false);
    expect(shouldShowSidebarItem(getItem('/eventos'), context)).toBe(false);
  });
});
