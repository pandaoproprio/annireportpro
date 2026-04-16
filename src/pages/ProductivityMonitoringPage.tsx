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
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { StatCard } from '@/components/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Users, AlertTriangle, Download, Plus, Trash2, Save, Settings2,
  TrendingUp, Clock, Play, Loader2, Bell, CheckCircle2, Target,
  RotateCcw, Award, Link2, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar,
} from 'recharts';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  analista: 'Analista',
  coordenador: 'Coordenador(a)',
  oficineiro: 'Oficineiro(a)',
  voluntario: 'Voluntário(a)',
  usuario: 'Usuário',
};

const ProductivityMonitoringPage: React.FC = () => {
  const { role } = useAuth();
  const [days, setDays] = useState(30);
  const {
    config, configLoading, updateConfig,
    emails, emailsLoading, addEmail, removeEmail,
    snapshots, snapshotsLoading,
    latestSnapshots, activeUsers, inactiveUsers, lowPerformers, slaViolators,
    avgScore, totalRework,
    alerts, alertsLoading, resolveAlert,
  } = useProductivityMonitoring(days);

  const [newEmail, setNewEmail] = useState('');
  const [running, setRunning] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, any> | null>(null);
  const [asanaBoards, setAsanaBoards] = useState<any[]>([]);
  const [asanaBoardsLoading, setAsanaBoardsLoading] = useState(false);
  const [newBoardUrl, setNewBoardUrl] = useState('');
  const [addingBoard, setAddingBoard] = useState(false);
  const [syncingAsana, setSyncingAsana] = useState(false);

  // Load Asana boards
  React.useEffect(() => {
    const loadBoards = async () => {
      setAsanaBoardsLoading(true);
      try {
        const { data } = await supabase
          .from('monitoring_asana_boards')
          .select('*')
          .order('created_at', { ascending: true });
        setAsanaBoards(data || []);
      } catch { /* ignore */ }
      setAsanaBoardsLoading(false);
    };
    loadBoards();
  }, []);

  const extractAsanaProjectGid = (input: string): string | null => {
    // Accept: full URL like https://app.asana.com/0/1234567890/list or just the GID
    const urlMatch = input.match(/asana\.com\/0\/(\d+)/);
    if (urlMatch) return urlMatch[1];
    if (/^\d+$/.test(input.trim())) return input.trim();
    return null;
  };

  const handleAddBoard = async () => {
    const gid = extractAsanaProjectGid(newBoardUrl);
    if (!gid) {
      toast.error('Cole um link do Asana ou o ID do projeto (ex: https://app.asana.com/0/1234567890/list)');
      return;
    }
    if (asanaBoards.some(b => b.asana_project_gid === gid)) {
      toast.error('Este board já está cadastrado');
      return;
    }
    setAddingBoard(true);
    try {
      const { data, error } = await supabase
        .from('monitoring_asana_boards')
        .insert({ asana_project_gid: gid, asana_project_name: `Projeto ${gid}` } as any)
        .select()
        .single();
      if (error) throw error;
      setAsanaBoards(prev => [...prev, data]);
      setNewBoardUrl('');
      toast.success('Board adicionado! Execute a sincronização para carregar os dados.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar board');
    }
    setAddingBoard(false);
  };

  const handleRemoveBoard = async (id: string) => {
    try {
      await supabase.from('monitoring_asana_boards').delete().eq('id', id);
      setAsanaBoards(prev => prev.filter(b => b.id !== id));
      toast.success('Board removido');
    } catch {
      toast.error('Erro ao remover board');
    }
  };

  const handleSyncAsana = async () => {
    setSyncingAsana(true);
    try {
      const { error } = await supabase.functions.invoke('sync-asana-productivity');
      if (error) throw error;
      toast.success('Sincronização Asana concluída! Recarregando...');
      // Reload boards to get updated names
      const { data } = await supabase
        .from('monitoring_asana_boards')
        .select('*')
        .order('created_at', { ascending: true });
      setAsanaBoards(data || []);
    } catch {
      toast.error('Erro ao sincronizar com Asana');
    }
    setSyncingAsana(false);
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke('daily-productivity-monitor');
      if (error) throw error;
      toast.success('Monitoramento executado com sucesso!');
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
        avgScore,
        totalRework,
        alerts,
      });
      toast.success('PDF exportado!');
    } catch {
      toast.error('Erro ao exportar PDF');
    }
  };

  // Ranking data
  const rankingData = [...latestSnapshots]
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map(s => ({
      name: (s.user_name || '').split(' ').slice(0, 2).join(' '),
      score: Number(s.score || 0),
      atividades: s.activities_count,
    }));
  const rankingChartHeight = Math.max(300, rankingData.length * 32);

  // Score trend over time
  const byDate = new Map<string, { total: number; count: number }>();
  for (const s of snapshots) {
    const d = s.snapshot_date;
    const existing = byDate.get(d) || { total: 0, count: 0 };
    existing.total += Number(s.score || 0);
    existing.count++;
    byDate.set(d, existing);
  }
  const scoreTrendData = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { total, count }]) => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      'Score Médio': Number((total / count).toFixed(1)),
    }));

  // Radar data for selected user
  const radarUser = selectedUser
    ? latestSnapshots.find(s => s.user_id === selectedUser)
    : latestSnapshots[0];

  const radarData = (() => {
    if (!radarUser) return [];

    const hasRecentActivity = radarUser.activities_count > 0;
    const noTrackedHistory = !hasRecentActivity
      && !radarUser.tasks_started
      && !radarUser.tasks_finished
      && Number(radarUser.score || 0) === 0;

    if (noTrackedHistory) {
      return [
        { dim: 'Engajamento', value: 0 },
        { dim: 'Volume', value: 0 },
        { dim: 'Eficiência', value: 0 },
        { dim: 'Qualidade', value: 0 },
        { dim: 'Consistência', value: 0 },
      ];
    }

    const engagement = Math.max(0, Math.min(100, 100 - radarUser.days_inactive * 5));
    const volume = hasRecentActivity
      ? Math.min(100, (radarUser.tasks_per_day / Math.max(config?.min_tasks_per_day || 1, 0.1)) * 100)
      : 0;
    const efficiency = hasRecentActivity
      ? (radarUser.sla_total > 0 ? Number(radarUser.sla_pct_on_time || 0) : 70)
      : 0;
    const quality = hasRecentActivity
      ? Math.max(0, 100 - (radarUser.reopen_count || 0) * 20 - (radarUser.overdue_count || 0) * 10)
      : 0;
    const consistency = hasRecentActivity ? Number(radarUser.delivery_regularity || 0) : 0;

    return [
      { dim: 'Engajamento', value: engagement },
      { dim: 'Volume', value: volume },
      { dim: 'Eficiência', value: efficiency },
      { dim: 'Qualidade', value: quality },
      { dim: 'Consistência', value: consistency },
    ];
  })();

  // Benchmark data
  const benchmarkData = [...latestSnapshots]
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 15)
    .map(s => ({
      name: (s.user_name || '').split(' ').slice(0, 2).join(' '),
      'Individual': s.activities_count,
      'Média Equipe': Number(s.team_avg_activities || 0),
    }));

  const currentConfig = editConfig || config;
  const currentWeights = (editConfig?.score_weights || config?.score_weights || {
    engagement: 20, volume: 20, efficiency: 20, quality: 20, consistency: 20,
  }) as Record<string, number>;

  const unresolvedAlerts = alerts.filter(a => !a.is_resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoramento de Produtividade</h1>
          <p className="text-sm text-muted-foreground">Visão geral de desempenho dos usuários — SuperAdmin</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Usuários Ativos" value={activeUsers.length} colorClass="text-success" />
        <StatCard label="Inativos" value={inactiveUsers.length} colorClass="text-destructive" />
        <StatCard label="Baixa Produtividade" value={lowPerformers.length} colorClass="text-warning" />
        <StatCard label="Violações SLA" value={slaViolators.length} colorClass="text-destructive" />
        <StatCard label="Score Médio" value={avgScore.toFixed(0)} colorClass="text-primary" />
        <StatCard label="Retrabalho Total" value={totalRework} colorClass="text-warning" />
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" className="gap-1.5"><TrendingUp className="w-4 h-4" />Dashboard</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-4 h-4" />Usuários</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5 relative">
            <Bell className="w-4 h-4" />Alertas
            {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-[10px]">{unresolvedAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5"><Settings2 className="w-4 h-4" />Configurações</TabsTrigger>
        </TabsList>

        {/* ── DASHBOARD TAB ── */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Ranking por Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rankingData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={rankingChartHeight}>
                    <BarChart data={rankingData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Score" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Visão Multidimensional
                </CardTitle>
                <select
                  className="border rounded px-2 py-1 text-xs bg-background text-foreground"
                  value={selectedUser || ''}
                  onChange={e => setSelectedUser(e.target.value || null)}
                >
                  {latestSnapshots.map(s => (
                    <option key={s.user_id} value={s.user_id}>{s.user_name}</option>
                  ))}
                </select>
              </CardHeader>
              <CardContent>
                {radarData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name={radarUser?.user_name || ''} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendência de Score</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreTrendData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={scoreTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Score Médio" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Benchmark */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Benchmark: Indivíduo vs Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {benchmarkData.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={benchmarkData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Individual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Média Equipe" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
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
                        <th className="py-2 px-2 font-medium text-muted-foreground">Função</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground">Projetos</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Score</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Atividades</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Iniciadas</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Finalizadas</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Retrabalho</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Dias Inativo</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">SLA %</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Percentil</th>
                        <th className="py-2 px-2 font-medium text-muted-foreground text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...latestSnapshots]
                        .sort((a, b) => Number(b.score) - Number(a.score))
                        .map(s => (
                          <tr key={s.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-2 px-2">
                              <div className="font-medium">{s.user_name}</div>
                              <div className="text-xs text-muted-foreground">{s.user_email}</div>
                            </td>
                            <td className="py-2 px-2">
                              <Badge variant="outline" className="text-xs">
                                {ROLE_LABELS[s.user_role] || s.user_role}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 max-w-[200px]">
                              {(s.user_projects || []).length === 0 ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {(s.user_projects || []).map((p: any, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {(p.name || '').substring(0, 20)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={`font-bold ${
                                Number(s.score) >= 70 ? 'text-success' :
                                Number(s.score) >= 40 ? 'text-warning' :
                                'text-destructive'
                              }`}>
                                {Number(s.score || 0).toFixed(0)}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">{s.activities_count}</td>
                            <td className="py-2 px-2 text-center">{s.tasks_started || 0}</td>
                            <td className="py-2 px-2 text-center">{s.tasks_finished || 0}</td>
                            <td className="py-2 px-2 text-center">
                              {(s.reopen_count || 0) > 0 ? (
                                <span className="text-warning font-medium">{s.reopen_count}</span>
                              ) : (
                                <span className="text-muted-foreground">0</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={s.days_inactive > (config?.inactive_days_threshold ?? 3) ? 'text-destructive font-semibold' : ''}>
                                {s.days_inactive}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">{Number(s.sla_pct_on_time).toFixed(0)}%</td>
                            <td className="py-2 px-2 text-center">
                              <span className="text-xs">{Number(s.percentile_rank || 0).toFixed(0)}%</span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <Badge variant={
                                s.status === 'ok' ? 'default' :
                                s.status === 'inactive' ? 'destructive' :
                                'secondary'
                              } className={`text-xs ${
                                s.status === 'ok' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                s.status === 'inactive' ? '' :
                                'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                              }`}>
                                {s.status === 'ok' ? 'OK' : s.status === 'inactive' ? 'Inativo' : 'Baixo'}
                              </Badge>
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

        {/* ── ALERTS TAB ── */}
        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Alertas Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <Skeleton className="h-40" />
              ) : alerts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhum alerta registrado no período.</p>
              ) : (
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`flex items-start justify-between gap-4 p-3 rounded-lg border ${
                        alert.is_resolved ? 'bg-muted/30 opacity-60' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          alert.severity === 'critical' ? 'bg-destructive' : 'bg-yellow-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{alert.user_name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {alert.alert_type === 'productivity_drop' ? 'Queda de Produtividade' :
                               alert.alert_type === 'recurring_sla' ? 'SLA Recorrente' :
                               alert.alert_type === 'inactivity' ? 'Inatividade' :
                               alert.alert_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      {!alert.is_resolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveAlert.mutate(alert.id)}
                          className="shrink-0"
                          title="Marcar como resolvido"
                        >
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        </Button>
                      )}
                    </div>
                  ))}
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
                      ...prev,
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
                      ...prev,
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
                      ...prev,
                      inactive_days_threshold: prev?.inactive_days_threshold ?? config?.inactive_days_threshold ?? 3,
                      min_tasks_per_day: prev?.min_tasks_per_day ?? config?.min_tasks_per_day ?? 1,
                      max_avg_task_seconds: Number(e.target.value),
                    }))}
                  />
                </div>
              </div>
              <div>
                <Label>Limiar de queda brusca (%)</Label>
                <Input
                  type="number"
                  className="max-w-[200px]"
                  value={currentConfig?.productivity_drop_threshold ?? 30}
                  onChange={e => setEditConfig(prev => ({
                    ...prev,
                    inactive_days_threshold: prev?.inactive_days_threshold ?? config?.inactive_days_threshold ?? 3,
                    min_tasks_per_day: prev?.min_tasks_per_day ?? config?.min_tasks_per_day ?? 1,
                    max_avg_task_seconds: prev?.max_avg_task_seconds ?? config?.max_avg_task_seconds ?? 86400,
                    productivity_drop_threshold: Number(e.target.value),
                  }))}
                />
              </div>
              {editConfig && (
                <Button onClick={handleSaveConfig} className="gap-2" disabled={updateConfig.isPending}>
                  <Save className="w-4 h-4" />
                  Salvar Configurações
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Score Weights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Pesos do Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['engagement', 'volume', 'efficiency', 'quality', 'consistency'] as const).map(dim => {
                const labels: Record<string, string> = {
                  engagement: 'Engajamento',
                  volume: 'Volume',
                  efficiency: 'Eficiência',
                  quality: 'Qualidade',
                  consistency: 'Consistência',
                };
                const val = currentWeights[dim] ?? 20;
                return (
                  <div key={dim} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{labels[dim]}</span>
                      <span className="font-medium">{val}</span>
                    </div>
                    <Slider
                      value={[val]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => {
                        const newWeights = { ...currentWeights, [dim]: v };
                        setEditConfig(prev => ({
                          ...prev,
                          inactive_days_threshold: prev?.inactive_days_threshold ?? config?.inactive_days_threshold ?? 3,
                          min_tasks_per_day: prev?.min_tasks_per_day ?? config?.min_tasks_per_day ?? 1,
                          max_avg_task_seconds: prev?.max_avg_task_seconds ?? config?.max_avg_task_seconds ?? 86400,
                          score_weights: newWeights,
                        }));
                      }}
                    />
                  </div>
                );
              })}
              {editConfig && (
                <Button onClick={handleSaveConfig} className="gap-2 mt-2" disabled={updateConfig.isPending}>
                  <Save className="w-4 h-4" />
                  Salvar Pesos
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

          {/* Asana Boards */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Boards do Asana para Monitoramento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicione os links dos projetos/boards do Asana. O sistema buscará as métricas de cada membro automaticamente.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://app.asana.com/0/1234567890/list ou ID do projeto"
                  value={newBoardUrl}
                  onChange={e => setNewBoardUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddBoard()}
                  className="flex-1"
                />
                <Button onClick={handleAddBoard} disabled={addingBoard} className="gap-1.5 shrink-0">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </div>

              {asanaBoardsLoading ? (
                <Skeleton className="h-20" />
              ) : asanaBoards.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum board do Asana configurado.</p>
              ) : (
                <ul className="space-y-2">
                  {asanaBoards.map(b => (
                    <li key={b.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {b.asana_project_name || `Projeto ${b.asana_project_gid}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          GID: {b.asana_project_gid}
                          {b.last_synced_at && (
                            <> • Último sync: {new Date(b.last_synced_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                            })}</>
                          )}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBoard(b.id)}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {asanaBoards.length > 0 && (
                <Button onClick={handleSyncAsana} disabled={syncingAsana} variant="outline" className="gap-2">
                  {syncingAsana ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sincronizar Agora
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductivityMonitoringPage;
