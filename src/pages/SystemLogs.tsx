import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

const ACTION_LABELS: Record<string, string> = {
  user_login: 'Login',
  user_logout: 'Logout',
  user_created: 'Usuário criado',
  user_role_changed: 'Role alterada',
  user_deleted: 'Usuário excluído',
  password_policy_block: 'Bloqueio por senha',
  password_policy_timeout: 'Timeout de senha',
  project_created: 'Projeto criado',
  project_updated: 'Projeto atualizado',
  project_deleted: 'Projeto excluído',
  activity_created: 'Atividade criada',
  activity_updated: 'Atividade atualizada',
  activity_deleted: 'Atividade excluída',
};

const ACTION_COLORS: Record<string, string> = {
  user_login: 'bg-green-500/20 text-green-700',
  user_logout: 'bg-muted text-muted-foreground',
  user_created: 'bg-blue-500/20 text-blue-700',
  user_role_changed: 'bg-amber-500/20 text-amber-700',
  user_deleted: 'bg-destructive/20 text-destructive',
  password_policy_block: 'bg-destructive/20 text-destructive',
};

export const SystemLogs: React.FC = () => {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const canView = role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'ANALISTA';

  const { data: logs, isLoading } = useQuery({
    queryKey: ['system-logs', page, actionFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (searchTerm.trim()) {
        query = query.or(`modified_by_name.ilike.%${searchTerm}%,modified_by_email.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: canView,
  });

  if (!canView) {
    return <Navigate to="/" replace />;
  }



  const uniqueActions = [...new Set(logs?.map(l => l.action) || [])].sort();

  const formatJson = (data: unknown) => {
    if (!data) return null;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <ScrollText className="w-7 h-7 text-primary" />
          Logs do Sistema
        </h1>
        <p className="text-muted-foreground">Acompanhe todas as ações realizadas no sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registros</CardTitle>
          <CardDescription>
            Filtros e busca para encontrar ações específicas
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {ACTION_LABELS[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro encontrado.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead className="hidden md:table-cell">Entidade</TableHead>
                      <TableHead>Usuário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <React.Fragment key={log.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                        >
                          <TableCell className="p-2">
                            {expandedRow === log.id
                              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            }
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${ACTION_COLORS[log.action] || 'bg-secondary text-secondary-foreground'}`}>
                              {ACTION_LABELS[log.action] || log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {log.entity_type}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.modified_by_name || log.modified_by_email || '—'}
                          </TableCell>
                        </TableRow>
                        {expandedRow === log.id && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/30 p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="font-medium mb-1">Detalhes</p>
                                  <p><span className="text-muted-foreground">ID Entidade:</span> {log.entity_id || '—'}</p>
                                  <p><span className="text-muted-foreground">IP:</span> {log.ip_address || '—'}</p>
                                  <p><span className="text-muted-foreground">Modificado por:</span> {log.modified_by_name} ({log.modified_by_email})</p>
                                </div>
                                <div className="space-y-2">
                                  {log.old_data && (
                                    <div>
                                      <p className="font-medium mb-1 text-amber-600">Dados Anteriores</p>
                                      <pre className="bg-card p-2 rounded text-xs overflow-auto max-h-32 border">
                                        {formatJson(log.old_data)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.new_data && (
                                    <div>
                                      <p className="font-medium mb-1 text-green-600">Dados Novos</p>
                                      <pre className="bg-card p-2 rounded text-xs overflow-auto max-h-32 border">
                                        {formatJson(log.new_data)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!logs || logs.length < PAGE_SIZE}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
