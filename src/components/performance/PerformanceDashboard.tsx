import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, AlertTriangle, XCircle, Users, FileWarning, ShieldAlert } from 'lucide-react';
import { usePerformanceTracking } from '@/hooks/usePerformanceTracking';
import { usePermissions } from '@/hooks/usePermissions';
import { SLA_REPORT_TYPE_LABELS } from '@/types/sla';
import type { WipDraft } from '@/hooks/usePerformanceTracking';
import { PerformanceConfigPanel } from './PerformanceConfigPanel';

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

function formatDraftAge(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ projectId }) => {
  const { summary, isLoading, thresholdHours, config, updateConfig, wipDrafts, wipLimit } = usePerformanceTracking(projectId);
  const { isSuperAdmin } = usePermissions();

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

  const thresholdLabel = formatDraftAge(thresholdHours);

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
      label: `Rascunhos Críticos (>${thresholdLabel})`,
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
      {/* Config Panel - SuperAdmin only */}
      {isSuperAdmin && (
        <PerformanceConfigPanel
          config={config}
          onSave={(values) => updateConfig.mutate(values)}
          isSaving={updateConfig.isPending}
        />
      )}

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

      {/* WIP by Collaborator */}
      <WipByCollaboratorCard wipDrafts={wipDrafts} wipLimit={wipLimit} />

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
            Rascunhos em Risco (&gt;{thresholdLabel})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.stale_drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum rascunho acima do limiar de {thresholdLabel}.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Tempo em Rascunho</TableHead>
                  <TableHead className="text-center">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.stale_drafts
                  .sort((a, b) => (b.hours_in_draft || 0) - (a.hours_in_draft || 0))
                  .map(d => (
                    <TableRow key={`${d.report_type}-${d.report_id}`}>
                      <TableCell className="font-medium">{d.user_name}</TableCell>
                      <TableCell>{SLA_REPORT_TYPE_LABELS[d.report_type]}</TableCell>
                      <TableCell className="text-center">
                        <span className={(d.hours_in_draft || 0) > thresholdHours * 2 ? 'text-destructive font-bold' : 'text-warning font-semibold'}>
                          {formatDraftAge(d.hours_in_draft || d.days_in_draft * 24)}
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

// WIP summary card grouped by collaborator
const WipByCollaboratorCard: React.FC<{ wipDrafts: WipDraft[]; wipLimit: number }> = ({ wipDrafts, wipLimit }) => {
  // Group by user
  const byUser = wipDrafts.reduce<Record<string, { name: string; count: number; drafts: WipDraft[] }>>((acc, d) => {
    if (!acc[d.user_id]) acc[d.user_id] = { name: d.user_name || 'Desconhecido', count: 0, drafts: [] };
    acc[d.user_id].count++;
    acc[d.user_id].drafts.push(d);
    return acc;
  }, {});

  const usersOverLimit = Object.entries(byUser)
    .filter(([, v]) => v.count > wipLimit)
    .sort((a, b) => b[1].count - a[1].count);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          WIP por Colaborador
          {usersOverLimit.length > 0 && (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
              {usersOverLimit.length} acima do limite
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(byUser).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum rascunho ativo no momento.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead className="text-center">Rascunhos</TableHead>
                <TableHead className="text-center">Limite</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byUser)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([userId, { name, count }]) => {
                  const overLimit = count > wipLimit;
                  return (
                    <TableRow key={userId}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="text-center">
                        <span className={overLimit ? 'text-destructive font-bold' : ''}>{count}</span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{wipLimit}</TableCell>
                      <TableCell className="text-center">
                        {overLimit ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            <AlertTriangle className="w-3 h-3" /> Excedido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            <CheckCircle className="w-3 h-3" /> OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
