/**
 * Teste de integridade da navegação.
 * Garante que os módulos críticos (GIRA Forms, GIRA Eventos, etc.)
 * estejam sempre registrados na sidebar e nas rotas.
 */
import { describe, it, expect } from 'vitest';
import { sidebarSections, CRITICAL_MODULES } from '@/routes/sidebarConfig';
import { protectedRoutes } from '@/routes/routeConfig';

describe('Navigation integrity guard', () => {
  const allSidebarPaths = sidebarSections.flatMap(s => s.items.map(i => i.to));

  it.each(CRITICAL_MODULES)('sidebar contains critical module: $label ($path)', ({ path }) => {
    expect(allSidebarPaths).toContain(path);
  });

  it.each(CRITICAL_MODULES)('routeConfig contains critical module: $label ($path)', ({ path }) => {
    const routePaths = protectedRoutes.map(r => r.path);
    expect(routePaths).toContain(path);
  });

  it('sidebarConfig has GIRA Forms with correct permission', () => {
    const formsItem = sidebarSections
      .flatMap(s => s.items)
      .find(i => i.to === '/forms');
    expect(formsItem).toBeDefined();
    expect(formsItem?.label).toBe('GIRA Forms');
  });

  it('sidebarConfig has GIRA Eventos with correct permission', () => {
    const eventosItem = sidebarSections
      .flatMap(s => s.items)
      .find(i => i.to === '/eventos');
    expect(eventosItem).toBeDefined();
    expect(eventosItem?.label).toBe('GIRA Eventos');
  });
});
