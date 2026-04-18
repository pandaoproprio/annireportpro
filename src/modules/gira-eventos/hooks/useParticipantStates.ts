import { useMemo } from 'react';
import type { ParticipantState } from '../types';

export interface ParticipantRow {
  id: string;                  // registration_id or response_id
  name: string;
  email: string | null;
  identifier: string;          // normalized (email/cpf)
  registered_at: string;
  state: ParticipantState;
  pre_checkin_at: string | null;
  checkin_at: string | null;
  distance_meters: number | null;
  is_manual: boolean;
}

interface BuildParams {
  registrations: Array<{ id: string; name: string; email: string | null; document?: string | null; registered_at: string }>;
  preCheckins: Array<{ registration_id: string | null; response_id: string | null; user_identifier: string; confirmed_at: string }>;
  checkins: Array<{ registration_id: string; checkin_at: string; distance_meters: number | null; is_manual: boolean }>;
  eventEnded: boolean;
}

export function useParticipantStates({ registrations, preCheckins, checkins, eventEnded }: BuildParams) {
  return useMemo(() => {
    const byRegId = new Map<string, ParticipantRow>();

    for (const r of registrations) {
      const identifier = (r.email ?? r.document ?? r.id).trim().toLowerCase();
      byRegId.set(r.id, {
        id: r.id,
        name: r.name,
        email: r.email,
        identifier,
        registered_at: r.registered_at,
        state: 'convidado',
        pre_checkin_at: null,
        checkin_at: null,
        distance_meters: null,
        is_manual: false,
      });
    }

    for (const p of preCheckins) {
      let row: ParticipantRow | undefined;
      if (p.registration_id) row = byRegId.get(p.registration_id);
      if (!row) {
        for (const r of byRegId.values()) {
          if (r.identifier === p.user_identifier.toLowerCase()) { row = r; break; }
        }
      }
      if (row) {
        row.pre_checkin_at = p.confirmed_at;
        if (row.state === 'convidado') row.state = 'pre_checkin';
      }
    }

    for (const c of checkins) {
      const row = byRegId.get(c.registration_id);
      if (row) {
        row.checkin_at = c.checkin_at;
        row.distance_meters = c.distance_meters;
        row.is_manual = c.is_manual;
        row.state = 'presente';
      }
    }

    if (eventEnded) {
      for (const r of byRegId.values()) {
        if (r.state !== 'presente') r.state = 'ausente';
      }
    }

    const rows = Array.from(byRegId.values());

    return {
      rows,
      counts: {
        convidados: rows.length,
        pre_checkins: rows.filter(r => r.pre_checkin_at).length,
        presentes: rows.filter(r => r.state === 'presente').length,
        ausentes: rows.filter(r => r.state === 'ausente').length,
      },
    };
  }, [registrations, preCheckins, checkins, eventEnded]);
}
