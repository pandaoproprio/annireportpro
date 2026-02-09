import { createContext, useContext, ReactNode } from 'react';
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
  allActivities: Activity[];
  isLoadingActivities: boolean;
  addActivity: (activity: Omit<Activity, 'id'>) => Promise<Activity | null>;
  updateActivity: (activity: Activity) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const projectsData = useProjects();
  const activitiesData = useActivities(projectsData.activeProjectId);

  return (
    <AppDataContext.Provider value={{
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
      allActivities: activitiesData.allActivities,
      isLoadingActivities: activitiesData.isLoading,
      addActivity: activitiesData.addActivity,
      updateActivity: activitiesData.updateActivity,
      deleteActivity: activitiesData.deleteActivity
    }}>
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
