import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { WorkflowKanbanBoard } from './WorkflowKanbanBoard';
import { WorkflowThroughputChart } from './WorkflowThroughputChart';
import { ReassignDialog } from './ReassignDialog';
import { WORKFLOW_STATUS_LABELS } from '@/hooks/useReportWorkflow';
import type { WorkflowStatus } from '@/hooks/useReportWorkflow';
import type { WorkflowRow } from './WorkflowKanbanBoard';
import { GitBranch, Clock, Users, TrendingUp, Filter, LayoutGrid, List } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const REPORT_TYPE_LABELS: Record<string, string> = {
  report_object: 'Relatório do Objeto',
  report_team: 'Relatório da Equipe',
  justification: 'Justificativa',
};

export function WorkflowDashboard() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [reassignId, setReassignId] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['all-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_workflows')
        .select('*')
        .order('status_changed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkflowRow[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const filtered = workflows.filter(w => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (typeFilter !== 'all' && w.report_type !== typeFilter) return false;
    return true;
  });

  const statusCounts = workflows.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const escalatedCount = workflows.filter(w => w.escalation_level > 0).length;

  const avgTimeInReview = (() => {
    const inReview = workflows.filter(w => w.status === 'em_revisao');
    if (inReview.length === 0) return null;
    const totalHours = inReview.reduce((sum, w) => {
      return sum + (Date.now() - new Date(w.status_changed_at).getTime()) / (1000 * 60 * 60);
    }, 0);
    return Math.round(totalHours / inReview.length);
  })();

  if (isLoading) return null;

  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['rascunho', 'em_revisao', 'aprovado', 'publicado', 'devolvido'] as WorkflowStatus[]).map(status => (
          <Card key={status} className="cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all" onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
              <p className="text-xs text-muted-foreground">{WORKFLOW_STATUS_LABELS[status]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{workflows.length}</p>
              <p className="text-xs text-muted-foreground">Total Workflows</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-warning" />
            <div>
              <p className="text-lg font-bold">{escalatedCount}</p>
              <p className="text-xs text-muted-foreground">Escalados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold">{avgTimeInReview !== null ? `${avgTimeInReview}h` : '—'}</p>
              <p className="text-xs text-muted-foreground">Tempo médio em revisão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Throughput chart */}
      <WorkflowThroughputChart workflows={workflows} />

      {/* View toggle + filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              {(['rascunho', 'em_revisao', 'aprovado', 'publicado', 'devolvido'] as WorkflowStatus[]).map(s => (
                <SelectItem key={s} value={s}>{WORKFLOW_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {Object.entries(REPORT_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}>
              Limpar filtros
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <Button
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setViewMode('list')}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <WorkflowKanbanBoard workflows={filtered} onReassign={setReassignId} />
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <GitBranch className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum workflow encontrado.</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map(wf => (
                <Card key={wf.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{REPORT_TYPE_LABELS[wf.report_type] || wf.report_type}</span>
                          <WorkflowStatusBadge status={wf.status} />
                          {wf.escalation_level > 0 && (
                            <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
                              ⚡ Nível {wf.escalation_level}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Último status: {formatDistanceToNow(new Date(wf.status_changed_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Reassign dialog */}
      <ReassignDialog
        open={!!reassignId}
        onOpenChange={(open) => !open && setReassignId(null)}
        workflowId={reassignId}
      />
    </div>
  );
}
