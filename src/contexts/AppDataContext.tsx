import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useActivities } from '@/hooks/useActivities';
import { Project, Activity, ReportData } from '@/types';

interface AppDataContextType {
  // Projects
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
  
  // Activities
  activities: Activity[];
  pagination: { page: number; pageSize: number; total: number };
  isLoadingActivities: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  addActivity: (activity: Omit<Activity, 'id'>) => Promise<Activity | null>;
  updateActivity: (activity: Activity) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const projectsData = useProjects();
  const activitiesData = useActivities(projectsData.activeProjectId);

  const value = useMemo<AppDataContextType>(() => ({
    // Projects
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
    
    // Activities
    activities: activitiesData.activities,
    pagination: activitiesData.pagination,
    isLoadingActivities: activitiesData.isLoading,
    goToPage: activitiesData.goToPage,
    nextPage: activitiesData.nextPage,
    prevPage: activitiesData.prevPage,
    addActivity: activitiesData.addActivity,
    updateActivity: activitiesData.updateActivity,
    deleteActivity: activitiesData.deleteActivity,
  }), [projectsData, activitiesData]);

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export { AppDataContext };
