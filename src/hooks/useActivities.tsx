import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Activity, ActivityType } from '@/types';
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

export const useActivities = (projectId: string | null) => {
  const { user, role } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    if (!user) {
      setActivities([]);
      setAllActivities([]);
      setIsLoading(false);
      return;
    }

    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    let query = supabase
      .from('activities')
      .select('*');

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      setIsLoading(false);
      return;
    }

    const mappedActivities = (data as DbActivity[]).map(mapDbToActivity);
    setAllActivities(mappedActivities);
    
    if (projectId) {
      setActivities(mappedActivities.filter(a => a.projectId === projectId));
    } else {
      setActivities([]);
    }
    
    setIsLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (projectId) {
      setActivities(allActivities.filter(a => a.projectId === projectId));
    } else {
      setActivities([]);
    }
  }, [projectId, allActivities]);

  const addActivity = async (activity: Omit<Activity, 'id'>) => {
    if (!user) return null;

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

    if (error) {
      console.error('Error adding activity:', error);
      return null;
    }

    const newActivity = mapDbToActivity(data as DbActivity);
    setAllActivities(prev => [newActivity, ...prev]);
    return newActivity;
  };

  const updateActivity = async (activity: Activity) => {
    if (!user) return;

    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

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

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error updating activity:', error);
      return;
    }

    setAllActivities(prev => prev.map(a => a.id === activity.id ? activity : a));
  };

  const deleteActivity = async (id: string) => {
    if (!user) return;

    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    let query = supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('user_id', user.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting activity:', error);
      return;
    }

    setAllActivities(prev => prev.filter(a => a.id !== id));
  };

  return {
    activities,
    allActivities,
    isLoading,
    addActivity,
    updateActivity,
    deleteActivity,
    refetch: fetchActivities
  };
};
