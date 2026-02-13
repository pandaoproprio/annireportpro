import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Project, Goal, TeamMember, ReportData } from '@/types';
import { logAuditEvent } from '@/lib/auditLog';
import { Json } from '@/integrations/supabase/types';

interface DbProject {
  id: string;
  user_id: string;
  organization_name: string;
  organization_address: string | null;
  organization_website: string | null;
  organization_email: string | null;
  organization_phone: string | null;
  name: string;
  fomento_number: string;
  funder: string;
  start_date: string;
  end_date: string;
  object: string;
  summary: string;
  goals: Json;
  team: Json;
  locations: string[];
  report_data: Json;
  created_at: string;
  updated_at: string;
}

const mapDbToProject = (db: DbProject): Project => ({
  id: db.id,
  organizationName: db.organization_name,
  organizationAddress: db.organization_address || undefined,
  organizationWebsite: db.organization_website || undefined,
  organizationEmail: db.organization_email || undefined,
  organizationPhone: db.organization_phone || undefined,
  name: db.name,
  fomentoNumber: db.fomento_number,
  funder: db.funder,
  startDate: db.start_date,
  endDate: db.end_date,
  object: db.object,
  summary: db.summary,
  goals: (Array.isArray(db.goals) ? db.goals as unknown as Goal[] : []),
  team: (Array.isArray(db.team) ? db.team as unknown as TeamMember[] : []),
  locations: db.locations || [],
  reportData: (db.report_data as ReportData) || {}
});

const fetchProjectsFromDb = async (
  userId: string,
  isAdmin: boolean,
  page: number,
  pageSize: number
): Promise<{ projects: Project[]; total: number }> => {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  if (isAdmin) {
    const { data, error, count } = await supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return {
      projects: ((data as DbProject[]) || []).map(mapDbToProject),
      total: count || 0,
    };
  }

  // Regular users: own + collaborator projects
  const { data: ownData, error: ownError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ownError) throw ownError;

  const { data: collabLinks } = await supabase
    .from('project_collaborators')
    .select('project_id')
    .eq('user_id', userId);

  let collabData: DbProject[] = [];
  if (collabLinks && collabLinks.length > 0) {
    const collabIds = collabLinks.map(c => c.project_id);
    const { data: cp } = await supabase
      .from('projects')
      .select('*')
      .in('id', collabIds);
    if (cp) collabData = cp as DbProject[];
  }

  const allUserProjects = [
    ...((ownData as DbProject[]) || []),
    ...collabData.filter(c => !(ownData || []).some(o => o.id === c.id)),
  ];

  return {
    projects: allUserProjects.slice(from, to + 1).map(mapDbToProject),
    total: allUserProjects.length,
  };
};

export const useProjects = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['projects', user?.id, isAdmin, page, pageSize],
    queryFn: () => fetchProjectsFromDb(user!.id, isAdmin, page, pageSize),
    enabled: !!user,
    staleTime: 30_000,
  });

  const projects = data?.projects || [];
  const total = data?.total || 0;

  // Auto-select first project
  if (projects.length > 0 && !activeProjectId) {
    setActiveProjectId(projects[0].id);
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['projects'] });

  const addProjectMutation = useMutation({
    mutationFn: async (project: Omit<Project, 'id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          organization_name: project.organizationName,
          organization_address: project.organizationAddress || null,
          organization_website: project.organizationWebsite || null,
          organization_email: project.organizationEmail || null,
          organization_phone: project.organizationPhone || null,
          name: project.name,
          fomento_number: project.fomentoNumber,
          funder: project.funder,
          start_date: project.startDate,
          end_date: project.endDate,
          object: project.object,
          summary: project.summary,
          goals: project.goals as unknown as Json,
          team: project.team as unknown as Json,
          locations: project.locations,
          report_data: (project.reportData || {}) as unknown as Json
        })
        .select()
        .single();
      if (error) throw error;
      return mapDbToProject(data as DbProject);
    },
    onSuccess: (newProject) => {
      invalidate();
      setActiveProjectId(newProject.id);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (project: Project) => {
      if (!user) throw new Error('Not authenticated');
      let query = supabase
        .from('projects')
        .update({
          organization_name: project.organizationName,
          organization_address: project.organizationAddress || null,
          organization_website: project.organizationWebsite || null,
          organization_email: project.organizationEmail || null,
          organization_phone: project.organizationPhone || null,
          name: project.name,
          fomento_number: project.fomentoNumber,
          funder: project.funder,
          start_date: project.startDate,
          end_date: project.endDate,
          object: project.object,
          summary: project.summary,
          goals: project.goals as unknown as Json,
          team: project.team as unknown as Json,
          locations: project.locations,
          report_data: (project.reportData || {}) as unknown as Json
        })
        .eq('id', project.id);
      if (!isAdmin) query = query.eq('user_id', user.id);
      const { error } = await query;
      if (error) throw error;
    },
    onMutate: async (project) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['projects'] });
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old?.projects) return old;
        return { ...old, projects: old.projects.map((p: Project) => p.id === project.id ? project : p) };
      });
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => invalidate(),
  });

  const removeProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      let query = supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (!isAdmin) query = query.eq('user_id', user.id);
      const { error } = await query;
      if (error) throw error;
      const p = projects.find(p => p.id === id);
      await logAuditEvent({ userId: user.id, action: 'DELETE', entityType: 'projects', entityId: id, entityName: p?.name });
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['projects'] });
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old?.projects) return old;
        return { ...old, projects: old.projects.filter((p: Project) => p.id !== id), total: Math.max(0, (old.total || 0) - 1) };
      });
      return { previousData };
    },
    
    onSuccess: (id) => {
      if (id === activeProjectId) {
        const remaining = projects.filter(p => p.id !== id);
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
      }
    },
    onError: (_err, _vars, context) => {
      context?.previousData?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => invalidate(),
  });

  const removeMultipleProjectsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user || ids.length === 0) throw new Error('Invalid');
      let query = supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids);
      if (!isAdmin) query = query.eq('user_id', user.id);
      const { error } = await query;
      if (error) throw error;
      const toDelete = projects.filter(p => ids.includes(p.id));
      for (const p of toDelete) {
        await logAuditEvent({ userId: user.id, action: 'DELETE', entityType: 'projects', entityId: p.id, entityName: p.name });
      }
      return ids;
    },
    onSuccess: (ids) => {
      if (activeProjectId && ids.includes(activeProjectId)) {
        const remaining = projects.filter(p => !ids.includes(p.id));
        setActiveProjectId(remaining.length > 0 ? remaining[0].id : null);
      }
      invalidate();
    },
  });

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const updateReportData = async (reportData: Partial<ReportData>) => {
    if (!activeProject) return;
    await updateProjectMutation.mutateAsync({
      ...activeProject,
      reportData: { ...activeProject.reportData, ...reportData },
    });
  };

  const pagination = { page, pageSize, total };

  const goToPage = (p: number) => setPage(p);
  const nextPage = () => {
    const maxPage = Math.ceil(total / pageSize) - 1;
    if (page < maxPage) setPage(page + 1);
  };
  const prevPage = () => { if (page > 0) setPage(page - 1); };

  return {
    projects,
    activeProjectId,
    activeProject,
    isLoading,
    pagination,
    goToPage,
    nextPage,
    prevPage,
    addProject: async (project: Omit<Project, 'id'>) => {
      try { return await addProjectMutation.mutateAsync(project); } catch { return null; }
    },
    updateProject: async (project: Project) => {
      try { await updateProjectMutation.mutateAsync(project); } catch { /* handled */ }
    },
    removeProject: async (id: string) => {
      try { await removeProjectMutation.mutateAsync(id); } catch { /* handled */ }
    },
    removeMultipleProjects: async (ids: string[]) => {
      try { await removeMultipleProjectsMutation.mutateAsync(ids); } catch { throw ids; }
    },
    switchProject: (id: string) => setActiveProjectId(id),
    updateReportData,
    refetch: () => invalidate(),
  };
};
