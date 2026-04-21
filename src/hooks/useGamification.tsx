import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type GamificationLevel = 'bronze' | 'prata' | 'ouro' | 'diamante' | 'lendario';
export type GamificationRarity = 'comum' | 'raro' | 'epico' | 'lendario';

export interface UserStats {
  user_id: string;
  xp: number;
  level: GamificationLevel;
  current_score: number;
  streak_no_rework: number;
  streak_on_time: number;
  total_activities: number;
  total_published: number;
  last_recalculated_at: string;
  user_name?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: GamificationRarity;
  xp_reward: number;
  criterion_type: string;
  criterion_value: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  metric: string;
  target_value: number;
  xp_reward: number;
  badge_reward: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  progress: number;
  completed_at: string | null;
  claimed_at: string | null;
}

export const LEVEL_THRESHOLDS: Record<GamificationLevel, number> = {
  bronze: 0,
  prata: 300,
  ouro: 1000,
  diamante: 2500,
  lendario: 5000,
};

export const LEVEL_LABELS: Record<GamificationLevel, string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  diamante: 'Diamante',
  lendario: 'Lendário',
};

export const LEVEL_COLORS: Record<GamificationLevel, string> = {
  bronze: 'text-amber-700',
  prata: 'text-slate-400',
  ouro: 'text-yellow-500',
  diamante: 'text-cyan-400',
  lendario: 'text-fuchsia-500',
};

export const RARITY_COLORS: Record<GamificationRarity, string> = {
  comum: 'border-muted bg-muted/30',
  raro: 'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
  epico: 'border-purple-400 bg-purple-50 dark:bg-purple-950/30',
  lendario: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30',
};

export function nextLevelXp(level: GamificationLevel): number {
  const order: GamificationLevel[] = ['bronze', 'prata', 'ouro', 'diamante', 'lendario'];
  const idx = order.indexOf(level);
  if (idx === -1 || idx === order.length - 1) return LEVEL_THRESHOLDS.lendario;
  return LEVEL_THRESHOLDS[order[idx + 1]];
}

export function levelProgress(xp: number, level: GamificationLevel): number {
  const current = LEVEL_THRESHOLDS[level];
  const next = nextLevelXp(level);
  if (next <= current) return 100;
  return Math.min(100, Math.max(0, ((xp - current) / (next - current)) * 100));
}

export function useGamification(targetUserId?: string) {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const userId = targetUserId || user?.id;

  // Own stats
  const myStats = useQuery({
    queryKey: ['gamification-stats', userId],
    queryFn: async (): Promise<UserStats | null> => {
      if (!userId) return null;
      const { data } = await supabase
        .from('gamification_user_stats' as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return (data as unknown as UserStats) || null;
    },
    enabled: !!userId,
  });

  // All stats — admin only (for ranking)
  const allStats = useQuery({
    queryKey: ['gamification-all-stats'],
    queryFn: async (): Promise<UserStats[]> => {
      const { data } = await supabase
        .from('gamification_user_stats' as any)
        .select('*')
        .order('xp', { ascending: false });
      const rows = (data as unknown as UserStats[]) || [];
      const ids = rows.map(r => r.user_id);
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', ids);
      const map = new Map((profiles || []).map(p => [p.user_id, p.name]));
      return rows.map(r => ({ ...r, user_name: map.get(r.user_id) || 'Desconhecido' }));
    },
    enabled: isAdmin,
  });

  const badges = useQuery({
    queryKey: ['gamification-badges-catalog'],
    queryFn: async (): Promise<Badge[]> => {
      const { data } = await supabase
        .from('gamification_badges' as any)
        .select('*')
        .eq('is_active', true)
        .order('xp_reward', { ascending: true });
      return (data as unknown as Badge[]) || [];
    },
  });

  const myBadges = useQuery({
    queryKey: ['gamification-user-badges', userId],
    queryFn: async (): Promise<UserBadge[]> => {
      if (!userId) return [];
      const { data } = await supabase
        .from('gamification_user_badges' as any)
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });
      return (data as unknown as UserBadge[]) || [];
    },
    enabled: !!userId,
  });

  const missions = useQuery({
    queryKey: ['gamification-missions'],
    queryFn: async (): Promise<Mission[]> => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('gamification_missions' as any)
        .select('*')
        .eq('is_active', true)
        .gte('ends_at', now)
        .order('ends_at', { ascending: true });
      return (data as unknown as Mission[]) || [];
    },
  });

  const myMissions = useQuery({
    queryKey: ['gamification-user-missions', userId],
    queryFn: async (): Promise<UserMission[]> => {
      if (!userId) return [];
      const { data } = await supabase
        .from('gamification_user_missions' as any)
        .select('*')
        .eq('user_id', userId);
      return (data as unknown as UserMission[]) || [];
    },
    enabled: !!userId,
  });

  const recalcAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('recalc_all_user_gamification' as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gamification-stats'] });
      qc.invalidateQueries({ queryKey: ['gamification-all-stats'] });
      qc.invalidateQueries({ queryKey: ['gamification-user-badges'] });
      toast.success('Gamificação recalculada!');
    },
    onError: () => toast.error('Erro ao recalcular'),
  });

  const recalcMine = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase.rpc('recalc_user_gamification' as any, { _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gamification-stats', userId] });
      qc.invalidateQueries({ queryKey: ['gamification-user-badges', userId] });
    },
  });

  return {
    myStats: myStats.data,
    myStatsLoading: myStats.isLoading,
    allStats: allStats.data || [],
    allStatsLoading: allStats.isLoading,
    isAdmin,
    badges: badges.data || [],
    myBadges: myBadges.data || [],
    missions: missions.data || [],
    myMissions: myMissions.data || [],
    recalcAll,
    recalcMine,
  };
}
