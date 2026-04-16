import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useProductivityMonitoring } from '@/hooks/useProductivityMonitoring';
import { exportMonitoringToPdf } from '@/lib/monitoringPdfExport';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Users, UserX, AlertTriangle, ShieldCheck, Download, Plus, Trash2, Save, Settings2,
  TrendingUp, Clock, Play, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, Legend,
} from 'recharts';

const ProductivityMonitoringPage: React.FC = () => {
  const { role } = useAuth();
  const [days, setDays] = useState(30);
  const {
    config, configLoading, updateConfig,
    emails, emailsLoading, addEmail, removeEmail,
    snapshots, snapshotsLoading,
    latestSnapshots, activeUsers, inactiveUsers, lowPerformers, slaViolators,
  } = useProductivityMonitoring(days);

  const [newEmail, setNewEmail] = useState('');
  const [running, setRunning] = useState(false);
  const [editConfig, setEditConfig] = useState<{
    inactive_days_threshold: number;
    min_tasks_per_day: number;
    max_avg_task_seconds: number;
  } | null>(null);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke('daily-productivity-monitor');
      if (error) throw error;
      toast.success('Monitoramento executado com sucesso!');
      // Refresh data
      window.location.reload();
    } catch {
      toast.error('Erro ao executar monitoramento');
    } finally {
      setRunning(false);
    }
  };

  if (role !== 'SUPER_ADMIN') return <Navigate to="/" replace />;

  if (configLoading || snapshotsLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const handleSaveConfig = () => {
    if (!editConfig) return;
    updateConfig.mutate(editConfig as any);
    setEditConfig(null);
  };

  const handleAddEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Email inválido');
      return;
    }
    addEmail.mutate(newEmail);
    setNewEmail('');
  };

  const handleExportPdf = () => {
    try {
      exportMonitoringToPdf({
        snapshots: latestSnapshots,
        config,
        activeCount: activeUsers.length,
        inactiveCount: inactiveUsers.length,
        lowPerformersCount: lowPerformers.length,
        slaViolatorsCount: slaViolators.length,
      });
      toast.success('PDF exportado!');
    } catch {
      toast.error('Erro ao exportar PDF');
    }
  };

  // Chart data: ranking by activities
  const rankingData = [...latestSnapshots]
    .sort((a, b) => b.activities_count - a.activities_count)
    .slice(0, 15)
    .map(s => ({
      name: (s.user_name || '').split(' ')[0],
      atividades: s.activities_count,
      sla: Number(s.sla_pct_on_time),
    }));

  // Chart data: activity over time (aggregate by date)
  const byDate = new Map<string, number>();
  for (const s of snapshots) {
    byDate.set(s.snapshot_date, (byDate.get(s.snapshot_date) || 0) + s.activities_count);
  }
  const timelineData = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      atividades: count,
    }));

  const currentConfig = editConfig || config;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoramento de Produtividade</h1>
          <p className="text-sm text-muted-foreground">Visão geral de desempenho dos usuários — SuperAdmin</p>
        </div>
        <div className="flex gap-2">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm bg-background text-foreground"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <Button variant="outline" onClick={handleRunNow} disabled={running} className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Executar Agora
          </Button>
          <Button variant="outline" onClick={handleExportPdf} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Usuários Ativos" value={activeUsers.length} colorClass="text-success" />
        <StatCard label="Inativos" value={inactiveUsers.length} colorClass="text-destructive" />
        <StatCard label="Baixa Produtividade" value={lowPerformers.length} colorClass="text-warning" />
        <StatCard label="Violações SLA" value={slaViolators.length} colorClass="text-destructive" />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5"><TrendingUp className="w-4 h-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" />Usuários</TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5"><Settings2 className="w-4 h-4" />Configurações</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD TAB ── */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ranking de Produtividade</CardTitle>
              </CardHeader>
              <CardContent>
                {rankingData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível. Execute o monitoramento para gerar métricas.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={rankingData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="atividades" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Atividades ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                {timelineData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="atividades" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SLA Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Indicadores de SLA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestSnapshots.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Sem dados de SLA.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(() => {
                    const total = latestSnapshots.reduce((a, s) => a + s.sla_total, 0);
                    const violations = latestSnapshots.reduce((a, s) => a + s.sla_violations, 0);
                    const onTime = total - violations;
                    const pct = total > 0 ? ((onTime / total) * 100).toFixed(1) : '100';
                    return (
                      <>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">Total Tarefas</p>
                          <p className="text-2xl font-bold text-foreground">{total}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">No Prazo</p>
                          <p className="text-2xl font-bold text-success">{onTime}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">Fora do SLA</p>
                          <p className="text-2xl font-bold text-destructive">{violations}</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-muted">
                          <p className="text-xs text-muted-foreground">% Dentro</p>
                          <p className="text-2xl font-bold text-primary">{pct}%</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuários Monitorados</CardTitle>
            </CardHeader>
            <CardContent>
              {latestSnapshots.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  Nenhum snapshot encontrado. Execute a função de monitoramento para gerar dados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-2 font-medium text-muted-foreground">Usuário</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground">Email</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Atividades</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Dias Inativo</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Tarefas/Dia</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">SLA %</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestSnapshots
                        .sort((a, b) => b.activities_count - a.activities_count)
                        .map(s => (
                          <tr key={s.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-2 px-2 font-medium">{s.user_name}</td>
                            <td className="py-2 px-2 text-muted-foreground">{s.user_email}</td>
                            <td className="py-2 px-2 text-center">{s.activities_count}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={s.days_inactive > (config?.inactive_days_threshold ?? 3) ? 'text-destructive font-semibold' : ''}>
                                {s.days_inactive}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">{Number(s.tasks_per_day).toFixed(1)}</td>
                            <td className="py-2 px-2 text-center">{Number(s.sla_pct_on_time).toFixed(0)}%</td>
                            <td className="py-2 px-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                s.status === 'ok' ? 'bg-green-100 text-green-800' :
                                s.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {s.status === 'ok' ? 'OK' : s.status === 'inactive' ? 'Inativo' : 'Baixo'}
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
        </TabsContent>

        {/* ── CONFIG TAB ── */}
        <TabsContent value="config" className="space-y-6 mt-4">
          {/* Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Regras de Alerta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Dias sem login (alerta)</Label>
                  <Input
                    type="number"
                    value={currentConfig?.inactive_days_threshold ?? 3}
                    onChange={e => setEditConfig(prev => ({
                      inactive_days_threshold: Number(e.target.value),
                      min_tasks_per_day: prev?.min_tasks_per_day ?? config?.min_tasks_per_day ?? 1,
                      max_avg_task_seconds: prev?.max_avg_task_seconds ?? config?.max_avg_task_seconds ?? 86400,
                    }))}
                  />
                </div>
                <div>
                  <Label>Mínimo tarefas/dia</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={currentConfig?.min_tasks_per_day ?? 1}
                    onChange={e => setEditConfig(prev => ({
                      inactive_days_threshold: prev?.inactive_days_threshold ?? config?.inactive_days_threshold ?? 3,
                      min_tasks_per_day: Number(e.target.value),
                      max_avg_task_seconds: prev?.max_avg_task_seconds ?? config?.max_avg_task_seconds ?? 86400,
                    }))}
                  />
                </div>
                <div>
                  <Label>Tempo máximo por tarefa (segundos)</Label>
                  <Input
                    type="number"
                    value={currentConfig?.max_avg_task_seconds ?? 86400}
                    onChange={e => setEditConfig(prev => ({
                      inactive_days_threshold: prev?.inactive_days_threshold ?? config?.inactive_days_threshold ?? 3,
                      min_tasks_per_day: prev?.min_tasks_per_day ?? config?.min_tasks_per_day ?? 1,
                      max_avg_task_seconds: Number(e.target.value),
                    }))}
                  />
                </div>
              </div>
              {editConfig && (
                <Button onClick={handleSaveConfig} className="gap-2" disabled={updateConfig.isPending}>
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Emails */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Emails de Monitoramento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="email@exemplo.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
                  className="max-w-sm"
                />
                <Button onClick={handleAddEmail} disabled={addEmail.isPending} className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>
              {emailsLoading ? (
                <Skeleton className="h-20" />
              ) : emails.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum email cadastrado.</p>
              ) : (
                <ul className="space-y-2">
                  {emails.map(em => (
                    <li key={em.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
                      <span className="text-sm">{em.email}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmail.mutate(em.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductivityMonitoringPage;
