import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, Clock, Award, Download, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { EventRegistration, EventCheckin, GiraEvent, EventCertificate } from '../types';

interface EventDashboardProps {
  event: GiraEvent;
  registrations: EventRegistration[];
  checkins: EventCheckin[];
  certificates: EventCertificate[];
  onGenerateCertificates: () => void;
  isGenerating?: boolean;
  onExportAttendancePdf: () => void;
}

export const EventDashboard: React.FC<EventDashboardProps> = ({
  event,
  registrations,
  checkins,
  certificates,
  onGenerateCertificates,
  isGenerating,
  onExportAttendancePdf,
}) => {
  const checkinMap = useMemo(() => {
    const map = new Map<string, EventCheckin>();
    checkins.forEach(c => map.set(c.registration_id, c));
    return map;
  }, [checkins]);

  const certMap = useMemo(() => {
    const map = new Map<string, EventCertificate>();
    certificates.forEach(c => map.set(c.registration_id, c));
    return map;
  }, [certificates]);

  const attendanceRate = registrations.length > 0
    ? Math.round((checkins.length / registrations.length) * 100)
    : 0;

  const recentCheckins = [...checkins]
    .sort((a, b) => new Date(b.checkin_at).getTime() - new Date(a.checkin_at).getTime())
    .slice(0, 10);

  const checkinLink = `${window.location.origin}/checkin/${event.id}`;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{registrations.length}</p>
                <p className="text-xs text-muted-foreground">Inscritos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[hsl(var(--success))]" />
              <div>
                <p className="text-2xl font-bold text-foreground">{checkins.length}</p>
                <p className="text-xs text-muted-foreground">Check-ins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[hsl(var(--warning))]" />
              <div>
                <p className="text-2xl font-bold text-foreground">{attendanceRate}%</p>
                <p className="text-xs text-muted-foreground">Presença</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{certificates.length}</p>
                <p className="text-xs text-muted-foreground">Certificados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de presença</span>
            <span className="font-medium">{checkins.length} / {registrations.length}</span>
          </div>
          <Progress value={attendanceRate} className="h-3" />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onExportAttendancePdf}>
          <Download className="w-4 h-4 mr-1" /> Lista de Presença (PDF)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateCertificates}
          disabled={isGenerating || checkins.length === 0}
        >
          <Award className="w-4 h-4 mr-1" /> Gerar Certificados
        </Button>
      </div>

      {/* Check-in link */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <QrCode className="w-4 h-4" /> Link de check-in (para organizadores)
          </p>
          <code className="block text-xs bg-muted p-2 rounded break-all">{checkinLink}</code>
          <p className="text-xs text-muted-foreground">
            Cada inscrito recebe um QR Code individual por e-mail com link próprio de check-in.
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      {recentCheckins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline de Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-auto">
              {recentCheckins.map(c => (
                <div key={c.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.signature_type === 'drawing' ? 'Assinatura manuscrita' : 'Aceite digital'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.checkin_at), 'HH:mm:ss', { locale: ptBR })}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      {c.signature_hash.substring(0, 8)}...
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full attendance table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lista Completa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Presença</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Certificado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map(r => {
                  const checkin = checkinMap.get(r.id);
                  const cert = certMap.get(r.id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs">{r.document ?? '—'}</TableCell>
                      <TableCell>
                        {checkin ? (
                          <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                            Presente
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Ausente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {checkin ? format(new Date(checkin.checkin_at), 'HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {checkin ? (
                          <span className="text-muted-foreground">
                            {checkin.signature_type === 'drawing' ? '✍️' : '✅'}
                            {' '}{checkin.signature_hash.substring(0, 8)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {cert ? (
                          <Badge variant="outline" className="text-[10px]">Emitido</Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
