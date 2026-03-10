import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { WorkflowRow } from './WorkflowKanbanBoard';
import { TrendingUp } from 'lucide-react';

interface Props {
  workflows: WorkflowRow[];
}

export function WorkflowThroughputChart({ workflows }: Props) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { label: string; month: number; year: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('pt-BR', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
      });
    }

    return months.map(m => {
      const created = workflows.filter(w => {
        const d = new Date(w.created_at);
        return d.getMonth() === m.month && d.getFullYear() === m.year;
      }).length;

      const published = workflows.filter(w => {
        if (w.status !== 'publicado') return false;
        const d = new Date(w.status_changed_at);
        return d.getMonth() === m.month && d.getFullYear() === m.year;
      }).length;

      return { name: m.label, Criados: created, Publicados: published };
    });
  }, [workflows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Throughput (últimos 6 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Criados" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Publicados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
