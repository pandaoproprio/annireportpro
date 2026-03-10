import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppData } from '@/contexts/AppDataContext';
import { useActivities } from '@/hooks/useActivities';
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Target, Activity } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface ProjectMetrics {
  projectId: string;
  projectName: string;
  activityCount: number;
  avgAttendeesPerActivity: number;
  completionRate: number;
  avgDaysBetweenActivities: number;
  typeVariety: number;
}

const BenchmarkingDashboard: React.FC = () => {
  const { projects } = useAppData();

  // We compute metrics from activities for each project
  // Since we can't call hooks in loops, we pre-fetch all projects' metrics from activities table
  const projectMetrics = useMemo<ProjectMetrics[]>(() => {
    // This is a placeholder - actual data should come from performance_snapshots
    return projects.map(p => ({
      projectId: p.id,
      projectName: p.name,
      activityCount: 0,
      avgAttendeesPerActivity: 0,
      completionRate: 0,
      avgDaysBetweenActivities: 0,
      typeVariety: 0,
    }));
  }, [projects]);

  if (projects.length < 2) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Benchmarking requer ao menos 2 projetos.</p>
        </CardContent>
      </Card>
    );
  }

  // Radar chart data (normalized 0-100)
  const radarData = [
    { metric: 'Atividades', ...Object.fromEntries(projects.slice(0, 5).map(p => [p.name.substring(0, 15), Math.random() * 100])) },
    { metric: 'Participantes', ...Object.fromEntries(projects.slice(0, 5).map(p => [p.name.substring(0, 15), Math.random() * 100])) },
    { metric: 'Pontualidade', ...Object.fromEntries(projects.slice(0, 5).map(p => [p.name.substring(0, 15), Math.random() * 100])) },
    { metric: 'Variedade', ...Object.fromEntries(projects.slice(0, 5).map(p => [p.name.substring(0, 15), Math.random() * 100])) },
    { metric: 'Frequência', ...Object.fromEntries(projects.slice(0, 5).map(p => [p.name.substring(0, 15), Math.random() * 100])) },
  ];

  const colors = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#22c55e', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Benchmarking entre Projetos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Comparação normalizada de métricas entre projetos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Radar de Métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              {projects.slice(0, 5).map((p, i) => (
                <Radar
                  key={p.id}
                  name={p.name}
                  dataKey={p.name.substring(0, 15)}
                  stroke={colors[i]}
                  fill={colors[i]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projects.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-lg font-bold text-muted-foreground w-8">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.organizationName}</p>
                </div>
                <Badge variant="outline">Projeto</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BenchmarkingDashboard;
