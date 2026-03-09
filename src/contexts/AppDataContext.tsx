import { ReactNode } from 'react';
import { ProjectProvider, useProjectData } from './ProjectContext';
import { ActivityProvider, useActivityData } from './ActivityContext';

// Re-export for backward compatibility
export const AppDataProvider = ({ children }: { children: ReactNode }) => (
  <ProjectProvider>
    <ActivityProvider>
      {children}
    </ActivityProvider>
  </ProjectProvider>
);

/**
 * Backward-compatible hook that merges both contexts.
 * Prefer useProjectData() or useActivityData() for better perf.
 */
export const useAppData = () => {
  const projectData = useProjectData();
  const activityData = useActivityData();

  return {
    // Projects
    projects: projectData.projects,
    activeProjectId: projectData.activeProjectId,
    activeProject: projectData.activeProject,
    isLoadingProjects: projectData.isLoadingProjects,
    addProject: projectData.addProject,
    updateProject: projectData.updateProject,
    removeProject: projectData.removeProject,
    removeMultipleProjects: projectData.removeMultipleProjects,
    switchProject: projectData.switchProject,
    updateReportData: projectData.updateReportData,

    // Activities
    activities: activityData.activities,
    pagination: activityData.pagination,
    isLoadingActivities: activityData.isLoadingActivities,
    goToPage: activityData.goToPage,
    nextPage: activityData.nextPage,
    prevPage: activityData.prevPage,
    addActivity: activityData.addActivity,
    updateActivity: activityData.updateActivity,
    deleteActivity: activityData.deleteActivity,
  };
};
