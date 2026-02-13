import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Goal } from '@/types';

interface Props {
  activities: Activity[];
  goals: Goal[];
}

export const AttendeesByGoalChart: React.FC<Props> = ({ activities, goals }) => {
  const data = useMemo(() => {
    if (goals.length === 0) return [];

    return goals.map(goal => {
      const total = activities
        .filter(a => a.goalId === goal.id)
        .reduce((sum, a) => sum + (a.attendeesCount || 0), 0);
      return {
        name: goal.title.length > 25 ? goal.title.substring(0, 25) + '…' : goal.title,
        fullName: goal.title,
        participantes: total,
      };
    }).filter(d => d.participantes > 0);
  }, [activities, goals]);

  if (data.length === 0) return null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">Participantes por Meta</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
              formatter={(value: number) => [`${value} participantes`, 'Total']}
              labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.fullName || label}
            />
            <Bar dataKey="participantes" fill="hsl(var(--chart-2, 160 60% 45%))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
