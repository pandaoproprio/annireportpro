import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radar } from 'lucide-react';
import { CATEGORY_LABELS } from '@/hooks/useProjectRisks';

interface Risk {
  category: string;
  status: string;
  probability: string;
  impact: string;
  monetary_impact?: number;
}

interface Props {
  risks: Risk[];
}

const PROB_SCORE: Record<string, number> = {
  muito_baixa: 1, baixa: 2, media: 3, alta: 4, muito_alta: 5,
};
const IMP_SCORE: Record<string, number> = {
  insignificante: 1, menor: 2, moderado: 3, maior: 4, catastrofico: 5,
};

export const RiskRadarChart: React.FC<Props> = ({ risks }) => {
  const activeRisks = useMemo(() => risks.filter(r => r.status !== 'resolvido'), [risks]);

  const categories = useMemo(() => {
    const cats = Object.keys(CATEGORY_LABELS);
    return cats.map(cat => {
      const catRisks = activeRisks.filter(r => r.category === cat);
      const count = catRisks.length;
      const avgScore = count > 0
        ? catRisks.reduce((s, r) => s + (PROB_SCORE[r.probability] || 3) * (IMP_SCORE[r.impact] || 3), 0) / count
        : 0;
      const totalEMV = catRisks.reduce((s, r) => s + (r.monetary_impact || 0), 0);
      return {
        key: cat,
        label: CATEGORY_LABELS[cat],
        count,
        avgScore: Math.round(avgScore * 10) / 10,
        totalEMV,
        // Normalize to 0-100 for radar visualization
        normalized: count > 0 ? Math.min(100, (avgScore / 25) * 100 * Math.log2(count + 1)) : 0,
      };
    });
  }, [activeRisks]);

  const maxNorm = Math.max(...categories.map(c => c.normalized), 1);

  // SVG Radar chart
  const cx = 140, cy = 140, maxR = 110;
  const n = categories.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (index: number, radius: number) => {
    const angle = -Math.PI / 2 + index * angleStep;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const radarPoints = categories.map((c, i) => getPoint(i, (c.normalized / maxNorm) * maxR));
  const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Radar className="w-5 h-5 text-primary" />
          Radar de Riscos por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <svg viewBox="0 0 280 280" className="w-64 h-64 shrink-0">
            {/* Grid */}
            {gridLevels.map(level => (
              <polygon
                key={level}
                points={categories.map((_, i) => {
                  const p = getPoint(i, level * maxR);
                  return `${p.x},${p.y}`;
                }).join(' ')}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                opacity={0.5}
              />
            ))}
            {/* Axes */}
            {categories.map((_, i) => {
              const p = getPoint(i, maxR);
              return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="hsl(var(--border))" strokeWidth="0.5" opacity={0.3} />;
            })}
            {/* Data polygon */}
            <polygon
              points={radarPoints.map(p => `${p.x},${p.y}`).join(' ')}
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
            {/* Data points */}
            {radarPoints.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
            ))}
            {/* Labels */}
            {categories.map((cat, i) => {
              const p = getPoint(i, maxR + 18);
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-[9px] fill-muted-foreground"
                >
                  {cat.label}
                </text>
              );
            })}
          </svg>

          {/* Legend table */}
          <div className="flex-1 w-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 font-medium text-muted-foreground">Categoria</th>
                  <th className="text-center py-1 font-medium text-muted-foreground">Qtd</th>
                  <th className="text-center py-1 font-medium text-muted-foreground">Score Médio</th>
                  <th className="text-right py-1 font-medium text-muted-foreground">EMV Total</th>
                </tr>
              </thead>
              <tbody>
                {categories
                  .filter(c => c.count > 0)
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .map(c => (
                    <tr key={c.key} className="border-b border-border/50">
                      <td className="py-1.5 font-medium">{c.label}</td>
                      <td className="text-center py-1.5">{c.count}</td>
                      <td className="text-center py-1.5">
                        <span className={c.avgScore >= 15 ? 'text-destructive font-bold' : c.avgScore >= 9 ? 'text-orange-500 font-semibold' : ''}>
                          {c.avgScore}
                        </span>
                      </td>
                      <td className="text-right py-1.5 text-muted-foreground">
                        {c.totalEMV > 0 ? `R$ ${c.totalEMV.toLocaleString('pt-BR')}` : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
