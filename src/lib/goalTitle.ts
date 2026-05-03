// Helper to format meta titles avoiding "META 1: META 1" duplication.
// If goal.title already starts with "META <n>" (case-insensitive), return only goal.title.
// Otherwise, return "META <idx+1>: <goal.title>".
export const formatGoalTitle = (idx: number, title: string | undefined | null): string => {
  const t = (title ?? '').trim();
  if (!t) return `META ${idx + 1}`;
  if (/^meta\s*\d+/i.test(t)) return t;
  return `META ${idx + 1}: ${t}`;
};
