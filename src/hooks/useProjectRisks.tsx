import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ProjectRisk {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  status: string;
  mitigation_plan: string;
  contingency_plan: string;
  responsible: string | null;
  risk_owner: string | null;
  linked_goal_id: string | null;
  monetary_impact: number;
  escalated_to: string | null;
  escalated_at: string | null;
  auto_task_created: boolean;
  due_date: string | null;
  resolved_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export type RiskFormData = {
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  status: string;
  mitigation_plan: string;
  contingency_plan: string;
  responsible: string;
  risk_owner: string;
  linked_goal_id: string;
  monetary_impact: number;
  due_date: string;
};

const PROBABILITY_LABELS: Record<string, string> = {
  muito_baixa: 'Muito Baixa',
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  muito_alta: 'Muito Alta',
};

const IMPACT_LABELS: Record<string, string> = {
  insignificante: 'Insignificante',
  menor: 'Menor',
  moderado: 'Moderado',
  maior: 'Maior',
  catastrofico: 'Catastrófico',
};

const STATUS_LABELS: Record<string, string> = {
  identificado: 'Identificado',
  em_analise: 'Em Análise',
  mitigando: 'Mitigando',
  aceito: 'Aceito',
  resolvido: 'Resolvido',
  materializado: 'Materializado',
};

const CATEGORY_LABELS: Record<string, string> = {
  financeiro: 'Financeiro',
  operacional: 'Operacional',
  cronograma: 'Cronograma',
  equipe: 'Equipe',
  externo: 'Externo',
  legal: 'Legal',
  tecnico: 'Técnico',
  outro: 'Outro',
};

const PROBABILITY_SCORE: Record<string, number> = {
  muito_baixa: 1, baixa: 2, media: 3, alta: 4, muito_alta: 5,
};

const IMPACT_SCORE: Record<string, number> = {
  insignificante: 1, menor: 2, moderado: 3, maior: 4, catastrofico: 5,
};

/** Probability as decimal for EMV calculation */
const PROBABILITY_DECIMAL: Record<string, number> = {
  muito_baixa: 0.05, baixa: 0.15, media: 0.35, alta: 0.65, muito_alta: 0.90,
};

export function getRiskLevel(probability: string, impact: string): { level: string; score: number; color: string } {
  const score = (PROBABILITY_SCORE[probability] || 3) * (IMPACT_SCORE[impact] || 3);
  if (score >= 15) return { level: 'Crítico', score, color: 'destructive' };
  if (score >= 9) return { level: 'Alto', score, color: 'warning' };
  if (score >= 4) return { level: 'Médio', score, color: 'default' };
  return { level: 'Baixo', score, color: 'secondary' };
}

/** Expected Monetary Value = probability × monetary_impact */
export function calculateEMV(probability: string, monetaryImpact: number): number {
  const prob = PROBABILITY_DECIMAL[probability] || 0.35;
  return Math.round(prob * monetaryImpact * 100) / 100;
}

export { PROBABILITY_LABELS, IMPACT_LABELS, STATUS_LABELS, CATEGORY_LABELS, PROBABILITY_DECIMAL };

export function useProjectRisks(projectId: string | undefined) {
  const { user } = useAuth();
  const [risks, setRisks] = useState<ProjectRisk[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRisks = useCallback(async () => {
    if (!projectId) { setRisks([]); setIsLoading(false); return; }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('project_risks' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching risks:', error);
      toast.error('Erro ao carregar riscos');
    } else {
      setRisks((data || []) as unknown as ProjectRisk[]);
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => { fetchRisks(); }, [fetchRisks]);

  const createRisk = async (form: RiskFormData) => {
    if (!projectId || !user) return;
    const { error } = await supabase.from('project_risks' as any).insert({
      project_id: projectId,
      user_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      probability: form.probability,
      impact: form.impact,
      status: form.status,
      mitigation_plan: form.mitigation_plan,
      contingency_plan: form.contingency_plan,
      responsible: form.responsible || null,
      risk_owner: form.risk_owner || null,
      linked_goal_id: form.linked_goal_id || null,
      monetary_impact: form.monetary_impact || 0,
      due_date: form.due_date || null,
    } as any);
    if (error) { toast.error('Erro ao criar risco'); console.error(error); return false; }
    toast.success('Risco registrado com sucesso');
    fetchRisks();
    return true;
  };

  const updateRisk = async (id: string, form: Partial<RiskFormData> & { resolved_at?: string | null; escalated_to?: string | null; escalated_at?: string | null; auto_task_created?: boolean }) => {
    const { error } = await supabase.from('project_risks' as any)
      .update(form as any)
      .eq('id', id);
    if (error) { toast.error('Erro ao atualizar risco'); console.error(error); return false; }
    toast.success('Risco atualizado');
    fetchRisks();
    return true;
  };

  const deleteRisk = async (id: string) => {
    const { error } = await supabase.from('project_risks' as any).delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir risco'); console.error(error); return false; }
    toast.success('Risco excluído');
    fetchRisks();
    return true;
  };

  /** Auto-escalate critical risks to a sponsor/PMO */
  const escalateRisk = async (riskId: string, escalatedTo: string) => {
    const { error } = await supabase.from('project_risks' as any)
      .update({ escalated_to: escalatedTo, escalated_at: new Date().toISOString() } as any)
      .eq('id', riskId);
    if (error) { toast.error('Erro ao escalar risco'); return false; }
    toast.success(`Risco escalado para ${escalatedTo}`);
    fetchRisks();
    return true;
  };

  /** Create an activity from a materialized risk */
  const createTaskFromRisk = async (risk: ProjectRisk) => {
    if (!projectId || !user) return false;
    const { error } = await supabase.from('activities').insert([{
      project_id: projectId,
      user_id: user.id,
      description: `[RISCO MATERIALIZADO] ${risk.title}\n\n${risk.contingency_plan || risk.mitigation_plan || risk.description}`,
      date: new Date().toISOString().split('T')[0],
      location: 'Gestão de Riscos',
      type: 'Reunião de Equipe' as const,
      challenges: `Risco materializado: ${risk.title}`,
      results: '',
      is_draft: true,
    }]);
    if (error) { toast.error('Erro ao criar tarefa do risco'); console.error(error); return false; }

    // Mark the risk as having a task created
    await supabase.from('project_risks' as any)
      .update({ auto_task_created: true } as any)
      .eq('id', risk.id);

    toast.success('Tarefa criada no Kanban a partir do risco');
    fetchRisks();
    return true;
  };

  const totalEMV = risks
    .filter(r => !['resolvido', 'aceito'].includes(r.status))
    .reduce((sum, r) => sum + calculateEMV(r.probability, r.monetary_impact || 0), 0);

  const summary = {
    total: risks.length,
    critical: risks.filter(r => getRiskLevel(r.probability, r.impact).level === 'Crítico' && r.status !== 'resolvido').length,
    high: risks.filter(r => getRiskLevel(r.probability, r.impact).level === 'Alto' && r.status !== 'resolvido').length,
    active: risks.filter(r => !['resolvido', 'aceito'].includes(r.status)).length,
    resolved: risks.filter(r => r.status === 'resolvido').length,
    materialized: risks.filter(r => r.status === 'materializado').length,
    totalEMV,
    escalated: risks.filter(r => r.escalated_to && r.status !== 'resolvido').length,
  };

  return { risks, isLoading, createRisk, updateRisk, deleteRisk, escalateRisk, createTaskFromRisk, fetchRisks, summary };
}
