/**
 * Business rules for the Diary edit control layer.
 */

const EDIT_WINDOW_HOURS = 24;

/**
 * Returns true if the activity is still within the 24h edit window.
 */
export function isWithinEditWindow(createdAt: string | undefined): boolean {
  if (!createdAt) return true; // fallback: allow edit if no timestamp
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return (now - created) < EDIT_WINDOW_HOURS * 60 * 60 * 1000;
}

/**
 * Returns true if the user can edit the activity.
 * Admin/SuperAdmin can always edit.
 */
export function canEditActivity(
  createdAt: string | undefined,
  isAdmin: boolean,
  isLinkedToReport?: boolean
): { allowed: boolean; reason?: string } {
  if (isLinkedToReport) {
    return { allowed: false, reason: 'Registro vinculado a relatório publicado' };
  }
  if (isAdmin) {
    return { allowed: true };
  }
  if (!isWithinEditWindow(createdAt)) {
    return { allowed: false, reason: 'Prazo de edição expirado (24h)' };
  }
  return { allowed: true };
}

/**
 * Derive a sector label from the user's role.
 */
export function deriveSetor(role: string | null | undefined): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'Administração Geral',
    ADMIN: 'Administração',
    ANALISTA: 'Setor Técnico',
    COORDENADOR: 'Coordenação de Projeto',
    OFICINEIRO: 'Oficinas / Execução',
    USUARIO: 'Equipe Técnica',
  };
  return map[role || ''] || 'Equipe Técnica';
}
