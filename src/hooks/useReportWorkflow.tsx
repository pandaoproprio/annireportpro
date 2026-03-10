import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { createAsanaTaskOnPublish } from '@/lib/asanaAutoTask';

export type WorkflowStatus = 'rascunho' | 'em_revisao' | 'aprovado' | 'publicado' | 'devolvido';

export interface ReportWorkflow {
  id: string;
  report_id: string;
  report_type: string;
  project_id: string;
  user_id: string;
  status: WorkflowStatus;
  assigned_to: string | null;
  escalation_level: number;
  escalated_at: string | null;
  status_changed_at: string;
  status_changed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowHistoryEntry {
  id: string;
  workflow_id: string;
  from_status: WorkflowStatus | null;
  to_status: WorkflowStatus;
  changed_by: string;
  notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em Revisão',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  devolvido: 'Devolvido',
};

const VALID_TRANSITIONS: Record<WorkflowStatus, { status: WorkflowStatus; label: string; requiresRole?: boolean }[]> = {
  rascunho: [{ status: 'em_revisao', label: 'Enviar para Revisão' }],
  em_revisao: [
    { status: 'aprovado', label: 'Aprovar', requiresRole: true },
    { status: 'devolvido', label: 'Devolver', requiresRole: true },
  ],
  devolvido: [{ status: 'em_revisao', label: 'Reenviar para Revisão' }],
  aprovado: [{ status: 'publicado', label: 'Publicar', requiresRole: true }],
  publicado: [{ status: 'rascunho', label: 'Reabrir', requiresRole: true }],
};

export function useReportWorkflow(reportId?: string, reportType?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const workflowQuery = useQuery({
    queryKey: ['report-workflow', reportId, reportType],
    queryFn: async () => {
      if (!reportId || !reportType) return null;
      const { data, error } = await supabase
        .from('report_workflows')
        .select('*')
        .eq('report_id', reportId)
        .eq('report_type', reportType as any)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ReportWorkflow | null;
    },
    enabled: !!reportId && !!reportType && !!user,
  });

  const historyQuery = useQuery({
    queryKey: ['report-workflow-history', workflowQuery.data?.id],
    queryFn: async () => {
      if (!workflowQuery.data?.id) return [];
      const { data, error } = await supabase
        .from('report_workflow_history')
        .select('*')
        .eq('workflow_id', workflowQuery.data.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as WorkflowHistoryEntry[];
    },
    enabled: !!workflowQuery.data?.id,
  });

  const initWorkflow = useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      if (!reportId || !reportType || !user) throw new Error('Missing params');
      const { data, error } = await supabase
        .from('report_workflows')
        .insert({
          report_id: reportId,
          report_type: reportType as any,
          project_id: projectId,
          user_id: user.id,
          status: 'rascunho' as any,
        } as any)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('report_workflow_history').insert({
        workflow_id: (data as any).id,
        to_status: 'rascunho' as any,
        changed_by: user.id,
        notes: 'Workflow iniciado',
      } as any);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-workflow'] });
      toast.success('Workflow iniciado');
    },
  });

  const transition = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: WorkflowStatus; notes?: string }) => {
      if (!workflowQuery.data || !user) throw new Error('No workflow');
      const wf = workflowQuery.data;

      const { data: valid } = await supabase.rpc('validate_workflow_transition', {
        _current_status: wf.status,
        _new_status: newStatus,
        _user_id: user.id,
      });

      if (!valid) throw new Error('Transição inválida ou sem permissão');

      const { error: updateError } = await supabase
        .from('report_workflows')
        .update({
          status: newStatus as any,
          status_changed_at: new Date().toISOString(),
          status_changed_by: user.id,
          notes: notes || null,
        } as any)
        .eq('id', wf.id);

      if (updateError) throw updateError;

      await supabase.from('report_workflow_history').insert({
        workflow_id: wf.id,
        from_status: wf.status as any,
        to_status: newStatus as any,
        changed_by: user.id,
        notes: notes || null,
      } as any);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['report-workflow'] });
      qc.invalidateQueries({ queryKey: ['report-workflow-history'] });
      toast.success(`Status alterado para: ${STATUS_LABELS[vars.newStatus]}`);

      // Asana integration: create task on workflow transitions
      if (workflowQuery.data) {
        const wf = workflowQuery.data;
        const typeLabel = wf.report_type === 'report_object' ? 'Relatório Objeto'
          : wf.report_type === 'report_team' ? 'Relatório Equipe' : 'Justificativa';

        createAsanaTaskOnPublish({
          entityType: wf.report_type === 'report_team' ? 'team_report'
            : wf.report_type === 'justification' ? 'justification' : 'activity',
          entityId: wf.report_id,
          projectId: wf.project_id,
          name: `[Workflow] ${typeLabel} → ${STATUS_LABELS[vars.newStatus]}`,
          notes: vars.notes || `Status alterado de ${STATUS_LABELS[wf.status]} para ${STATUS_LABELS[vars.newStatus]}`,
        });
      }
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar status');
    },
  });

  const workflow = workflowQuery.data;
  const availableTransitions = workflow ? (VALID_TRANSITIONS[workflow.status] || []) : [];

  return {
    workflow,
    history: historyQuery.data || [],
    isLoading: workflowQuery.isLoading,
    availableTransitions,
    initWorkflow,
    transition,
    STATUS_LABELS,
  };
}

export { STATUS_LABELS as WORKFLOW_STATUS_LABELS };
