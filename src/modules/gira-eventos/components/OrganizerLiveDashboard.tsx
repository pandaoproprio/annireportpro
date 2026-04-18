import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, CalendarCheck, UserCheck, UserX, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PARTICIPANT_STATE_LABELS, type ParticipantState } from '../types';
import type { ParticipantRow } from '../hooks/useParticipantStates';

interface OrganizerLiveDashboardProps {
  rows: ParticipantRow[];
  counts: { convidados: number; pre_checkins: number; presentes: number; ausentes: number };
  onManualCheckin?: (row: ParticipantRow) => void;
  manualPending?: boolean;
}

const STATE_BADGE: Record<ParticipantState, string> = {
  convidado: 'bg-muted text-muted-foreground',
  pre_checkin: 'bg-accent text-accent-foreground',
  presente: 'bg-primary/15 text-primary border-primary/30',
  ausente: 'bg-destructive/10 text-destructive border-destructive/30',
};

export const OrganizerLiveDashboard: React.FC<OrganizerLiveDashboardProps> = ({
  rows, counts, onManualCheckin, manualPending,
}) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard icon={<Users className="w-4 h-4" />} label="Convidados" value={counts.convidados} />
        <KpiCard icon={<CalendarCheck className="w-4 h-4" />} label="Pré-checkins" value={counts.pre_checkins} />
        <KpiCard icon={<UserCheck className="w-4 h-4" />} label="Presentes" value={counts.presentes} highlight />
        <KpiCard icon={<UserX className="w-4 h-4" />} label="Ausentes" value={counts.ausentes} />
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">Nenhum participante registrado ainda.</CardContent></Card>
        ) : rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                {(row.name || '?')[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{row.name}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  {row.email && <span className="truncate">{row.email}</span>}
                  {row.pre_checkin_at && (
                    <span>· pré-checkin {format(new Date(row.pre_checkin_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                  )}
                  {row.checkin_at && (
                    <span>· checkin {format(new Date(row.checkin_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                  )}
                  {row.distance_meters != null && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" /> {Math.round(row.distance_meters)} m
                    </span>
                  )}
                  {row.is_manual && <Badge variant="outline" className="text-[10px]">manual</Badge>}
                </div>
              </div>
              <Badge className={`shrink-0 text-[11px] ${STATE_BADGE[row.state]}`}>
                {PARTICIPANT_STATE_LABELS[row.state]}
              </Badge>
              {row.state !== 'presente' && onManualCheckin && (
                <Button size="sm" variant="outline" disabled={manualPending} onClick={() => onManualCheckin(row)}>
                  Checkin manual
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: number; highlight?: boolean }> = ({ icon, label, value, highlight }) => (
  <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
    <CardContent className="p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className={`text-2xl font-bold mt-1 ${highlight ? 'text-primary' : ''}`}>{value}</div>
    </CardContent>
  </Card>
);
