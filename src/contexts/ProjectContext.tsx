import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { Project, ReportData } from '@/types';

interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  isLoadingProjects: boolean;
  addProject: (project: Omit<Project, 'id'>) => Promise<Project | null>;
  updateProject: (project: Project) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  removeMultipleProjects: (ids: string[]) => Promise<void>;
  switchProject: (id: string) => void;
  updateReportData: (data: Partial<ReportData>) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const projectsData = useProjects();

  const value = useMemo<ProjectContextType>(() => ({
    projects: projectsData.projects,
    activeProjectId: projectsData.activeProjectId,
    activeProject: projectsData.activeProject,
    isLoadingProjects: projectsData.isLoading,
    addProject: projectsData.addProject,
    updateProject: projectsData.updateProject,
    removeProject: projectsData.removeProject,
    removeMultipleProjects: projectsData.removeMultipleProjects,
    switchProject: projectsData.switchProject,
    updateReportData: projectsData.updateReportData,
  }), [projectsData]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectData = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectData must be used within a ProjectProvider');
  }
  return context;
};
