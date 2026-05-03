import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { useProjectData } from './ProjectContext';
import { Activity } from '@/types';

interface ActivityContextType {
  activities: Activity[];
  pagination: { page: number; pageSize: number; total: number };
  isLoadingActivities: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  addActivity: (activity: Omit<Activity, 'id'> & { targetUserId?: string }) => Promise<Activity | null>;
  updateActivity: (activity: Activity) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  linkActivitiesToGoal: (goalId: string | null, activityIds: string[]) => Promise<boolean>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider = ({ children }: { children: ReactNode }) => {
  const { activeProjectId } = useProjectData();
  const activitiesData = useActivities(activeProjectId);

  const value = useMemo<ActivityContextType>(() => ({
    activities: activitiesData.activities,
    pagination: activitiesData.pagination,
    isLoadingActivities: activitiesData.isLoading,
    goToPage: activitiesData.goToPage,
    nextPage: activitiesData.nextPage,
    prevPage: activitiesData.prevPage,
    addActivity: activitiesData.addActivity,
    updateActivity: activitiesData.updateActivity,
    deleteActivity: activitiesData.deleteActivity,
  }), [activitiesData]);

  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivityData = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivityData must be used within an ActivityProvider');
  }
  return context;
};
