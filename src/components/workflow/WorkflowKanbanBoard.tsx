import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { WORKFLOW_STATUS_LABELS } from '@/hooks/useReportWorkflow';
import type { WorkflowStatus } from '@/hooks/useReportWorkflow';
import { ArrowRight, GitBranch, Clock, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const REPORT_TYPE_LABELS: Record<string, string> = {
  report_object: 'Rel. Objeto',
  report_team: 'Rel. Equipe',
  justification: 'Justificativa',
};

const COLUMN_ORDER: WorkflowStatus[] = ['rascunho', 'em_revisao', 'aprovado', 'publicado'];
const COLUMN_COLORS: Record<WorkflowStatus, string> = {
  rascunho: 'border-t-muted-foreground/40',
  em_revisao: 'border-t-warning',
  aprovado: 'border-t-emerald-500',
  publicado: 'border-t-primary',
  devolvido: 'border-t-destructive',
};

export interface WorkflowRow {
  id: string;
  report_id: string;
  report_type: string;
  project_id: string;
  user_id: string;
  status: WorkflowStatus;
  assigned_to: string | null;
  escalation_level: number;
  status_changed_at: string;
  created_at: string;
  notes: string | null;
}

interface Props {
  workflows: WorkflowRow[];
  onReassign?: (workflowId: string) => void;
}

function KanbanCard({ wf, onReassign }: { wf: WorkflowRow; onReassign?: (id: string) => void }) {
  const timeAgo = formatDistanceToNow(new Date(wf.status_changed_at), { addSuffix: true, locale: ptBR });

  return (
    <Card className="hover:ring-1 hover:ring-primary/20 transition-all">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-[10px]">
            {REPORT_TYPE_LABELS[wf.report_type] || wf.report_type}
          </Badge>
          {wf.escalation_level > 0 && (
            <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
              ⚡ {wf.escalation_level}
            </Badge>
          )}
        </div>

        {wf.status === 'devolvido' && wf.notes && (
          <p className="text-[10px] text-destructive bg-destructive/5 rounded px-1.5 py-1 line-clamp-2">
            {wf.notes}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>

        {wf.assigned_to && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <UserCheck className="w-3 h-3" />
            Revisor atribuído
          </div>
        )}

        {onReassign && (wf.status === 'em_revisao' || wf.status === 'aprovado') && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px]"
            onClick={() => onReassign(wf.id)}
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Reatribuir
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkflowKanbanBoard({ workflows, onReassign }: Props) {
  // Group by status, merge devolvido into rascunho column
  const grouped = COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = workflows.filter(w => {
      if (status === 'rascunho') return w.status === 'rascunho' || w.status === 'devolvido';
      return w.status === status;
    });
    return acc;
  }, {} as Record<WorkflowStatus, WorkflowRow[]>);

  return (
    <div className="grid grid-cols-4 gap-3 min-h-[400px]">
      {COLUMN_ORDER.map(status => (
        <div key={status} className={`rounded-lg border border-t-4 ${COLUMN_COLORS[status]} bg-muted/20`}>
          <div className="p-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold">{WORKFLOW_STATUS_LABELS[status]}</span>
              <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
                {grouped[status]?.length || 0}
              </Badge>
            </div>
          </div>
          <ScrollArea className="h-[350px] px-2 pb-2">
            <div className="space-y-2">
              {grouped[status]?.map(wf => (
                <KanbanCard key={wf.id} wf={wf} onReassign={onReassign} />
              ))}
              {(!grouped[status] || grouped[status].length === 0) && (
                <div className="text-center py-8">
                  <GitBranch className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-[10px] text-muted-foreground/50">Vazio</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
