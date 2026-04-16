import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, startOfMonth, addMonths, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateEMV } from '@/hooks/useProjectRisks';

interface Risk {
  id: string;
  created_at: string;
  status: string;
  probability: string;
  monetary_impact: number;
  resolved_at?: string | null;
}

interface Props {
  risks: Risk[];
}

interface MonthPoint {
  month: Date;
  label: string;
  created: number;
  resolved: number;
  openAtEnd: number;
  emvAtEnd: number;
}

export const RiskTrendChart: React.FC<Props> = ({ risks }) => {
  const timeline = useMemo(() => {
    if (risks.length === 0) return [];

    const sorted = [...risks].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const firstDate = startOfMonth(new Date(sorted[0].created_at));
    const lastDate = startOfMonth(new Date());
    const months = differenceInMonths(lastDate, firstDate) + 1;

    const points: MonthPoint[] = [];
    let cumulativeOpen = 0;

    for (let i = 0; i < months; i++) {
      const month = addMonths(firstDate, i);
      const monthEnd = addMonths(month, 1);

      const created = risks.filter(r => {
        const d = new Date(r.created_at);
        return d >= month && d < monthEnd;
      }).length;

      const resolved = risks.filter(r => {
        if (!r.resolved_at) return false;
        const d = new Date(r.resolved_at);
        return d >= month && d < monthEnd;
      }).length;

      cumulativeOpen += created - resolved;

      // EMV of all risks open at end of this month
      const emvAtEnd = risks
        .filter(r => {
          const createdAt = new Date(r.created_at);
          if (createdAt >= monthEnd) return false;
          if (r.resolved_at && new Date(r.resolved_at) < monthEnd) return false;
          if (['resolvido', 'aceito'].includes(r.status) && !r.resolved_at) return false;
          return true;
        })
        .reduce((sum, r) => sum + calculateEMV(r.probability, r.monetary_impact || 0), 0);

      points.push({
        month,
        label: format(month, 'MMM/yy', { locale: ptBR }),
        created,
        resolved,
        openAtEnd: Math.max(0, cumulativeOpen),
        emvAtEnd,
      });
    }

    return points;
  }, [risks]);

  if (timeline.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Tendência de Riscos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">Dados insuficientes para gerar tendência.</p>
        </CardContent>
      </Card>
    );
  }

  const maxOpen = Math.max(...timeline.map(t => t.openAtEnd), 1);
  const maxEMV = Math.max(...timeline.map(t => t.emvAtEnd), 1);
  const chartH = 120;
  const chartW = 100; // percentage

  const fmt = (v: number) => `R$ ${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Histórico e Tendência de Riscos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Open Risks Line Chart (SVG) */}
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-0.5 bg-primary rounded" /> Riscos Abertos
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-0.5 bg-destructive/60 rounded" /> EMV (R$)
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-sm bg-green-500/30" /> Resolvidos
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-3 h-3 rounded-sm bg-orange-400/30" /> Novos
            </div>
          </div>

          <svg viewBox={`0 0 ${timeline.length * 50} ${chartH + 40}`} className="w-full h-44" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <line key={pct} x1="0" y1={chartH * (1 - pct)} x2={timeline.length * 50} y2={chartH * (1 - pct)} stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3" />
            ))}

            {/* Bar chart: created and resolved */}
            {timeline.map((t, i) => {
              const x = i * 50 + 10;
              const createdH = (t.created / maxOpen) * chartH * 0.6;
              const resolvedH = (t.resolved / maxOpen) * chartH * 0.6;
              return (
                <g key={`bar-${i}`}>
                  <rect x={x} y={chartH - createdH} width="12" height={createdH} fill="hsl(var(--primary) / 0.25)" rx="1" />
                  <rect x={x + 14} y={chartH - resolvedH} width="12" height={resolvedH} fill="rgb(34 197 94 / 0.3)" rx="1" />
                </g>
              );
            })}

            {/* Line: open risks */}
            <polyline
              points={timeline.map((t, i) => `${i * 50 + 25},${chartH - (t.openAtEnd / maxOpen) * chartH}`).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
            {timeline.map((t, i) => (
              <circle key={`dot-${i}`} cx={i * 50 + 25} cy={chartH - (t.openAtEnd / maxOpen) * chartH} r="3" fill="hsl(var(--primary))" />
            ))}

            {/* Line: EMV */}
            <polyline
              points={timeline.map((t, i) => `${i * 50 + 25},${chartH - (t.emvAtEnd / maxEMV) * chartH * 0.9}`).join(' ')}
              fill="none"
              stroke="hsl(var(--destructive) / 0.6)"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />

            {/* X-axis labels */}
            {timeline.map((t, i) => (
              <text key={`label-${i}`} x={i * 50 + 25} y={chartH + 14} textAnchor="middle" className="text-[8px] fill-muted-foreground">
                {t.label}
              </text>
            ))}

            {/* Y-axis labels */}
            <text x="2" y="10" className="text-[8px] fill-muted-foreground">{maxOpen}</text>
            <text x="2" y={chartH} className="text-[8px] fill-muted-foreground">0</text>
          </svg>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="bg-muted/50 rounded p-2">
            <p className="text-lg font-bold text-primary">{timeline[timeline.length - 1]?.openAtEnd || 0}</p>
            <p className="text-[10px] text-muted-foreground">Abertos Hoje</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-lg font-bold text-green-600">
              {risks.filter(r => r.status === 'resolvido').length}
            </p>
            <p className="text-[10px] text-muted-foreground">Total Resolvidos</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-lg font-bold">
              {timeline.length > 1
                ? (timeline[timeline.length - 1].openAtEnd > timeline[timeline.length - 2].openAtEnd ? '📈' : timeline[timeline.length - 1].openAtEnd < timeline[timeline.length - 2].openAtEnd ? '📉' : '➡️')
                : '—'}
            </p>
            <p className="text-[10px] text-muted-foreground">Tendência</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-lg font-bold text-destructive">{fmt(timeline[timeline.length - 1]?.emvAtEnd || 0)}</p>
            <p className="text-[10px] text-muted-foreground">EMV Atual</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
