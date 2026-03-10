import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Layers } from 'lucide-react';

interface ProjectStats {
  name: string;
  activities: number;
  attendees: number;
  goals: number;
}

interface Props {
  projects: Array<{
    id: string;
    name: string;
    goals: any[];
  }>;
  activitiesByProject: Record<string, Array<{ attendeesCount?: number }>>;
}

export function CrossProjectChart({ projects, activitiesByProject }: Props) {
  const data = useMemo<ProjectStats[]>(() => {
    return projects.slice(0, 8).map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 18) + '…' : p.name,
      activities: activitiesByProject[p.id]?.length || 0,
      attendees: (activitiesByProject[p.id] || []).reduce((s, a) => s + (a.attendeesCount || 0), 0),
      goals: p.goals?.length || 0,
    }));
  }, [projects, activitiesByProject]);

  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Comparativo entre Projetos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="activities" name="Atividades" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            <Bar dataKey="attendees" name="Participantes" fill="hsl(var(--primary) / 0.4)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
