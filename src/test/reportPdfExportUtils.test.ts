import { describe, expect, it } from 'vitest';
import {
  getActiveActivities,
  normalizeLinkTargets,
  resolveLinkDisplayName,
} from '@/lib/reportPdfExportUtils';
import { ActivityType, type Activity } from '@/types';

const baseActivity: Activity = {
  id: '1',
  projectId: 'project-1',
  date: '2026-03-28',
  location: 'Rio de Janeiro',
  type: ActivityType.OUTROS,
  description: 'Atividade válida',
  results: '',
  challenges: '',
  attendeesCount: 0,
  teamInvolved: [],
  photos: [],
  attachments: [],
};

describe('reportPdfExportUtils', () => {
  it('remove atividades com soft delete antes de compor o PDF', () => {
    const active = baseActivity;
    const deletedSnakeCase = { ...baseActivity, id: '2', deleted_at: '2026-03-27T12:00:00Z' } as Activity;
    const deletedCamelCase = { ...baseActivity, id: '3', deletedAt: '2026-03-27T12:00:00Z' } as Activity;

    expect(getActiveActivities([active, deletedSnakeCase, deletedCamelCase])).toEqual([active]);
  });

  it('normaliza links removendo linhas vazias e placeholders', () => {
    expect(normalizeLinkTargets('https://a.com\n\n[não informado]', ['https://b.com', '   '])).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('troca textos corrompidos por rótulos estáveis de exportação', () => {
    expect(resolveLinkDisplayName('attendance', 'Ø=ÚÅ texto quebrado')).toBe('Clique aqui para ver a Lista de Presença');
    expect(resolveLinkDisplayName('media', undefined, 1)).toBe('Abrir mídia 2');
  });
});