import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Brain, Loader2, Sparkles, Target, TrendingUp, AlertTriangle, Lightbulb, PlusCircle } from 'lucide-react';
import type { ProjectRisk, RiskFormData } from '@/hooks/useProjectRisks';

interface RiskAiPanelProps {
  risks: ProjectRisk[];
  projectName: string;
  projectObject: string;
  projectSummary?: string;
  onCreateRisk?: (data: RiskFormData) => Promise<boolean | undefined>;
}

interface AnalysisResult {
  overallAssessment: string;
  patterns: string[];
  correlations: Array<{ riskIds: string[]; description: string }>;
  predictions: Array<{ description: string; probability: string; timeframe: string; suggestedAction: string }>;
  recommendations: Array<{ priority: string; title: string; description: string }>;
  riskScoreOverall: string;
}

interface ActionPlanResult {
  actionPlan: Array<{
    riskId: string;
    riskTitle: string;
    preventiveActions: Array<{ action: string; responsible: string; deadline: string; priority: string }>;
    correctiveActions: Array<{ action: string; trigger: string; responsible: string }>;
    milestones: Array<{ date: string; description: string }>;
  }>;
  calendarActions: Array<{ date: string; title: string; type: string; riskTitle: string }>;
  summary: string;
}

interface SuggestedRisksResult {
  suggestedRisks: Array<{
    title: string;
    description: string;
    category: string;
    probability: string;
    impact: string;
    mitigation_plan: string;
    contingency_plan: string;
  }>;
  rationale: string;
}

export const RiskAiPanel: React.FC<RiskAiPanelProps> = ({
  risks, projectName, projectObject, projectSummary, onCreateRisk,
}) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlanResult | null>(null);
  const [suggestedRisks, setSuggestedRisks] = useState<SuggestedRisksResult | null>(null);
  const [loadingMode, setLoadingMode] = useState<string | null>(null);

  const callAi = async (mode: string) => {
    setLoadingMode(mode);
    try {
      const risksData = risks.map(r => ({
        id: r.id, title: r.title, description: r.description,
        category: r.category, probability: r.probability, impact: r.impact,
        status: r.status, mitigation_plan: r.mitigation_plan,
        contingency_plan: r.contingency_plan, responsible: r.responsible,
        due_date: r.due_date,
      }));

      const { data, error } = await supabase.functions.invoke('analyze-risks', {
        body: { mode, risks: risksData, projectName, projectObject, projectSummary },
      });

      if (error) throw error;

      if (mode === 'analyze') {
        setAnalysis(data.result);
        toast.success('Análise de riscos concluída');
      } else if (mode === 'action_plan') {
        setActionPlan(data.result);
        toast.success('Plano de ação gerado');
      } else if (mode === 'suggest_risks') {
        setSuggestedRisks(data.result);
        toast.success('Riscos sugeridos gerados');
      }
    } catch (err: any) {
      console.error('Risk AI error:', err);
      toast.error('Erro na análise. Tente novamente.');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleAdoptRisk = async (risk: SuggestedRisksResult['suggestedRisks'][0]) => {
    if (!onCreateRisk) return;
    const ok = await onCreateRisk({
      title: risk.title,
      description: risk.description,
      category: risk.category,
      probability: risk.probability,
      impact: risk.impact,
      status: 'identificado',
      mitigation_plan: risk.mitigation_plan,
      contingency_plan: risk.contingency_plan,
      responsible: '',
      risk_owner: '',
      linked_goal_id: '',
      monetary_impact: 0,
      due_date: '',
    });
    if (ok) toast.success(`Risco "${risk.title}" adicionado ao registro`);
  };

  const getPriorityColor = (p: string) => {
    if (p === 'alta') return 'text-destructive';
    if (p === 'media') return 'text-orange-500';
    return 'text-muted-foreground';
  };

  const getScoreBadge = (score: string) => {
    const map: Record<string, string> = {
      critico: 'destructive', alto: 'default', medio: 'secondary', baixo: 'outline',
    };
    return (map[score] || 'secondary') as any;
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => callAi('analyze')} disabled={!!loadingMode} className="gap-2">
          {loadingMode === 'analyze' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
          Analisar Riscos Automaticamente
        </Button>
        <Button onClick={() => callAi('action_plan')} disabled={!!loadingMode} variant="secondary" className="gap-2">
          {loadingMode === 'action_plan' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
          Gerar Plano de Ação
        </Button>
        <Button onClick={() => callAi('suggest_risks')} disabled={!!loadingMode} variant="outline" className="gap-2">
          {loadingMode === 'suggest_risks' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
          Sugerir Riscos Potenciais
        </Button>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Análise Inteligente de Riscos
              <Badge variant={getScoreBadge(analysis.riskScoreOverall)} className="ml-auto">
                Risco Geral: {analysis.riskScoreOverall?.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Avaliação Geral</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{analysis.overallAssessment}</p>
            </div>

            {analysis.patterns?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Padrões Identificados
                </h4>
                <ul className="space-y-1">
                  {analysis.patterns.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.predictions?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> Previsões
                </h4>
                <div className="space-y-2">
                  {analysis.predictions.map((p, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{p.timeframe}</Badge>
                        <Badge variant="secondary" className="text-xs">Prob: {p.probability}</Badge>
                      </div>
                      <p className="text-muted-foreground mb-1">{p.description}</p>
                      <p className="text-xs text-primary">💡 {p.suggestedAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.recommendations?.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Recomendações</h4>
                <div className="space-y-2">
                  {analysis.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${getPriorityColor(r.priority)}`} />
                      <div>
                        <span className="font-medium">{r.title}</span>
                        <p className="text-muted-foreground text-xs">{r.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Plan Result */}
      {actionPlan && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Plano de Ação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{actionPlan.summary}</p>

            <Accordion type="multiple" className="w-full">
              {actionPlan.actionPlan?.map((plan, i) => (
                <AccordionItem key={i} value={`plan-${i}`}>
                  <AccordionTrigger className="text-sm font-medium">{plan.riskTitle}</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {plan.preventiveActions?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-primary mb-1">Ações Preventivas</h5>
                        {plan.preventiveActions.map((a, j) => (
                          <div key={j} className="text-xs text-muted-foreground ml-3 mb-1">
                            <span className={`font-medium ${getPriorityColor(a.priority)}`}>•</span>{' '}
                            {a.action} {a.responsible && `(Resp: ${a.responsible})`} {a.deadline && `— ${a.deadline}`}
                          </div>
                        ))}
                      </div>
                    )}
                    {plan.correctiveActions?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-destructive mb-1">Ações Corretivas</h5>
                        {plan.correctiveActions.map((a, j) => (
                          <div key={j} className="text-xs text-muted-foreground ml-3 mb-1">
                            • {a.action} {a.trigger && `(Gatilho: ${a.trigger})`}
                          </div>
                        ))}
                      </div>
                    )}
                    {plan.milestones?.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold mb-1">Marcos</h5>
                        {plan.milestones.map((m, j) => (
                          <div key={j} className="text-xs text-muted-foreground ml-3 mb-1">
                            📅 {m.date} — {m.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Suggested Risks */}
      {suggestedRisks && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Riscos Sugeridos pela IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{suggestedRisks.rationale}</p>
            <div className="space-y-3">
              {suggestedRisks.suggestedRisks?.map((risk, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{risk.title}</span>
                        <Badge variant="outline" className="text-xs">{risk.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{risk.description}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Prob: {risk.probability}</span>
                        <span>Impacto: {risk.impact}</span>
                      </div>
                    </div>
                    {onCreateRisk && (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1" onClick={() => handleAdoptRisk(risk)}>
                        <PlusCircle className="w-3 h-3" /> Adotar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
