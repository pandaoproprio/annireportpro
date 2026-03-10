import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { useReportWorkflow, WORKFLOW_STATUS_LABELS } from '@/hooks/useReportWorkflow';
import type { WorkflowStatus } from '@/hooks/useReportWorkflow';
import { usePermissions } from '@/hooks/usePermissions';
import { GitBranch, Clock, ArrowRight, MessageSquare, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WorkflowPanelProps {
  reportId: string;
  reportType: 'report_object' | 'report_team' | 'justification';
  projectId: string;
}

const STEP_ORDER: WorkflowStatus[] = ['rascunho', 'em_revisao', 'aprovado', 'publicado'];

export function WorkflowPanel({ reportId, reportType, projectId }: WorkflowPanelProps) {
  const { workflow, history, isLoading, availableTransitions, initWorkflow, transition } = useReportWorkflow(reportId, reportType);
  const { isAdmin } = usePermissions();
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [pendingAction, setPendingAction] = useState<WorkflowStatus | null>(null);

  if (isLoading) return null;

  // No workflow yet — show init button
  if (!workflow) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitBranch className="w-4 h-4" />
            <span>Workflow não iniciado</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => initWorkflow.mutate({ projectId })}
            disabled={initWorkflow.isPending}
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Iniciar Workflow
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleTransition = (newStatus: WorkflowStatus) => {
    if (showNotes && pendingAction === newStatus) {
      transition.mutate({ newStatus, notes: notes || undefined });
      setNotes('');
      setShowNotes(false);
      setPendingAction(null);
    } else {
      setPendingAction(newStatus);
      setShowNotes(true);
    }
  };

  const currentStepIdx = STEP_ORDER.indexOf(workflow.status === 'devolvido' ? 'rascunho' : workflow.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            Workflow
          </CardTitle>
          <WorkflowStatusBadge status={workflow.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress steps */}
        <div className="flex items-center gap-1">
          {STEP_ORDER.map((step, i) => {
            const isActive = i <= currentStepIdx;
            const isCurrent = step === (workflow.status === 'devolvido' ? 'rascunho' : workflow.status);
            return (
              <React.Fragment key={step}>
                <div
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    isActive ? 'bg-primary' : 'bg-muted'
                  } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
                />
                {i < STEP_ORDER.length - 1 && <div className="w-1" />}
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
          {STEP_ORDER.map(s => (
            <span key={s}>{WORKFLOW_STATUS_LABELS[s]}</span>
          ))}
        </div>

        {/* Devolvido warning */}
        {workflow.status === 'devolvido' && workflow.notes && (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
            <p className="font-medium text-destructive text-xs mb-1">Motivo da devolução:</p>
            <p className="text-muted-foreground text-xs">{workflow.notes}</p>
          </div>
        )}

        {/* Notes input for transition */}
        {showNotes && pendingAction && (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                pendingAction === 'devolvido'
                  ? 'Descreva o motivo da devolução...'
                  : 'Observações (opcional)...'
              }
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleTransition(pendingAction)}
                disabled={transition.isPending || (pendingAction === 'devolvido' && !notes.trim())}
              >
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowNotes(false); setPendingAction(null); setNotes(''); }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showNotes && availableTransitions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableTransitions
              .filter(t => !t.requiresRole || isAdmin)
              .map(t => (
                <Button
                  key={t.status}
                  size="sm"
                  variant={t.status === 'devolvido' ? 'destructive' : t.status === 'publicado' ? 'default' : 'outline'}
                  onClick={() => handleTransition(t.status)}
                  disabled={transition.isPending}
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  {t.label}
                </Button>
              ))}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Histórico
              </p>
              <ScrollArea className="max-h-[150px]">
                <div className="space-y-2">
                  {history.map(entry => (
                    <div key={entry.id} className="flex items-start gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {entry.from_status && (
                            <>
                              <span className="text-muted-foreground">{WORKFLOW_STATUS_LABELS[entry.from_status]}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            </>
                          )}
                          <span className="font-medium">{WORKFLOW_STATUS_LABELS[entry.to_status]}</span>
                          <span className="text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-muted-foreground mt-0.5 flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Escalation info */}
        {workflow.escalation_level > 0 && (
          <div className="p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning">
            ⚡ Escalado {workflow.escalation_level}x — item parado há mais de 48h
          </div>
        )}
      </CardContent>
    </Card>
  );
}
