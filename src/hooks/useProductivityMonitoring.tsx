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
}

export interface MonitoringEmail {
  id: string;
  email: string;
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
  // joined
  user_name?: string;
  user_email?: string;
  user_role?: string;
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

  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .in('user_id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
  const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));

  return rows
    .map(r => ({
      ...r,
      user_name: profileMap.get(r.user_id)?.name || 'Desconhecido',
      user_email: profileMap.get(r.user_id)?.email || '',
      user_role: roleMap.get(r.user_id) || 'usuario',
    }))
    .filter(r => r.user_role !== 'super_admin');
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
  };
}
