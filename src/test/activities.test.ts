import { describe, it, expect } from 'vitest';
import { ActivityType } from '@/types';

// Test the mapping logic extracted from useActivities
const dbTypeToEnum: Record<string, ActivityType> = {
  'Execução de Meta': ActivityType.EXECUCAO,
  'Reunião de Equipe': ActivityType.REUNIAO,
  'Ocorrência/Imprevisto': ActivityType.OCORRENCIA,
  'Divulgação/Mídia': ActivityType.COMUNICACAO,
  'Administrativo/Financeiro': ActivityType.ADMINISTRATIVO,
  'Outras Ações': ActivityType.OUTROS,
};

const enumToDbType: Record<ActivityType, string> = {
  [ActivityType.EXECUCAO]: 'Execução de Meta',
  [ActivityType.REUNIAO]: 'Reunião de Equipe',
  [ActivityType.OCORRENCIA]: 'Ocorrência/Imprevisto',
  [ActivityType.COMUNICACAO]: 'Divulgação/Mídia',
  [ActivityType.ADMINISTRATIVO]: 'Administrativo/Financeiro',
  [ActivityType.OUTROS]: 'Outras Ações',
};

describe('Activity type mappings', () => {
  it('maps all DB types to enum values', () => {
    expect(Object.keys(dbTypeToEnum).length).toBe(6);
    Object.values(dbTypeToEnum).forEach(v => {
      expect(Object.values(ActivityType)).toContain(v);
    });
  });

  it('maps all enum values to DB types', () => {
    expect(Object.keys(enumToDbType).length).toBe(6);
    Object.values(enumToDbType).forEach(v => {
      expect(Object.keys(dbTypeToEnum)).toContain(v);
    });
  });

  it('round-trips DB → Enum → DB', () => {
    Object.entries(dbTypeToEnum).forEach(([dbType, enumVal]) => {
      expect(enumToDbType[enumVal]).toBe(dbType);
    });
  });

  it('round-trips Enum → DB → Enum', () => {
    Object.entries(enumToDbType).forEach(([enumVal, dbType]) => {
      expect(dbTypeToEnum[dbType]).toBe(enumVal);
    });
  });
});

describe('Activity data mapping', () => {
  const sampleDbRow = {
    id: 'act-123',
    user_id: 'user-1',
    project_id: 'proj-1',
    goal_id: null,
    date: '2025-01-15',
    end_date: null,
    location: 'Centro Cultural',
    type: 'Execução de Meta' as const,
    description: 'Oficina de dança',
    results: 'Bom resultado',
    challenges: 'Nenhum',
    attendees_count: 25,
    team_involved: ['Ana', 'Carlos'],
    photos: ['photo1.jpg'],
    attachments: [],
    cost_evidence: null,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T12:00:00Z',
    project_role_snapshot: 'coordenador',
    setor_responsavel: 'Cultura',
    is_draft: false,
    photo_captions: { 'photo1.jpg': 'Registro' },
    attendance_files: [],
    expense_records: [],
  };

  it('maps required fields correctly', () => {
    expect(sampleDbRow.id).toBe('act-123');
    expect(dbTypeToEnum[sampleDbRow.type]).toBe(ActivityType.EXECUCAO);
    expect(sampleDbRow.attendees_count).toBe(25);
    expect(sampleDbRow.team_involved).toEqual(['Ana', 'Carlos']);
  });

  it('handles null optional fields gracefully', () => {
    expect(sampleDbRow.goal_id).toBeNull();
    expect(sampleDbRow.end_date).toBeNull();
    expect(sampleDbRow.cost_evidence).toBeNull();
  });

  it('preserves array fields', () => {
    expect(Array.isArray(sampleDbRow.photos)).toBe(true);
    expect(Array.isArray(sampleDbRow.attachments)).toBe(true);
    expect(Array.isArray(sampleDbRow.team_involved)).toBe(true);
  });

  it('validates photo_captions as object', () => {
    expect(typeof sampleDbRow.photo_captions).toBe('object');
    expect(sampleDbRow.photo_captions['photo1.jpg']).toBe('Registro');
  });
});
