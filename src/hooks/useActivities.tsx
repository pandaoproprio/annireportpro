import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Activity, ActivityType, AttendanceFile, ExpenseRecord } from '@/types';
import { logUnified } from '@/lib/unifiedLog';
import { logAction } from '@/lib/systemLog';
import { createAsanaTaskOnPublish } from '@/lib/asanaAutoTask';
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
  project_role_snapshot: string | null;
  setor_responsavel: string | null;
  profiles?: { name: string; email: string } | null;
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

const mapDbToActivity = (db: DbActivity & { is_draft?: boolean; photo_captions?: Record<string, string>; attendance_files?: AttendanceFile[]; expense_records?: ExpenseRecord[] }): Activity => ({
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
  costEvidence: db.cost_evidence || undefined,
  isDraft: db.is_draft ?? false,
  photoCaptions: (db.photo_captions as Record<string, string>) || {},
  attendanceFiles: (db.attendance_files as AttendanceFile[]) || [],
  expenseRecords: (db.expense_records as ExpenseRecord[]) || [],
  projectRoleSnapshot: db.project_role_snapshot || undefined,
  authorName: db.profiles?.name || undefined,
  authorEmail: db.profiles?.email || undefined,
  setorResponsavel: db.setor_responsavel || undefined,
  createdAt: db.created_at || undefined,
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

  // RLS handles access control — team members, collaborators and admins
  // see project activities based on their DB-level policies.
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error, count } = await query
    .order('date', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const rows = data as DbActivity[];

  // Fetch author profiles for all unique user_ids
  const userIds = [...new Set(rows.map(r => r.user_id))];
  let profileMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .in('user_id', userIds);
    if (profiles) {
      profileMap = Object.fromEntries(profiles.map(p => [p.user_id, { name: p.name, email: p.email }]));
    }
  }

  // Check which activities are linked to reports
  const activityIds = rows.map(r => r.id);
  let linkedSet = new Set<string>();
  if (activityIds.length > 0) {
    const { data: links } = await (supabase as any)
      .from('report_diary_links')
      .select('activity_id')
      .in('activity_id', activityIds);
    if (links) {
      linkedSet = new Set(links.map(l => l.activity_id));
    }
  }

  return {
    activities: rows.map(r => {
      const act = mapDbToActivity({
        ...r,
        profiles: profileMap[r.user_id] || null,
      });
      act.isLinkedToReport = linkedSet.has(r.id);
      return act;
    }),
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
          cost_evidence: activity.costEvidence || null,
          is_draft: activity.isDraft ?? false,
          photo_captions: activity.photoCaptions || {},
          attendance_files: activity.attendanceFiles || [],
          expense_records: activity.expenseRecords || [],
          project_role_snapshot: role || null,
          setor_responsavel: activity.setorResponsavel || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return mapDbToActivity(data as DbActivity);
    },
    onSuccess: (newActivity, variables) => {
      invalidate();
      logAction({ action: 'activity_created', entityType: 'activity', entityId: newActivity.id, newData: { description: newActivity.description, type: newActivity.type } });
      if (!variables.isDraft) {
        createAsanaTaskOnPublish({
          entityType: 'activity',
          entityId: newActivity.id,
          projectId: newActivity.projectId,
          name: `[Atividade] ${newActivity.description?.substring(0, 80)}`,
          notes: `Tipo: ${newActivity.type}\nData: ${newActivity.date}\nLocal: ${newActivity.location || ''}`,
        });
      }
    },
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
          cost_evidence: activity.costEvidence || null,
          is_draft: activity.isDraft ?? false,
          photo_captions: activity.photoCaptions || {},
          attendance_files: activity.attendanceFiles || [],
          expense_records: activity.expenseRecords || [],
        } as any)
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
    onSuccess: (_, activity) => {
      if (user) {
        logUnified({
          userId: user.id,
          action: 'activity_updated',
          entityType: 'activity',
          entityId: activity.id,
          entityName: activity.description?.substring(0, 60),
          newData: { type: activity.type, date: activity.date },
        });
        if (!activity.isDraft) {
          createAsanaTaskOnPublish({
            entityType: 'activity',
            entityId: activity.id,
            projectId: activity.projectId,
            name: `[Atividade] ${activity.description?.substring(0, 80)}`,
            notes: `Tipo: ${activity.type}\nData: ${activity.date}`,
          });
        }
      }
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
      logUnified({ userId: user.id, action: 'activity_deleted', entityType: 'activities', entityId: id, entityName: a?.description?.substring(0, 100) });
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
