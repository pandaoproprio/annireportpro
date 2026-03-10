import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import type { EventRegistration } from '../types';

interface RegistrationsListProps {
  registrations: EventRegistration[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const RegistrationsList: React.FC<RegistrationsListProps> = ({ registrations, onDelete, isLoading }) => {
  const exportCsv = () => {
    const header = 'Nome,E-mail,Telefone,Documento,Status,Data Inscrição\n';
    const rows = registrations.map(r =>
      `"${r.name}","${r.email ?? ''}","${r.phone ?? ''}","${r.document ?? ''}","${r.status}","${format(new Date(r.registered_at), 'dd/MM/yyyy HH:mm')}"`
    ).join('\n');
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
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.email ?? '—'}</TableCell>
                  <TableCell>{r.phone ?? '—'}</TableCell>
                  <TableCell>{r.document ?? '—'}</TableCell>
                  <TableCell>{format(new Date(r.registered_at), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} disabled={isLoading}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
