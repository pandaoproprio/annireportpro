import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface GlobalStats {
  totalProjects: number;
  totalActivities: number;
  totalAttendees: number;
  totalGoals: number;
  activitiesByType: Record<string, number>;
  activitiesByProject: Record<string, { name: string; count: number; attendees: number }>;
  activitiesByMonth: Record<string, number>;
  recentActivities: Array<{ id: string; date: string; description: string; projectName: string }>;
  draftCount: number;
}

async function fetchGlobalStats(): Promise<GlobalStats> {
  // Fetch all projects
  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('id, name, goals, start_date, end_date');
  if (pErr) throw pErr;

  const projectMap = new Map(
    (projects || []).map(p => [p.id, p.name])
  );

  // Fetch all activities (paginate up to 5000)
  const allActivities: any[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('activities')
      .select('id, project_id, date, type, description, attendees_count, is_draft, goal_id')
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allActivities.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const activitiesByType: Record<string, number> = {};
  const activitiesByProject: Record<string, { name: string; count: number; attendees: number }> = {};
  const activitiesByMonth: Record<string, number> = {};
  let totalAttendees = 0;
  let draftCount = 0;

  for (const a of allActivities) {
    // by type
    activitiesByType[a.type] = (activitiesByType[a.type] || 0) + 1;

    // by project
    const pName = projectMap.get(a.project_id) || 'Desconhecido';
    if (!activitiesByProject[a.project_id]) {
      activitiesByProject[a.project_id] = { name: pName, count: 0, attendees: 0 };
    }
    activitiesByProject[a.project_id].count += 1;
    activitiesByProject[a.project_id].attendees += a.attendees_count || 0;

    // by month
    const monthKey = a.date?.substring(0, 7); // yyyy-MM
    if (monthKey) {
      activitiesByMonth[monthKey] = (activitiesByMonth[monthKey] || 0) + 1;
    }

    totalAttendees += a.attendees_count || 0;
    if (a.is_draft) draftCount++;
  }

  // Total goals across all projects
  const totalGoals = (projects || []).reduce((sum, p) => {
    const goals = Array.isArray(p.goals) ? p.goals : [];
    return sum + goals.length;
  }, 0);

  const recentActivities = allActivities.slice(0, 10).map(a => ({
    id: a.id,
    date: a.date,
    description: a.description,
    projectName: projectMap.get(a.project_id) || 'Desconhecido',
  }));

  return {
    totalProjects: projects?.length || 0,
    totalActivities: allActivities.length,
    totalAttendees,
    totalGoals,
    activitiesByType,
    activitiesByProject,
    activitiesByMonth,
    recentActivities,
    draftCount,
  };
}

export function useGlobalStats(enabled: boolean) {
  return useQuery({
    queryKey: ['global-stats'],
    queryFn: fetchGlobalStats,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
