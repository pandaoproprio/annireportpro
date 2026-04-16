import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, Info, TrendingUp, DollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateEMV } from '@/hooks/useProjectRisks';

interface Risk {
  id: string;
  title: string;
  probability: string;
  monetary_impact: number;
  status: string;
  project_name?: string;
}

interface SimulationResult {
  percentiles: { p5: number; p25: number; p50: number; p75: number; p90: number; p95: number };
  mean: number;
  min: number;
  max: number;
  histogram: { binStart: number; binEnd: number; count: number }[];
  worstCaseRisks: { title: string; frequency: number }[];
}

const PROBABILITY_DECIMAL: Record<string, number> = {
  muito_baixa: 0.05, baixa: 0.15, media: 0.35, alta: 0.65, muito_alta: 0.90,
};

function runMonteCarlo(risks: Risk[], iterations: number = 10000): SimulationResult {
  const activeRisks = risks.filter(r => !['resolvido', 'aceito'].includes(r.status) && r.monetary_impact > 0);
  if (activeRisks.length === 0) {
    return {
      percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 },
      mean: 0, min: 0, max: 0, histogram: [], worstCaseRisks: [],
    };
  }

  const results: number[] = new Array(iterations);
  const riskHits = new Map<string, number>();
  activeRisks.forEach(r => riskHits.set(r.title, 0));

  for (let i = 0; i < iterations; i++) {
    let total = 0;
    for (const risk of activeRisks) {
      const prob = PROBABILITY_DECIMAL[risk.probability] || 0.35;
      if (Math.random() < prob) {
        total += risk.monetary_impact;
        riskHits.set(risk.title, (riskHits.get(risk.title) || 0) + 1);
      }
    }
    results[i] = total;
  }

  results.sort((a, b) => a - b);

  const percentile = (p: number) => results[Math.floor(p / 100 * iterations)] || 0;
  const mean = results.reduce((s, v) => s + v, 0) / iterations;
  const min = results[0];
  const max = results[iterations - 1];

  // Build histogram (20 bins)
  const binCount = 20;
  const range = max - min || 1;
  const binSize = range / binCount;
  const histogram: SimulationResult['histogram'] = [];
  for (let b = 0; b < binCount; b++) {
    const binStart = min + b * binSize;
    const binEnd = min + (b + 1) * binSize;
    const count = results.filter(v => v >= binStart && (b === binCount - 1 ? v <= binEnd : v < binEnd)).length;
    histogram.push({ binStart, binEnd, count });
  }

  const worstCaseRisks = Array.from(riskHits.entries())
    .map(([title, count]) => ({ title, frequency: Math.round(count / iterations * 100) }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  return {
    percentiles: {
      p5: percentile(5), p25: percentile(25), p50: percentile(50),
      p75: percentile(75), p90: percentile(90), p95: percentile(95),
    },
    mean, min, max, histogram, worstCaseRisks,
  };
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface Props {
  risks: Risk[];
}

export const MonteCarloSimulation: React.FC<Props> = ({ risks }) => {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const activeRisks = useMemo(
    () => risks.filter(r => !['resolvido', 'aceito'].includes(r.status) && r.monetary_impact > 0),
    [risks]
  );

  const totalEMV = useMemo(
    () => activeRisks.reduce((sum, r) => sum + calculateEMV(r.probability, r.monetary_impact), 0),
    [activeRisks]
  );

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      const res = runMonteCarlo(risks, 10000);
      setResult(res);
      setRunning(false);
    }, 100);
  };

  const maxHistCount = result ? Math.max(...result.histogram.map(h => h.count), 1) : 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Simulação Monte Carlo
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  Executa 10.000 simulações para estimar a distribuição de impacto financeiro
                  total, considerando a probabilidade de cada risco ocorrer simultaneamente.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <Button onClick={handleRun} disabled={running || activeRisks.length === 0} size="sm" className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {result ? 'Reexecutar' : 'Simular'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {activeRisks.length} risco(s) com impacto monetário • EMV determinístico: {fmt(totalEMV)}
        </p>
      </CardHeader>
      <CardContent>
        {activeRisks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum risco ativo com impacto monetário cadastrado.
          </p>
        ) : !result ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Clique em "Simular" para executar 10.000 iterações.
          </p>
        ) : (
          <div className="space-y-5">
            {/* Percentiles */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Percentis de Exposição
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { label: 'P5 (Otimista)', value: result.percentiles.p5, color: 'text-green-600' },
                  { label: 'P25', value: result.percentiles.p25, color: 'text-green-500' },
                  { label: 'P50 (Mediana)', value: result.percentiles.p50, color: 'text-primary' },
                  { label: 'P75', value: result.percentiles.p75, color: 'text-orange-500' },
                  { label: 'P90 (Conservador)', value: result.percentiles.p90, color: 'text-orange-600' },
                  { label: 'P95 (Pessimista)', value: result.percentiles.p95, color: 'text-destructive' },
                ].map(p => (
                  <div key={p.label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <p className={`text-sm font-bold ${p.color}`}>{fmt(p.value)}</p>
                    <p className="text-[10px] text-muted-foreground">{p.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>Média: {fmt(result.mean)}</span>
                <span>Mínimo: {fmt(result.min)}</span>
                <span>Máximo: {fmt(result.max)}</span>
              </div>
            </div>

            {/* Histogram */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Distribuição de Cenários (10.000 simulações)</h4>
              <div className="flex items-end gap-[2px] h-32">
                {result.histogram.map((bin, i) => {
                  const height = (bin.count / maxHistCount) * 100;
                  const isP90 = bin.binStart <= result.percentiles.p90 && bin.binEnd >= result.percentiles.p90;
                  return (
                    <TooltipProvider key={i}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 rounded-t-sm transition-colors ${isP90 ? 'bg-destructive/70' : 'bg-primary/60'} hover:bg-primary/80`}
                            style={{ height: `${Math.max(height, 2)}%` }}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          {fmt(bin.binStart)} ~ {fmt(bin.binEnd)}<br />
                          {bin.count} cenários ({((bin.count / 10000) * 100).toFixed(1)}%)
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>{fmt(result.min)}</span>
                <span>{fmt(result.max)}</span>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-1">📋 Recomendação de Contingência</h4>
              <p className="text-xs text-muted-foreground">
                Com <strong>90% de confiança</strong>, o impacto financeiro total dos riscos ficará abaixo de{' '}
                <strong className="text-primary">{fmt(result.percentiles.p90)}</strong>.
                Recomenda-se provisionar pelo menos este valor como reserva de contingência.
              </p>
            </div>

            {/* Most frequent risks */}
            {result.worstCaseRisks.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Riscos Mais Frequentes nas Simulações</h4>
                <div className="space-y-1.5">
                  {result.worstCaseRisks.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs font-medium w-5 text-muted-foreground">{i + 1}.</span>
                      <span className="text-xs flex-1 truncate">{r.title}</span>
                      <Progress value={r.frequency} className="h-1.5 w-20" />
                      <span className="text-xs text-muted-foreground w-10 text-right">{r.frequency}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
