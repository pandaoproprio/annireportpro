import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MonitoringConfig {
  id: string;
  inactive_days_threshold: number;
  min_tasks_per_day: number;
  max_avg_task_seconds: number;
  report_frequency: string;
  is_active: boolean;
  sla_by_activity_type: Record<string, number>;
  score_weights: Record<string, number>;
  productivity_drop_threshold: number;
}

export interface MonitoringEmail {
  id: string;
  email: string;
  created_at: string;
}

export interface MonitoringAlert {
  id: string;
  alert_type: string;
  user_id: string;
  user_name: string;
  description: string;
  severity: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface ProductivitySnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  activities_count: number;
  avg_task_seconds: number | null;
  days_inactive: number;
  tasks_per_day: number;
  sla_violations: number;
  sla_total: number;
  sla_pct_on_time: number;
  status: string;
  created_at: string;
  // new columns
  tasks_started: number;
  tasks_finished: number;
  reopen_count: number;
  overdue_count: number;
  concurrent_tasks: number;
  delivery_regularity: number;
  team_avg_activities: number;
  percentile_rank: number;
  score: number;
  user_projects: { id: string; name: string }[];
  user_role: string;
  // joined
  user_name?: string;
  user_email?: string;
}

async function fetchConfig(): Promise<MonitoringConfig | null> {
  const { data, error } = await supabase
    .from('monitoring_config')
    .select('*')
    .limit(1)
    .single();
  if (error) return null;
  return data as unknown as MonitoringConfig;
}

async function fetchEmails(): Promise<MonitoringEmail[]> {
  const { data, error } = await supabase
    .from('monitoring_emails')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as MonitoringEmail[];
}

async function fetchSnapshots(days: number): Promise<ProductivitySnapshot[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('user_productivity_snapshots')
    .select('*')
    .gte('snapshot_date', since.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: false });
  if (error) throw error;

  const rows = (data || []) as unknown as ProductivitySnapshot[];

  // Enrich with profile data
  const userIds = [...new Set(rows.map(r => r.user_id))];
  if (userIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, name, email')
    .in('user_id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

  return rows
    .map(r => ({
      ...r,
      user_name: profileMap.get(r.user_id)?.name || 'Desconhecido',
      user_email: profileMap.get(r.user_id)?.email || '',
      user_projects: Array.isArray(r.user_projects) ? r.user_projects : [],
    }))
    .filter(r => r.user_role !== 'super_admin');
}

async function fetchAlerts(days: number): Promise<MonitoringAlert[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('monitoring_alerts')
    .select('*')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []) as unknown as MonitoringAlert[];
}

export function useProductivityMonitoring(days = 30) {
  const qc = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['monitoring-config'],
    queryFn: fetchConfig,
  });

  const emailsQuery = useQuery({
    queryKey: ['monitoring-emails'],
    queryFn: fetchEmails,
  });

  const snapshotsQuery = useQuery({
    queryKey: ['monitoring-snapshots', days],
    queryFn: () => fetchSnapshots(days),
  });

  const alertsQuery = useQuery({
    queryKey: ['monitoring-alerts', days],
    queryFn: () => fetchAlerts(days),
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<MonitoringConfig>) => {
      const id = configQuery.data?.id;
      if (!id) throw new Error('Config not found');
      const { error } = await supabase
        .from('monitoring_config')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring-config'] });
      toast.success('Configuração atualizada');
    },
    onError: () => toast.error('Erro ao atualizar configuração'),
  });

  const addEmail = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase
        .from('monitoring_emails')
        .insert({ email } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring-emails'] });
      toast.success('Email adicionado');
    },
    onError: () => toast.error('Erro ao adicionar email'),
  });

  const removeEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monitoring_emails')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring-emails'] });
      toast.success('Email removido');
    },
    onError: () => toast.error('Erro ao remover email'),
  });

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('monitoring_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() } as any)
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monitoring-alerts'] });
      toast.success('Alerta resolvido');
    },
    onError: () => toast.error('Erro ao resolver alerta'),
  });

  // Compute aggregated metrics
  const latestSnapshots = (() => {
    const snaps = snapshotsQuery.data || [];
    const byUser = new Map<string, ProductivitySnapshot>();
    for (const s of snaps) {
      const existing = byUser.get(s.user_id);
      if (!existing || s.snapshot_date > existing.snapshot_date) {
        byUser.set(s.user_id, s);
      }
    }
    return Array.from(byUser.values());
  })();

  const activeUsers = latestSnapshots.filter(s => s.days_inactive <= (configQuery.data?.inactive_days_threshold ?? 3));
  const inactiveUsers = latestSnapshots.filter(s => s.days_inactive > (configQuery.data?.inactive_days_threshold ?? 3));
  const lowPerformers = latestSnapshots.filter(s => s.status === 'low_performance');
  const slaViolators = latestSnapshots.filter(s => s.sla_violations > 0);

  const avgScore = latestSnapshots.length > 0
    ? latestSnapshots.reduce((s, u) => s + Number(u.score || 0), 0) / latestSnapshots.length
    : 0;
  const totalRework = latestSnapshots.reduce((s, u) => s + (u.reopen_count || 0), 0);

  return {
    config: configQuery.data,
    configLoading: configQuery.isLoading,
    updateConfig,
    emails: emailsQuery.data || [],
    emailsLoading: emailsQuery.isLoading,
    addEmail,
    removeEmail,
    snapshots: snapshotsQuery.data || [],
    snapshotsLoading: snapshotsQuery.isLoading,
    latestSnapshots,
    activeUsers,
    inactiveUsers,
    lowPerformers,
    slaViolators,
    avgScore,
    totalRework,
    alerts: alertsQuery.data || [],
    alertsLoading: alertsQuery.isLoading,
    resolveAlert,
  };
}
