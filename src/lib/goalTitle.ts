// Helper to format meta titles avoiding "META 1: META 1" duplication.
// If goal.title already starts with "META <n>" (case-insensitive), return only goal.title.
// Otherwise, return "META <idx+1>: <goal.title>".
export const formatGoalTitle = (idx: number, title: string | undefined | null): string => {
  const t = (title ?? '').trim();
  if (!t) return `META ${idx + 1}`;
  if (/^meta\s*\d+/i.test(t)) return t;
  return `META ${idx + 1}: ${t}`;
};

/** Extracts only the descriptive part of the goal title (strips leading "META N" / "META N:"). */
export const extractGoalDescription = (title: string | undefined | null): string => {
  const t = (title ?? '').trim();
  return t.replace(/^meta\s*\d+\s*[:\-–]?\s*/i, '').trim();
};

export interface GoalTitleOverride {
  /** Texto descritivo customizado (substitui a descrição original da meta). Undefined = usar original. */
  description?: string;
  /** Se true, oculta a descrição complementar — exibe apenas "REGISTROS FOTOGRÁFICOS – META N". */
  hide?: boolean;
}

/**
 * Builds the "REGISTROS FOTOGRÁFICOS – META N[: <descrição>]" title used in photo galleries.
 * The "REGISTROS FOTOGRÁFICOS – META N" prefix is never removed — only the description is editable/hideable.
 */
export const formatGoalPhotoTitle = (
  idx: number,
  title: string | undefined | null,
  override?: GoalTitleOverride,
): string => {
  const prefix = `REGISTROS FOTOGRÁFICOS – META ${idx + 1}`;
  if (override?.hide) return prefix;
  const desc = override?.description !== undefined
    ? override.description.trim()
    : extractGoalDescription(title);
  return desc ? `${prefix}: ${desc}` : prefix;
};
