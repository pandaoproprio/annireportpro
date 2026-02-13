import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Activity, ActivityType } from '@/types';
import { logAuditEvent } from '@/lib/auditLog';
import { Database } from '@/integrations/supabase/types';

type DbActivityType = Database['public']['Enums']['activity_type'];

interface DbActivity {
  id: string;
  user_id: string;
  project_id: string;
  goal_id: string | null;
  date: string;
  end_date: string | null;
  location: string;
  type: DbActivityType;
  description: string;
  results: string;
  challenges: string;
  attendees_count: number;
  team_involved: string[];
  photos: string[];
  attachments: string[];
  cost_evidence: string | null;
  created_at: string;
  updated_at: string;
}

const dbTypeToEnum: Record<DbActivityType, ActivityType> = {
  'Execução de Meta': ActivityType.EXECUCAO,
  'Reunião de Equipe': ActivityType.REUNIAO,
  'Ocorrência/Imprevisto': ActivityType.OCORRENCIA,
  'Divulgação/Mídia': ActivityType.COMUNICACAO,
  'Administrativo/Financeiro': ActivityType.ADMINISTRATIVO,
  'Outras Ações': ActivityType.OUTROS
};

const enumToDbType: Record<ActivityType, DbActivityType> = {
  [ActivityType.EXECUCAO]: 'Execução de Meta',
  [ActivityType.REUNIAO]: 'Reunião de Equipe',
  [ActivityType.OCORRENCIA]: 'Ocorrência/Imprevisto',
  [ActivityType.COMUNICACAO]: 'Divulgação/Mídia',
  [ActivityType.ADMINISTRATIVO]: 'Administrativo/Financeiro',
  [ActivityType.OUTROS]: 'Outras Ações'
};

const mapDbToActivity = (db: DbActivity): Activity => ({
  id: db.id,
  projectId: db.project_id,
  goalId: db.goal_id || undefined,
  date: db.date,
  endDate: db.end_date || undefined,
  location: db.location,
  type: dbTypeToEnum[db.type],
  description: db.description,
  results: db.results,
  challenges: db.challenges,
  attendeesCount: db.attendees_count,
  teamInvolved: db.team_involved || [],
  photos: db.photos || [],
  attachments: db.attachments || [],
  costEvidence: db.cost_evidence || undefined
});

const fetchActivitiesFromDb = async (
  userId: string,
  isAdmin: boolean,
  projectId: string | null,
  page: number,
  pageSize: number
): Promise<{ activities: Activity[]; total: number }> => {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('activities')
    .select('*', { count: 'exact' });

  if (!isAdmin) query = query.eq('user_id', userId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error, count } = await query
    .order('date', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    activities: (data as DbActivity[]).map(mapDbToActivity),
    total: count || 0,
  };
};

export const useActivities = (projectId: string | null) => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['activities', user?.id, isAdmin, projectId, page, pageSize],
    queryFn: () => fetchActivitiesFromDb(user!.id, isAdmin, projectId, page, pageSize),
    enabled: !!user,
    staleTime: 30_000,
  });

  const activities = data?.activities || [];
  const total = data?.total || 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['activities'] });

  const addActivityMutation = useMutation({
    mutationFn: async (activity: Omit<Activity, 'id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          project_id: activity.projectId,
          goal_id: activity.goalId || null,
          date: activity.date,
          end_date: activity.endDate || null,
          location: activity.location,
          type: enumToDbType[activity.type],
          description: activity.description,
          results: activity.results,
          challenges: activity.challenges,
          attendees_count: activity.attendeesCount,
          team_involved: activity.teamInvolved,
          photos: activity.photos,
          attachments: activity.attachments,
          cost_evidence: activity.costEvidence || null
        })
        .select()
        .single();
      if (error) throw error;
      return mapDbToActivity(data as DbActivity);
    },
    onSuccess: () => invalidate(),
  });

  const updateActivityMutation = useMutation({
    mutationFn: async (activity: Activity) => {
      if (!user) throw new Error('Not authenticated');
      let query = supabase
        .from('activities')
        .update({
          project_id: activity.projectId,
          goal_id: activity.goalId || null,
          date: activity.date,
          end_date: activity.endDate || null,
          location: activity.location,
          type: enumToDbType[activity.type],
          description: activity.description,
          results: activity.results,
          challenges: activity.challenges,
          attendees_count: activity.attendeesCount,
          team_involved: activity.teamInvolved,
          photos: activity.photos,
          attachments: activity.attachments,
          cost_evidence: activity.costEvidence || null
        })
        .eq('id', activity.id);
      if (!isAdmin) query = query.eq('user_id', user.id);
      const { error } = await query;
      if (error) throw error;
    },
    onMutate: async (activity) => {
      await queryClient.cancelQueries({ queryKey: ['activities'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['activities'] });
      queryClient.setQueriesData({ queryKey: ['activities'] }, (old: any) => {
        if (!old?.activities) return old;
        return { ...old, activities: old.activities.map((a: Activity) => a.id === activity.id ? activity : a) };
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]: [any, any]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => invalidate(),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      let query = supabase
        .from('activities')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (!isAdmin) query = query.eq('user_id', user.id);
      const { error } = await query;
      if (error) throw error;
      const a = activities.find(a => a.id === id);
      await logAuditEvent({ userId: user.id, action: 'DELETE', entityType: 'activities', entityId: id, entityName: a?.description?.substring(0, 100) });
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['activities'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['activities'] });
      queryClient.setQueriesData({ queryKey: ['activities'] }, (old: any) => {
        if (!old?.activities) return old;
        return { ...old, activities: old.activities.filter((a: Activity) => a.id !== id), total: Math.max(0, (old.total || 0) - 1) };
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]: [any, any]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => invalidate(),
  });

  const pagination = { page, pageSize, total };

  const goToPage = (p: number) => setPage(p);
  const nextPage = () => {
    const maxPage = Math.ceil(total / pageSize) - 1;
    if (page < maxPage) setPage(page + 1);
  };
  const prevPage = () => { if (page > 0) setPage(page - 1); };

  return {
    activities,
    isLoading,
    pagination,
    goToPage,
    nextPage,
    prevPage,
    addActivity: async (activity: Omit<Activity, 'id'>) => {
      try { return await addActivityMutation.mutateAsync(activity); } catch { return null; }
    },
    updateActivity: async (activity: Activity) => {
      try { await updateActivityMutation.mutateAsync(activity); } catch { /* handled */ }
    },
    deleteActivity: async (id: string) => {
      try { await deleteActivityMutation.mutateAsync(id); } catch { /* handled */ }
    },
    refetch: () => invalidate(),
  };
};
