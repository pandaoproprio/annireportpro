import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, AlertTriangle, XCircle, Users, FileWarning } from 'lucide-react';
import { usePerformanceTracking } from '@/hooks/usePerformanceTracking';
import { SLA_REPORT_TYPE_LABELS } from '@/types/sla';

interface PerformanceDashboardProps {
  projectId: string | undefined;
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 24);
  const remaining = Math.round(hours % 24);
  return remaining > 0 ? `${days}d ${remaining}h` : `${days}d`;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ projectId }) => {
  const { summary, isLoading } = usePerformanceTracking(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  const cards = [
    {
      label: 'Tempo Médio de Publicação',
      value: summary.avg_lead_time_hours > 0 ? formatHours(summary.avg_lead_time_hours) : '—',
      icon: Clock,
      color: 'text-info',
    },
    {
      label: '% No Prazo',
      value: summary.collaborator_ranking.length > 0 ? `${Math.round(100 - (summary.overdue_count / Math.max(1, summary.collaborator_ranking.reduce((a, r) => a + r.published_count, 0)) * 100))}%` : '—',
      icon: CheckCircle,
      color: 'text-success',
    },
    {
      label: 'Rascunhos Críticos (>7d)',
      value: summary.critical_drafts_count,
      icon: AlertTriangle,
      color: summary.critical_drafts_count > 0 ? 'text-warning' : 'text-muted-foreground',
    },
    {
      label: 'Total Atrasados',
      value: summary.overdue_count,
      icon: XCircle,
      color: summary.overdue_count > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                </div>
                <card.icon className={`w-8 h-8 ${card.color} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Collaborator Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Ranking por Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.collaborator_ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum relatório publicado ainda neste projeto.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-center">Publicados</TableHead>
                  <TableHead className="text-center">Tempo Médio</TableHead>
                  <TableHead className="text-center">Reaberturas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.collaborator_ranking
                  .sort((a, b) => b.published_count - a.published_count)
                  .map(r => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-center">{r.published_count}</TableCell>
                      <TableCell className="text-center">{formatHours(r.avg_lead_time_hours)}</TableCell>
                      <TableCell className="text-center">{r.reopen_total}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stale Drafts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="w-5 h-5" />
            Rascunhos em Risco (&gt;7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.stale_drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum rascunho com mais de 7 dias.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Dias em Rascunho</TableHead>
                  <TableHead className="text-center">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.stale_drafts
                  .sort((a, b) => b.days_in_draft - a.days_in_draft)
                  .map(d => (
                    <TableRow key={`${d.report_type}-${d.report_id}`}>
                      <TableCell className="font-medium">{d.user_name}</TableCell>
                      <TableCell>{SLA_REPORT_TYPE_LABELS[d.report_type]}</TableCell>
                      <TableCell className="text-center">
                        <span className={d.days_in_draft > 14 ? 'text-destructive font-bold' : 'text-warning font-semibold'}>
                          {d.days_in_draft}d
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {new Date(d.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
