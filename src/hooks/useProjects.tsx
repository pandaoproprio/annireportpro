import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Project, Goal, TeamMember, ReportData } from '@/types';
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

export const useProjects = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setActiveProjectId(null);
      setIsLoading(false);
      return;
    }

    // Fetch own projects
    const { data: ownData, error: ownError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch collaborator project IDs
    const { data: collabLinks } = await supabase
      .from('project_collaborators')
      .select('project_id')
      .eq('user_id', user.id);

    let collabData: DbProject[] = [];
    if (collabLinks && collabLinks.length > 0) {
      const collabIds = collabLinks.map(c => c.project_id);
      const { data: cp } = await supabase
        .from('projects')
        .select('*')
        .in('id', collabIds);
      if (cp) collabData = cp as DbProject[];
    }

    const error = ownError;
    const data = [
      ...((ownData as DbProject[]) || []),
      ...collabData.filter(c => !(ownData || []).some(o => o.id === c.id)),
    ];

    if (error) {
      console.error('Error fetching projects:', error);
      setIsLoading(false);
      return;
    }

    const mappedProjects = (data as DbProject[]).map(mapDbToProject);
    setProjects(mappedProjects);
    
    if (mappedProjects.length > 0 && !activeProjectId) {
      setActiveProjectId(mappedProjects[0].id);
    }
    
    setIsLoading(false);
  }, [user, activeProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (project: Omit<Project, 'id'>) => {
    if (!user) return null;

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

    if (error) {
      console.error('Error adding project:', error);
      return null;
    }

    const newProject = mapDbToProject(data as DbProject);
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
    return newProject;
  };

  const updateProject = async (project: Project) => {
    if (!user) return;

    const { error } = await supabase
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
      .eq('id', project.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating project:', error);
      return;
    }

    setProjects(prev => prev.map(p => p.id === project.id ? project : p));
  };

  const removeProject = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing project:', error);
      return;
    }

    setProjects(prev => {
      const newProjects = prev.filter(p => p.id !== id);
      if (id === activeProjectId) {
        setActiveProjectId(newProjects.length > 0 ? newProjects[0].id : null);
      }
      return newProjects;
    });
  };

  const removeMultipleProjects = async (ids: string[]) => {
    if (!user || ids.length === 0) return;

    const { error } = await supabase
      .from('projects')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing projects:', error);
      throw error;
    }

    setProjects(prev => {
      const newProjects = prev.filter(p => !ids.includes(p.id));
      if (activeProjectId && ids.includes(activeProjectId)) {
        setActiveProjectId(newProjects.length > 0 ? newProjects[0].id : null);
      }
      return newProjects;
    });
  };

  const switchProject = (id: string) => {
    setActiveProjectId(id);
  };

  const updateReportData = async (data: Partial<ReportData>) => {
    const activeProject = projects.find(p => p.id === activeProjectId);
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      reportData: {
        ...activeProject.reportData,
        ...data
      }
    };

    await updateProject(updatedProject);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  return {
    projects,
    activeProjectId,
    activeProject,
    isLoading,
    addProject,
    updateProject,
    removeProject,
    removeMultipleProjects,
    switchProject,
    updateReportData,
    refetch: fetchProjects
  };
};
