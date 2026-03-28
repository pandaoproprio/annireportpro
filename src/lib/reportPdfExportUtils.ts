import type { Activity } from '@/types';

export type ReportLinkKey = 'attendance' | 'registration' | 'media';

const CORRUPTED_TEXT_PATTERN = /[�ØÃ]/;

const FALLBACK_LINK_LABELS: Record<ReportLinkKey, string> = {
  attendance: 'Clique aqui para ver a Lista de Presença',
  registration: 'Clique aqui para ver a Lista de Inscrição',
  media: 'Clique aqui para abrir a mídia',
};

export const isSoftDeletedActivity = (activity: Activity): boolean => {
  const record = activity as Activity & {
    deleted_at?: string | null;
    deletedAt?: string | null;
    deleted?: boolean;
  };

  return Boolean(record.deleted_at || record.deletedAt || record.deleted);
};

export const getActiveActivities = (activities: Activity[]): Activity[] =>
  activities.filter((activity) => !isSoftDeletedActivity(activity));

export const normalizeLinkTargets = (primary?: string | null, extras: string[] = []): string[] => (
  Array.from(
    new Set(
      [primary ?? '', ...extras]
        .flatMap((value) => typeof value === 'string' ? value.split('\n') : [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value !== '[não informado]'),
    ),
  )
);

export const resolveLinkDisplayName = (
  key: ReportLinkKey,
  custom?: string | null,
  index?: number,
): string => {
  const trimmed = custom?.trim();
  if (trimmed && !CORRUPTED_TEXT_PATTERN.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (key === 'media' && typeof index === 'number') {
    return `Abrir mídia ${index + 1}`;
  }

  return FALLBACK_LINK_LABELS[key];
};

export const hasAttachmentLinks = (links: Record<ReportLinkKey, string[]>): boolean =>
  Object.values(links).some((targets) => targets.length > 0);