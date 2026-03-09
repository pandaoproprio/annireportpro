import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ClipboardList, Users, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FormField, FormResponse } from '../types';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
];

interface Props {
  responses: FormResponse[];
  fields: FormField[];
}

export const FormDashboard: React.FC<Props> = ({ responses, fields }) => {
  const stats = useMemo(() => {
    const byDay: Record<string, number> = {};
    responses.forEach(r => {
      const day = format(new Date(r.submitted_at), 'dd/MM', { locale: ptBR });
      byDay[day] = (byDay[day] || 0) + 1;
    });
    const timelineData = Object.entries(byDay).map(([name, total]) => ({ name, total }));

    return { timelineData };
  }, [responses]);

  const chartableFields = useMemo(() => {
    return fields.filter(f =>
      ['single_select', 'multi_select', 'checkbox', 'scale', 'number'].includes(f.type)
    );
  }, [fields]);

  const fieldCharts = useMemo(() => {
    return chartableFields.map(field => {
      const counts: Record<string, number> = {};

      responses.forEach(r => {
        const val = r.answers?.[field.id];
        if (val === undefined || val === null) return;

        if (Array.isArray(val)) {
          val.forEach(v => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
        } else {
          const key = String(val);
          counts[key] = (counts[key] || 0) + 1;
        }
      });

      const data = Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return { field, data, type: field.type === 'scale' || field.type === 'number' ? 'bar' as const : 'pie' as const };
    }).filter(c => c.data.length > 0);
  }, [chartableFields, responses]);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{responses.length}</p>
              <p className="text-xs text-muted-foreground">Total de respostas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{responses.filter(r => r.respondent_name || r.respondent_email).length}</p>
              <p className="text-xs text-muted-foreground">Identificados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {responses.length > 0 ? format(new Date(responses[0].submitted_at), 'dd/MM', { locale: ptBR }) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Última resposta</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{fields.length}</p>
              <p className="text-xs text-muted-foreground">Campos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {stats.timelineData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Respostas por dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Respostas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Field charts */}
      {fieldCharts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {fieldCharts.map(({ field, data, type }) => (
            <Card key={field.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{field.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {type === 'pie' ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Respostas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
