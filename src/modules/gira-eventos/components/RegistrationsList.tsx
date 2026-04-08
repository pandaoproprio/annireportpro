import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import type { EventRegistration, EventCheckin } from '../types';

interface RegistrationsListProps {
  registrations: EventRegistration[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
  onShowQr?: (reg: EventRegistration) => void;
  checkins?: EventCheckin[];
}

export const RegistrationsList: React.FC<RegistrationsListProps> = ({
  registrations, onDelete, isLoading, onShowQr, checkins = [],
}) => {
  const checkinMap = new Map<string, EventCheckin>();
  checkins.forEach(c => checkinMap.set(c.registration_id, c));

  const exportCsv = () => {
    const header = 'Nº,Nome,E-mail,Telefone,Documento,Status,Data Inscrição,Check-in\n';
    const rows = registrations.map(r => {
      const ci = checkinMap.get(r.id);
      return `"${r.name}","${r.email ?? ''}","${r.phone ?? ''}","${r.document ?? ''}","${r.status}","${format(new Date(r.registered_at), 'dd/MM/yyyy HH:mm')}","${ci ? 'Sim' : 'Não'}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscricoes_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{registrations.length} inscrição(ões)</p>
        {registrations.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        )}
      </div>
      {registrations.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma inscrição ainda.</p>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Nº</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map(r => {
                const ci = checkinMap.get(r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.registration_number ? String(r.registration_number).padStart(3, '0') : '—'}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.email ?? '—'}</TableCell>
                    <TableCell>{r.phone ?? '—'}</TableCell>
                    <TableCell>{r.document ?? '—'}</TableCell>
                    <TableCell>
                      {ci ? (
                        <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px]">
                          ✓ Check-in
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">Inscrito</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(r.registered_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {onShowQr && r.qr_token && (
                          <Button variant="ghost" size="icon" onClick={() => onShowQr(r)}>
                            <QrCode className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} disabled={isLoading}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
