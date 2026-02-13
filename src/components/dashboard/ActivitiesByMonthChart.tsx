import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from '@/types';
import { format, parseISO, startOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  activities: Activity[];
  startDate?: string;
  endDate?: string;
}

export const ActivitiesByMonthChart: React.FC<Props> = ({ activities, startDate, endDate }) => {
  const data = useMemo(() => {
    if (activities.length === 0) return [];

    const start = startDate ? parseISO(startDate) : parseISO(activities[activities.length - 1]?.date);
    const end = endDate ? parseISO(endDate) : new Date();

    const months = eachMonthOfInterval({ start: startOfMonth(start), end: startOfMonth(end) });

    return months.map(month => {
      const key = format(month, 'yyyy-MM');
      const count = activities.filter(a => format(parseISO(a.date), 'yyyy-MM') === key).length;
      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        atividades: count,
      };
    });
  }, [activities, startDate, endDate]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Atividades por Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="atividades" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Atividades" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
