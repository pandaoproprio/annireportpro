import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, CalendarDays } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Activity } from '@/types';

interface Props {
  activities: Activity[];
  projectEndDate: string;
  projectStartDate: string;
  projectName: string;
}

const PredictiveAnalysisDashboard: React.FC<Props> = ({ activities, projectEndDate, projectStartDate, projectName }) => {
  const analysis = useMemo(() => {
    if (activities.length < 3) return null;

    const now = new Date();
    const endDate = parseISO(projectEndDate);
    const startDate = parseISO(projectStartDate);
    const totalDays = differenceInDays(endDate, startDate);
    const elapsedDays = differenceInDays(now, startDate);
    const remainingDays = differenceInDays(endDate, now);
    const progressPct = Math.min(100, Math.round((elapsedDays / totalDays) * 100));

    // Calculate weekly activity rate
    const weeks = Math.max(1, elapsedDays / 7);
    const weeklyRate = activities.length / weeks;

    // Calculate trend (last 4 weeks vs previous 4 weeks)
    const fourWeeksAgo = addDays(now, -28);
    const eightWeeksAgo = addDays(now, -56);
    const recentActivities = activities.filter(a => new Date(a.date) >= fourWeeksAgo);
    const olderActivities = activities.filter(a => new Date(a.date) >= eightWeeksAgo && new Date(a.date) < fourWeeksAgo);
    const trend = olderActivities.length > 0
      ? ((recentActivities.length - olderActivities.length) / olderActivities.length) * 100
      : 0;

    // Project expected total based on current rate
    const expectedTotal = Math.round(weeklyRate * (totalDays / 7));
    const currentRate = activities.length;

    // Estimated completion pace
    const paceRatio = progressPct > 0 ? (currentRate / (expectedTotal * progressPct / 100)) : 1;
    const estimatedDelay = paceRatio < 0.8 ? Math.round(remainingDays * (1 / paceRatio - 1)) : 0;

    // Build projection line
    const projectionData: { date: string; real: number; projected: number }[] = [];
    const sortedDates = activities.map(a => a.date).sort();

    // Monthly buckets
    const monthMap = new Map<string, number>();
    activities.forEach(a => {
      const key = format(parseISO(a.date), 'yyyy-MM');
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    });

    let cumulative = 0;
    const monthEntries = Array.from(monthMap.entries()).sort();
    monthEntries.forEach(([month, count]) => {
      cumulative += count;
      projectionData.push({ date: month, real: cumulative, projected: 0 });
    });

    // Add projected months
    const monthlyAvg = cumulative / monthEntries.length;
    let projCum = cumulative;
    for (let i = 1; i <= 6; i++) {
      const futureDate = addDays(now, i * 30);
      if (futureDate > endDate) break;
      projCum += monthlyAvg;
      projectionData.push({
        date: format(futureDate, 'yyyy-MM'),
        real: 0,
        projected: Math.round(projCum),
      });
    }

    return {
      weeklyRate: Math.round(weeklyRate * 10) / 10,
      trend: Math.round(trend),
      remainingDays,
      progressPct,
      estimatedDelay,
      paceRatio: Math.round(paceRatio * 100) / 100,
      expectedTotal,
      projectionData,
      status: estimatedDelay > 14 ? 'critical' : estimatedDelay > 0 ? 'warning' : 'on_track',
    };
  }, [activities, projectEndDate, projectStartDate]);

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Mínimo de 3 atividades necessárias para análise preditiva.</p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    on_track: { label: 'No Prazo', color: 'bg-green-100 text-green-700', icon: TrendingUp },
    warning: { label: `Risco: +${analysis.estimatedDelay}d`, color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    critical: { label: `Atraso: +${analysis.estimatedDelay}d`, color: 'bg-red-100 text-red-700', icon: TrendingDown },
  };

  const status = statusConfig[analysis.status];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Análise Preditiva — {projectName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Projeção baseada no ritmo atual de execução</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.color}`}>
                <status.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projeção</p>
                <p className="text-lg font-bold">{status.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dias Restantes</p>
                <p className="text-lg font-bold">{analysis.remainingDays}d</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ritmo Semanal</p>
                <p className="text-lg font-bold">{analysis.weeklyRate} ativ/sem</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${analysis.trend >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {analysis.trend >= 0 ? <TrendingUp className="w-5 h-5 text-green-700" /> : <TrendingDown className="w-5 h-5 text-red-700" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tendência</p>
                <p className="text-lg font-bold">{analysis.trend > 0 ? '+' : ''}{analysis.trend}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Curva de Projeção</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analysis.projectionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="real" name="Realizado" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="projected" name="Projetado" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PredictiveAnalysisDashboard;
