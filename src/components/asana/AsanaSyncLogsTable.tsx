import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSyncLogs } from '@/hooks/useAsana';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  syncedProjectId?: string;
  onFilterChange?: (id: string | undefined) => void;
  boardOptions?: { id: string; name: string }[];
}

export const AsanaSyncLogsTable: React.FC<Props> = ({ syncedProjectId, onFilterChange, boardOptions }) => {
  const { data: logs = [], isLoading } = useSyncLogs(syncedProjectId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando logs...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {onFilterChange && boardOptions && boardOptions.length > 0 && (
        <Select value={syncedProjectId || 'all'} onValueChange={v => onFilterChange(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por board" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os boards</SelectItem>
            {boardOptions.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nenhum log de sincronização encontrado.</p>
      ) : (
        <div className="max-h-80 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.direction === 'asana_to_gira' ? 'default' : 'secondary'} className="text-xs">
                      {log.direction === 'asana_to_gira' ? 'Asana → GIRA' : 'GIRA → Asana'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.event_type}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                      {log.status === 'success' ? '✅' : '❌'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-destructive max-w-48 truncate">
                    {log.error_message || '—'}
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
