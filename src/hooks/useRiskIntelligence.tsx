import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RiskSuggestion {
  id: string;
  project_id: string;
  title: string;
  description: string;
  category: string;
  probability: string;
  impact: string;
  mitigation_plan: string;
  contingency_plan: string;
  source: string;
  source_data: any;
  status: string;
  accepted_risk_id: string | null;
  created_at: string;
}

export interface RiskAlert {
  id: string;
  project_id: string;
  risk_id: string | null;
  alert_type: string;
  title: string;
  description: string;
  severity: string;
  is_read: boolean;
  notified_user_id: string;
  created_at: string;
}

export interface RiskScoreHistory {
  id: string;
  risk_id: string;
  old_score: number;
  new_score: number;
  change_reason: string;
  changed_by: string;
  created_at: string;
}

export interface HealthData {
  health_score: number;
  health_trend: string;
  key_findings: string[];
}

export function useRiskIntelligence(projectId: string | undefined) {
  const [suggestions, setSuggestions] = useState<RiskSuggestion[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [scoreHistory, setScoreHistory] = useState<RiskScoreHistory[]>([]);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const fetchSuggestions = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('risk_suggestions' as any)
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setSuggestions((data || []) as unknown as RiskSuggestion[]);
  }, [projectId]);

  const fetchAlerts = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('risk_alerts' as any)
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);
    const alertsList = (data || []) as unknown as RiskAlert[];
    setAlerts(alertsList);
    setUnreadAlerts(alertsList.filter(a => !a.is_read).length);
  }, [projectId]);

  const fetchScoreHistory = useCallback(async (riskId?: string) => {
    if (!projectId) return;
    let query = supabase
      .from('risk_score_history' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (riskId) {
      query = query.eq('risk_id', riskId);
    }

    const { data } = await query;
    setScoreHistory((data || []) as unknown as RiskScoreHistory[]);
  }, [projectId]);

  useEffect(() => {
    fetchSuggestions();
    fetchAlerts();
  }, [fetchSuggestions, fetchAlerts]);

  const runAutoDetect = async () => {
    if (!projectId) return;
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-project-risks', {
        body: { action: 'auto_detect', project_id: projectId },
      });
      if (error) throw error;
      setHealthData({
        health_score: data.health_score,
        health_trend: data.health_trend,
        key_findings: data.key_findings,
      });
      await fetchSuggestions();
      toast.success(`Varredura concluída: ${data.suggestions?.length || 0} riscos identificados`);
    } catch (err: any) {
      console.error('Auto detect error:', err);
      toast.error('Erro na varredura automática');
    } finally {
      setIsScanning(false);
    }
  };

  const recalculateScores = async () => {
    if (!projectId) return;
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-project-risks', {
        body: { action: 'recalculate_scores', project_id: projectId },
      });
      if (error) throw error;
      await fetchAlerts();
      toast.success(`Scores recalculados: ${data.updated} riscos atualizados`);
    } catch (err: any) {
      console.error('Recalculate error:', err);
      toast.error('Erro ao recalcular scores');
    } finally {
      setIsRecalculating(false);
    }
  };

  const acceptSuggestion = async (suggestion: RiskSuggestion, createRisk: (data: any) => Promise<boolean | undefined>) => {
    const ok = await createRisk({
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      probability: suggestion.probability,
      impact: suggestion.impact,
      status: 'identificado',
      mitigation_plan: suggestion.mitigation_plan,
      contingency_plan: suggestion.contingency_plan,
      responsible: '',
      risk_owner: '',
      linked_goal_id: '',
      monetary_impact: 0,
      due_date: '',
    });
    if (ok) {
      await supabase
        .from('risk_suggestions' as any)
        .update({ status: 'accepted' } as any)
        .eq('id', suggestion.id);
      await fetchSuggestions();
      toast.success(`Risco "${suggestion.title}" adotado`);
    }
  };

  const dismissSuggestion = async (id: string) => {
    await supabase
      .from('risk_suggestions' as any)
      .update({ status: 'dismissed' } as any)
      .eq('id', id);
    await fetchSuggestions();
    toast.info('Sugestão descartada');
  };

  const markAlertRead = async (id: string) => {
    await supabase
      .from('risk_alerts' as any)
      .update({ is_read: true } as any)
      .eq('id', id);
    await fetchAlerts();
  };

  const markAllAlertsRead = async () => {
    if (!projectId) return;
    const unread = alerts.filter(a => !a.is_read);
    for (const a of unread) {
      await supabase
        .from('risk_alerts' as any)
        .update({ is_read: true } as any)
        .eq('id', a.id);
    }
    await fetchAlerts();
  };

  return {
    suggestions,
    alerts,
    scoreHistory,
    healthData,
    isScanning,
    isRecalculating,
    unreadAlerts,
    runAutoDetect,
    recalculateScores,
    acceptSuggestion,
    dismissSuggestion,
    markAlertRead,
    markAllAlertsRead,
    fetchScoreHistory,
  };
}
