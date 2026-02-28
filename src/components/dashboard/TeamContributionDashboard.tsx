import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Activity } from '@/types';
import { Users, FileText, Clock, TrendingUp, Award } from 'lucide-react';

interface Props {
  activities: Activity[];
  projectName?: string;
}

interface MemberStats {
  name: string;
  email: string;
  role: string;
  totalRecords: number;
  totalAttachments: number;
  avgDaysBetween: number;
  weeklyFrequency: number;
}

export const TeamContributionDashboard: React.FC<Props> = ({ activities, projectName }) => {
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (!a.authorName) return false;
      if (filterDateStart && a.date < filterDateStart) return false;
      if (filterDateEnd && a.date > filterDateEnd) return false;
      if (filterRole !== 'all' && a.projectRoleSnapshot !== filterRole) return false;
      return true;
    });
  }, [activities, filterRole, filterDateStart, filterDateEnd]);

  const memberStats = useMemo<MemberStats[]>(() => {
    const map = new Map<string, { name: string; email: string; role: string; dates: string[]; attachments: number; activityDates: string[] }>();

    filtered.forEach(a => {
      const key = a.authorEmail || a.authorName || '';
      if (!map.has(key)) {
        map.set(key, {
          name: a.authorName || '',
          email: a.authorEmail || '',
          role: a.projectRoleSnapshot || a.setorResponsavel || '',
          dates: [],
          attachments: 0,
          activityDates: [],
        });
      }
      const entry = map.get(key)!;
      entry.dates.push(a.createdAt || a.date);
      entry.activityDates.push(a.date);
      entry.attachments += (a.photos?.length || 0) + (a.attendanceFiles?.length || 0);
    });

    return Array.from(map.values()).map(m => {
      const sortedDates = m.dates.sort();
      let avgDays = 0;
      if (sortedDates.length > 1) {
        const diffs: number[] = [];
        for (let i = 1; i < sortedDates.length; i++) {
          diffs.push((new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / (1000 * 60 * 60 * 24));
        }
        avgDays = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      }

      // Weekly frequency: records per week in the date range
      const firstDate = sortedDates[0] ? new Date(sortedDates[0]) : new Date();
      const lastDate = sortedDates[sortedDates.length - 1] ? new Date(sortedDates[sortedDates.length - 1]) : new Date();
      const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weeklyFrequency = m.dates.length / weeks;

      return {
        name: m.name,
        email: m.email,
        role: m.role,
        totalRecords: m.dates.length,
        totalAttachments: m.attachments,
        avgDaysBetween: Math.round(avgDays * 10) / 10,
        weeklyFrequency: Math.round(weeklyFrequency * 10) / 10,
      };
    }).sort((a, b) => b.totalRecords - a.totalRecords);
  }, [filtered]);

  const uniqueRoles = useMemo(() => {
    const set = new Set<string>();
    activities.forEach(a => { if (a.projectRoleSnapshot) set.add(a.projectRoleSnapshot); });
    return Array.from(set);
  }, [activities]);

  const totalRecords = memberStats.reduce((s, m) => s + m.totalRecords, 0);
  const totalAttachments = memberStats.reduce((s, m) => s + m.totalAttachments, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Contribuição da Equipe
        </h2>
        {projectName && <p className="text-sm text-muted-foreground mt-1">{projectName}</p>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Funções</SelectItem>
            {uniqueRoles.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} className="w-40" placeholder="De" />
        <Input type="date" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} className="w-40" placeholder="Até" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg"><FileText className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Registros</p>
                <p className="text-2xl font-bold text-foreground">{totalRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg"><TrendingUp className="w-5 h-5 text-success" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Anexos</p>
                <p className="text-2xl font-bold text-foreground">{totalAttachments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg"><Users className="w-5 h-5 text-info" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Membros Ativos</p>
                <p className="text-2xl font-bold text-foreground">{memberStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-warning" />
            Ranking de Participação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum registro encontrado para os filtros selecionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-medium text-muted-foreground">#</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground">Membro</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground">Função</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground text-center">Registros</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground text-center">Anexos</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground text-center">Freq. Semanal</th>
                    <th className="py-2 px-3 font-medium text-muted-foreground text-center">Intervalo Médio (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStats.map((m, i) => (
                    <tr key={m.email || m.name} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-2.5 px-3">
                        {i === 0 && <span className="text-warning font-bold">🥇</span>}
                        {i === 1 && <span className="text-muted-foreground font-bold">🥈</span>}
                        {i === 2 && <span className="text-muted-foreground font-bold">🥉</span>}
                        {i > 2 && <span className="text-muted-foreground">{i + 1}</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="secondary" className="text-xs">{m.role || '—'}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-primary">{m.totalRecords}</td>
                      <td className="py-2.5 px-3 text-center">{m.totalAttachments}</td>
                      <td className="py-2.5 px-3 text-center">{m.weeklyFrequency}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={m.avgDaysBetween > 7 ? 'text-destructive' : m.avgDaysBetween > 3 ? 'text-warning' : 'text-success'}>
                          {m.avgDaysBetween || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
