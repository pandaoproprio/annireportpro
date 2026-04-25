import React, { useEffect, useMemo, useState } from 'react';
import { useProjectData } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Plus, Trash2, Sparkles, Target, BookOpen, TrendingUp, Save, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/ui/page-transition';

const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// =====================================================================
// SROI
// =====================================================================
interface SroiOutcome {
  id: string;
  description: string;
  proxy_indicator: string | null;
  quantity: number;
  unit_value: number;
  duration_years: number;
  deadweight_pct: number;
  attribution_pct: number;
  drop_off_pct: number;
}
interface SroiAnalysis {
  id: string;
  project_id: string;
  mode: 'simplified' | 'classic';
  proxy_value_per_beneficiary: number;
  beneficiaries_override: number | null;
  total_invested: number;
  total_impact_value: number;
  sroi_ratio: number;
  ai_summary: string | null;
  notes: string | null;
}

const computeOutcomeValue = (o: SroiOutcome): number => {
  // Valor presente simples: soma ano a ano com drop-off, aplica deadweight e atribuição
  let total = 0;
  let yearly = o.quantity * o.unit_value;
  for (let y = 0; y < Math.max(1, o.duration_years); y++) {
    total += yearly;
    yearly = yearly * (1 - o.drop_off_pct / 100);
  }
  total = total * (1 - o.deadweight_pct / 100) * (o.attribution_pct / 100);
  return total;
};

const SroiPanel: React.FC<{ projectId: string; userId: string }> = ({ projectId, userId }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<SroiAnalysis | null>(null);
  const [outcomes, setOutcomes] = useState<SroiOutcome[]>([]);
  const [investedFromBase, setInvestedFromBase] = useState(0);
  const [beneficiariesFromBase, setBeneficiariesFromBase] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    // Buscar despesas executadas
    const { data: exp } = await supabase
      .from('project_expenses')
      .select('amount')
      .eq('project_id', projectId);
    const invested = (exp || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    setInvestedFromBase(invested);

    // Buscar beneficiários (soma attendees_count das atividades publicadas)
    const { data: acts } = await supabase
      .from('activities')
      .select('attendees_count')
      .eq('project_id', projectId)
      .eq('is_draft', false)
      .is('deleted_at', null);
    const ben = (acts || []).reduce((s: number, r: any) => s + (r.attendees_count || 0), 0);
    setBeneficiariesFromBase(ben);

    // Buscar análise existente
    const { data: a } = await supabase
      .from('sroi_analyses')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (a) {
      setAnalysis(a as any);
      const { data: outs } = await supabase
        .from('sroi_outcomes')
        .select('*')
        .eq('analysis_id', a.id)
        .order('created_at');
      setOutcomes((outs as any) || []);
    } else {
      setAnalysis({
        id: '',
        project_id: projectId,
        mode: 'simplified',
        proxy_value_per_beneficiary: 0,
        beneficiaries_override: null,
        total_invested: invested,
        total_impact_value: 0,
        sroi_ratio: 0,
        ai_summary: null,
        notes: null,
      });
      setOutcomes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const totals = useMemo(() => {
    if (!analysis) return { invested: 0, impact: 0, ratio: 0, beneficiaries: 0 };
    const invested = analysis.total_invested || investedFromBase;
    const beneficiaries = analysis.beneficiaries_override ?? beneficiariesFromBase;
    let impact = 0;
    if (analysis.mode === 'simplified') {
      impact = beneficiaries * (analysis.proxy_value_per_beneficiary || 0);
    } else {
      impact = outcomes.reduce((s, o) => s + computeOutcomeValue(o), 0);
    }
    const ratio = invested > 0 ? impact / invested : 0;
    return { invested, impact, ratio, beneficiaries };
  }, [analysis, outcomes, investedFromBase, beneficiariesFromBase]);

  const persist = async () => {
    if (!analysis) return;
    setSaving(true);
    const payload = {
      project_id: projectId,
      user_id: userId,
      mode: analysis.mode,
      proxy_value_per_beneficiary: analysis.proxy_value_per_beneficiary,
      beneficiaries_override: analysis.beneficiaries_override,
      total_invested: totals.invested,
      total_impact_value: totals.impact,
      sroi_ratio: totals.ratio,
      ai_summary: analysis.ai_summary,
      notes: analysis.notes,
    };
    let id = analysis.id;
    if (!id) {
      const { data, error } = await supabase
        .from('sroi_analyses')
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error('Erro ao salvar: ' + error.message);
        setSaving(false);
        return;
      }
      id = (data as any).id;
      setAnalysis((a) => (a ? { ...a, id } : a));
    } else {
      const { error } = await supabase.from('sroi_analyses').update(payload).eq('id', id);
      if (error) {
        toast.error('Erro ao salvar: ' + error.message);
        setSaving(false);
        return;
      }
    }
    // Replace outcomes
    if (analysis.mode === 'classic') {
      await supabase.from('sroi_outcomes').delete().eq('analysis_id', id);
      if (outcomes.length > 0) {
        const toInsert = outcomes.map((o) => ({
          analysis_id: id,
          description: o.description,
          proxy_indicator: o.proxy_indicator,
          quantity: o.quantity,
          unit_value: o.unit_value,
          duration_years: o.duration_years,
          deadweight_pct: o.deadweight_pct,
          attribution_pct: o.attribution_pct,
          drop_off_pct: o.drop_off_pct,
        }));
        await supabase.from('sroi_outcomes').insert(toInsert);
      }
    }
    toast.success('SROI salvo');
    setSaving(false);
  };

  const generateSummary = async () => {
    if (!analysis) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('strategic-tools-ai', {
        body: {
          type: 'sroi',
          projectId,
          payload: {
            mode: analysis.mode,
            totalInvested: totals.invested,
            totalImpactValue: totals.impact,
            sroiRatio: totals.ratio,
            beneficiaries: totals.beneficiaries,
          },
        },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      const summary = (data as any).summary || '';
      setAnalysis((a) => (a ? { ...a, ai_summary: summary } : a));
      toast.success('Síntese gerada');
    } catch (e: any) {
      toast.error('Erro IA: ' + (e.message || 'falha'));
    } finally {
      setGenerating(false);
    }
  };

  const addOutcome = () => {
    setOutcomes((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        description: '',
        proxy_indicator: '',
        quantity: 0,
        unit_value: 0,
        duration_years: 1,
        deadweight_pct: 0,
        attribution_pct: 100,
        drop_off_pct: 0,
      },
    ]);
  };

  const updateOutcome = (id: string, patch: Partial<SroiOutcome>) => {
    setOutcomes((s) => s.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  if (loading || !analysis) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> SROI — Retorno Social do Investimento
              </CardTitle>
              <CardDescription>
                Cruza o investimento financeiro do projeto com o impacto social estimado.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Modo</Label>
              <Select
                value={analysis.mode}
                onValueChange={(v) =>
                  setAnalysis((a) => (a ? { ...a, mode: v as any } : a))
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplified">Simplificado (proxy)</SelectItem>
                  <SelectItem value="classic">Clássico (outcomes)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Investimento (despesas)</div>
              <div className="text-lg font-bold">{formatBRL(totals.invested)}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Soma de project_expenses
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Beneficiários</div>
              <div className="text-lg font-bold">{totals.beneficiaries.toLocaleString('pt-BR')}</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Soma de atendidos em atividades publicadas
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-primary/5">
              <div className="text-xs text-muted-foreground">Razão SROI</div>
              <div className="text-2xl font-bold text-primary">{totals.ratio.toFixed(2)}x</div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Cada R$ 1 → {formatBRL(totals.ratio)}
              </div>
            </div>
          </div>

          {analysis.mode === 'simplified' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Valor proxy por beneficiário (R$)</Label>
                <Input
                  type="number"
                  value={analysis.proxy_value_per_beneficiary}
                  onChange={(e) =>
                    setAnalysis((a) =>
                      a ? { ...a, proxy_value_per_beneficiary: Number(e.target.value) } : a,
                    )
                  }
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Ex.: custo evitado por pessoa atendida em equipamento público equivalente.
                </p>
              </div>
              <div>
                <Label>Beneficiários (sobrescrever)</Label>
                <Input
                  type="number"
                  placeholder={`Padrão: ${beneficiariesFromBase}`}
                  value={analysis.beneficiaries_override ?? ''}
                  onChange={(e) =>
                    setAnalysis((a) =>
                      a
                        ? {
                            ...a,
                            beneficiaries_override: e.target.value === '' ? null : Number(e.target.value),
                          }
                        : a,
                    )
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">Outcomes (resultados sociais)</h4>
                <Button size="sm" variant="outline" onClick={addOutcome}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar outcome
                </Button>
              </div>
              {outcomes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum outcome cadastrado.
                </p>
              )}
              {outcomes.map((o) => {
                const v = computeOutcomeValue(o);
                return (
                  <div key={o.id} className="rounded border p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Descrição do outcome</Label>
                        <Input
                          value={o.description}
                          onChange={(e) => updateOutcome(o.id, { description: e.target.value })}
                          placeholder="Ex.: Redução de evasão escolar"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Indicador proxy</Label>
                        <Input
                          value={o.proxy_indicator || ''}
                          onChange={(e) => updateOutcome(o.id, { proxy_indicator: e.target.value })}
                          placeholder="Ex.: Custo médio anual por aluno"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      <div>
                        <Label className="text-xs">Qtd</Label>
                        <Input
                          type="number"
                          value={o.quantity}
                          onChange={(e) => updateOutcome(o.id, { quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Valor unit. (R$)</Label>
                        <Input
                          type="number"
                          value={o.unit_value}
                          onChange={(e) => updateOutcome(o.id, { unit_value: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duração (anos)</Label>
                        <Input
                          type="number"
                          value={o.duration_years}
                          onChange={(e) =>
                            updateOutcome(o.id, { duration_years: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Deadweight %</Label>
                        <Input
                          type="number"
                          value={o.deadweight_pct}
                          onChange={(e) =>
                            updateOutcome(o.id, { deadweight_pct: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Atribuição %</Label>
                        <Input
                          type="number"
                          value={o.attribution_pct}
                          onChange={(e) =>
                            updateOutcome(o.id, { attribution_pct: Number(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Drop-off % a.a.</Label>
                        <Input
                          type="number"
                          value={o.drop_off_pct}
                          onChange={(e) =>
                            updateOutcome(o.id, { drop_off_pct: Number(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Valor estimado: {formatBRL(v)}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setOutcomes((s) => s.filter((x) => x.id !== o.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button onClick={persist} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={generateSummary} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Gerar síntese (IA)
            </Button>
          </div>

          {analysis.ai_summary && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <FileText className="h-3 w-3" /> Síntese para o relatório
              </div>
              <p className="text-sm whitespace-pre-wrap">{analysis.ai_summary}</p>
            </div>
          )}

          <div>
            <Label className="text-xs">Notas internas</Label>
            <Textarea
              value={analysis.notes || ''}
              onChange={(e) => setAnalysis((a) => (a ? { ...a, notes: e.target.value } : a))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// =====================================================================
// TOWS
// =====================================================================
interface TowsAnalysis {
  id: string;
  project_id: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  so_strategies: string[];
  st_strategies: string[];
  wo_strategies: string[];
  wt_strategies: string[];
}

const QuadrantList: React.FC<{
  title: string;
  color: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}> = ({ title, color, items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <ul className="space-y-1 mb-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="text-muted-foreground">{i + 1}.</span>
            <span className="flex-1">{item}</span>
            <button
              className="text-destructive opacity-60 hover:opacity-100"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="text-xs h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft('');
            }
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft('');
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const TowsPanel: React.FC<{ projectId: string; userId: string }> = ({ projectId, userId }) => {
  const [loading, setLoading] = useState(true);
  const [tows, setTows] = useState<TowsAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tows_analyses')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setTows(data as any);
    } else {
      setTows({
        id: '',
        project_id: projectId,
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        so_strategies: [],
        st_strategies: [],
        wo_strategies: [],
        wt_strategies: [],
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const persist = async () => {
    if (!tows) return;
    setSaving(true);
    const payload = {
      project_id: projectId,
      user_id: userId,
      strengths: tows.strengths,
      weaknesses: tows.weaknesses,
      opportunities: tows.opportunities,
      threats: tows.threats,
      so_strategies: tows.so_strategies,
      st_strategies: tows.st_strategies,
      wo_strategies: tows.wo_strategies,
      wt_strategies: tows.wt_strategies,
    };
    if (!tows.id) {
      const { data, error } = await supabase.from('tows_analyses').insert(payload).select().single();
      if (error) {
        toast.error('Erro: ' + error.message);
        setSaving(false);
        return;
      }
      setTows((t) => (t ? { ...t, id: (data as any).id } : t));
    } else {
      const { error } = await supabase.from('tows_analyses').update(payload).eq('id', tows.id);
      if (error) {
        toast.error('Erro: ' + error.message);
        setSaving(false);
        return;
      }
    }
    toast.success('TOWS salvo');
    setSaving(false);
  };

  const generateStrategies = async () => {
    if (!tows) return;
    if (
      tows.strengths.length === 0 &&
      tows.weaknesses.length === 0 &&
      tows.opportunities.length === 0 &&
      tows.threats.length === 0
    ) {
      toast.error('Preencha ao menos um quadrante antes de gerar estratégias');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('strategic-tools-ai', {
        body: {
          type: 'tows',
          projectId,
          payload: {
            strengths: tows.strengths,
            weaknesses: tows.weaknesses,
            opportunities: tows.opportunities,
            threats: tows.threats,
          },
        },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      setTows((t) =>
        t
          ? {
              ...t,
              so_strategies: (data as any).so || [],
              st_strategies: (data as any).st || [],
              wo_strategies: (data as any).wo || [],
              wt_strategies: (data as any).wt || [],
            }
          : t,
      );
      toast.success('Estratégias geradas — revise antes de salvar');
    } catch (e: any) {
      toast.error('Erro IA: ' + (e.message || 'falha'));
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !tows) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" /> Matriz TOWS
          </CardTitle>
          <CardDescription>
            Mapeie os 4 quadrantes e gere estratégias cruzando-os.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuadrantList
              title="Forças (S)"
              color="bg-green-50 dark:bg-green-950/20"
              items={tows.strengths}
              onChange={(items) => setTows({ ...tows, strengths: items })}
              placeholder="Nova força..."
            />
            <QuadrantList
              title="Fraquezas (W)"
              color="bg-red-50 dark:bg-red-950/20"
              items={tows.weaknesses}
              onChange={(items) => setTows({ ...tows, weaknesses: items })}
              placeholder="Nova fraqueza..."
            />
            <QuadrantList
              title="Oportunidades (O)"
              color="bg-blue-50 dark:bg-blue-950/20"
              items={tows.opportunities}
              onChange={(items) => setTows({ ...tows, opportunities: items })}
              placeholder="Nova oportunidade..."
            />
            <QuadrantList
              title="Ameaças (T)"
              color="bg-yellow-50 dark:bg-yellow-950/20"
              items={tows.threats}
              onChange={(items) => setTows({ ...tows, threats: items })}
              placeholder="Nova ameaça..."
            />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button onClick={persist} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={generateStrategies} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              Gerar estratégias (IA)
            </Button>
          </div>

          {(tows.so_strategies.length > 0 ||
            tows.st_strategies.length > 0 ||
            tows.wo_strategies.length > 0 ||
            tows.wt_strategies.length > 0) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Estratégias geradas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'so', title: 'SO — Ofensivas (Forças × Oportunidades)', items: tows.so_strategies },
                    { key: 'st', title: 'ST — Defesa (Forças × Ameaças)', items: tows.st_strategies },
                    { key: 'wo', title: 'WO — Reforço (Fraquezas × Oportunidades)', items: tows.wo_strategies },
                    { key: 'wt', title: 'WT — Sobrevivência (Fraquezas × Ameaças)', items: tows.wt_strategies },
                  ].map((q) => (
                    <div key={q.key} className="rounded-lg border p-3">
                      <h4 className="font-medium text-sm mb-2">{q.title}</h4>
                      <ul className="space-y-1 list-disc list-inside text-sm">
                        {q.items.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                        {q.items.length === 0 && (
                          <li className="text-muted-foreground list-none">Nenhuma estratégia.</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// =====================================================================
// MSC
// =====================================================================
interface MscStory {
  id: string;
  storyteller_name: string;
  storyteller_role: string | null;
  collected_at: string;
  domain: string | null;
  story: string;
  why_significant: string | null;
  selected_for_report: boolean;
  consent_given: boolean;
}

const emptyStory = (): Omit<MscStory, 'id'> => ({
  storyteller_name: '',
  storyteller_role: 'beneficiario',
  collected_at: new Date().toISOString().slice(0, 10),
  domain: '',
  story: '',
  why_significant: '',
  selected_for_report: false,
  consent_given: false,
});

const MscPanel: React.FC<{ projectId: string; userId: string }> = ({ projectId, userId }) => {
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState<MscStory[]>([]);
  const [draft, setDraft] = useState<Omit<MscStory, 'id'>>(emptyStory());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('msc_stories')
      .select('*')
      .eq('project_id', projectId)
      .order('collected_at', { ascending: false });
    setStories((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const submit = async () => {
    if (!draft.storyteller_name || !draft.story) {
      toast.error('Nome e história são obrigatórios');
      return;
    }
    if (!draft.consent_given) {
      toast.error('Confirme o consentimento da pessoa');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('msc_stories').insert({
      project_id: projectId,
      user_id: userId,
      ...draft,
    });
    if (error) {
      toast.error('Erro: ' + error.message);
      setSaving(false);
      return;
    }
    toast.success('História cadastrada');
    setDraft(emptyStory());
    await load();
    setSaving(false);
  };

  const toggleSelected = async (s: MscStory) => {
    const { error } = await supabase
      .from('msc_stories')
      .update({ selected_for_report: !s.selected_for_report })
      .eq('id', s.id);
    if (error) toast.error('Erro: ' + error.message);
    else {
      setStories((arr) =>
        arr.map((x) => (x.id === s.id ? { ...x, selected_for_report: !s.selected_for_report } : x)),
      );
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Excluir esta história?')) return;
    const { error } = await supabase.from('msc_stories').delete().eq('id', id);
    if (error) toast.error('Erro: ' + error.message);
    else setStories((arr) => arr.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Most Significant Change — Coleta de histórias
          </CardTitle>
          <CardDescription>
            Cadastre histórias coletadas em campo. Marque as que devem alimentar a seção qualitativa do
            relatório.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nome do narrador</Label>
              <Input
                value={draft.storyteller_name}
                onChange={(e) => setDraft({ ...draft, storyteller_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Papel</Label>
              <Select
                value={draft.storyteller_role || ''}
                onValueChange={(v) => setDraft({ ...draft, storyteller_role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beneficiario">Beneficiário(a)</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="equipe">Equipe</SelectItem>
                  <SelectItem value="parceiro">Parceiro</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da coleta</Label>
              <Input
                type="date"
                value={draft.collected_at}
                onChange={(e) => setDraft({ ...draft, collected_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Domínio de mudança</Label>
              <Input
                placeholder="Ex.: educacional, saúde, social, econômico"
                value={draft.domain || ''}
                onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>História</Label>
            <Textarea
              rows={4}
              value={draft.story}
              onChange={(e) => setDraft({ ...draft, story: e.target.value })}
              placeholder="Conte com as palavras da pessoa qual foi a mudança mais significativa que ela percebeu."
            />
          </div>
          <div>
            <Label>Por que é significativa?</Label>
            <Textarea
              rows={2}
              value={draft.why_significant || ''}
              onChange={(e) => setDraft({ ...draft, why_significant: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.consent_given}
              onCheckedChange={(c) => setDraft({ ...draft, consent_given: c })}
            />
            <Label className="text-sm">A pessoa autorizou o uso da história em relatórios</Label>
          </div>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Cadastrar história
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórias coletadas ({stories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <Skeleton className="h-32 w-full" />}
          {!loading && stories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma história ainda.
            </p>
          )}
          <div className="space-y-2">
            {stories.map((s) => (
              <div
                key={s.id}
                className={`rounded border p-3 ${s.selected_for_report ? 'border-primary bg-primary/5' : ''}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{s.storyteller_name}</span>
                      {s.storyteller_role && (
                        <Badge variant="outline" className="text-xs">
                          {s.storyteller_role}
                        </Badge>
                      )}
                      {s.domain && (
                        <Badge variant="secondary" className="text-xs">
                          {s.domain}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{s.collected_at}</span>
                    </div>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{s.story}</p>
                    {s.why_significant && (
                      <p className="text-xs italic text-muted-foreground mt-1">
                        Por quê: {s.why_significant}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={s.selected_for_report}
                        onCheckedChange={() => toggleSelected(s)}
                      />
                      <span className="text-[10px]">Relatório</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// =====================================================================
// PAGE
// =====================================================================
const StrategicToolsPage: React.FC = () => {
  const { activeProject, projects, switchProject, isLoadingProjects } = useProjectData();
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState('sroi');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  if (isLoadingProjects) return <Skeleton className="h-96 m-6" />;

  return (
    <PageTransition>
      <div className="container mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Target className="h-6 w-6 text-primary" />
              Ferramentas Estratégicas
            </h1>
            <p className="text-sm text-muted-foreground">
              SROI, TOWS e Most Significant Change — alinhados ao PMBOK 7 (Foco em Valor, Pensamento
              Sistêmico, Adaptabilidade).
            </p>
          </div>
          <Select value={activeProject?.id || ''} onValueChange={switchProject}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!activeProject || !userId ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Selecione um projeto para usar as ferramentas estratégicas.
            </CardContent>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="sroi">
                <TrendingUp className="h-4 w-4 mr-1" /> SROI
              </TabsTrigger>
              <TabsTrigger value="tows">
                <Target className="h-4 w-4 mr-1" /> TOWS
              </TabsTrigger>
              <TabsTrigger value="msc">
                <BookOpen className="h-4 w-4 mr-1" /> Most Significant Change
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sroi" className="mt-4">
              <SroiPanel projectId={activeProject.id} userId={userId} />
            </TabsContent>
            <TabsContent value="tows" className="mt-4">
              <TowsPanel projectId={activeProject.id} userId={userId} />
            </TabsContent>
            <TabsContent value="msc" className="mt-4">
              <MscPanel projectId={activeProject.id} userId={userId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PageTransition>
  );
};

export default StrategicToolsPage;
