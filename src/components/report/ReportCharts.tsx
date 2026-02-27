import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Goal } from '@/types';
import { format, parseISO, startOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
  'hsl(var(--accent))',
];

const tooltipStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  fontSize: '12px',
};

/** Chart wrapper with collapsible toggle */
const ChartWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs mb-2">
          <BarChart3 className="w-3.5 h-3.5" />
          {open ? 'Ocultar' : 'Ver'} {title}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 border rounded-lg bg-muted/30 mb-4 animate-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> {title}
          </p>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/** Activities by month bar chart — for Summary section */
export const ActivitiesByMonthInline: React.FC<{ activities: Activity[] }> = ({ activities }) => {
  const data = useMemo(() => {
    if (activities.length === 0) return [];
    const dates = activities.map(a => parseISO(a.date));
    const start = startOfMonth(new Date(Math.min(...dates.map(d => d.getTime()))));
    const end = startOfMonth(new Date(Math.max(...dates.map(d => d.getTime()))));
    const months = eachMonthOfInterval({ start, end });
    return months.map(month => {
      const key = format(month, 'yyyy-MM');
      const count = activities.filter(a => format(parseISO(a.date), 'yyyy-MM') === key).length;
      return { month: format(month, 'MMM/yy', { locale: ptBR }), atividades: count };
    });
  }, [activities]);

  if (data.length === 0) return null;

  return (
    <ChartWrapper title="Atividades por Mês">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="atividades" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Atividades" />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

/** Activity types pie chart — for Summary section */
export const ActivityTypesInline: React.FC<{ activities: Activity[] }> = ({ activities }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [activities]);

  if (data.length === 0) return null;

  return (
    <ChartWrapper title="Tipos de Atividade">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={3} dataKey="value">
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(v: string) => <span className="text-foreground text-xs">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

/** Attendees by goal horizontal bar chart — for Goals section */
export const AttendeesByGoalInline: React.FC<{
  activities: Activity[];
  goals: Goal[];
  getActivitiesByGoal: (goalId: string) => Activity[];
}> = ({ goals, getActivitiesByGoal }) => {
  const data = useMemo(() => {
    return goals.map(goal => {
      const acts = getActivitiesByGoal(goal.id);
      const total = acts.reduce((sum, a) => sum + (a.attendeesCount || 0), 0);
      return {
        name: goal.title.length > 20 ? goal.title.substring(0, 20) + '…' : goal.title,
        fullName: goal.title,
        participantes: total,
        atividades: acts.length,
      };
    }).filter(d => d.participantes > 0 || d.atividades > 0);
  }, [goals, getActivitiesByGoal]);

  if (data.length === 0) return null;

  return (
    <ChartWrapper title="Participantes por Meta">
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 45)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [`${value}`, name === 'participantes' ? 'Participantes' : 'Atividades']}
            labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || _}
          />
          <Bar dataKey="participantes" fill="hsl(var(--chart-2, 160 60% 45%))" radius={[0, 4, 4, 0]} name="Participantes" />
          <Bar dataKey="atividades" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Atividades" />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

/** Goal progress chart — for Goals section */
export const GoalProgressInline: React.FC<{
  goals: Goal[];
  getActivitiesByGoal: (goalId: string) => Activity[];
}> = ({ goals, getActivitiesByGoal }) => {
  const data = useMemo(() => {
    return goals.map(goal => {
      const acts = getActivitiesByGoal(goal.id);
      return {
        name: goal.title.length > 20 ? goal.title.substring(0, 20) + '…' : goal.title,
        fullName: goal.title,
        realizadas: acts.length,
      };
    }).filter(d => d.realizadas > 0);
  }, [goals, getActivitiesByGoal]);

  if (data.length === 0) return null;

  return (
    <ChartWrapper title="Progresso das Metas">
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => [`${value}`, 'Atividades realizadas']}
            labelFormatter={(_: string, payload: any[]) => payload?.[0]?.payload?.fullName || _}
          />
          <Bar dataKey="realizadas" fill="hsl(var(--chart-3, 30 80% 55%))" radius={[0, 4, 4, 0]} name="Realizadas" />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};
