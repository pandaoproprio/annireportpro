import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppContextType, AppState, Project, Activity, ReportData, UserRole } from '@/types';

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = 'social_impact_app_v1';

const initialState: AppState = {
  isAuthenticated: false,
  currentUser: null,
  projects: [],
  activeProjectId: null,
  activities: [],
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        
        let projects = parsed.projects || [];
        let activeProjectId = parsed.activeProjectId;

        // MIGRATION: Legacy 'project' to 'projects' array
        if (parsed.project && projects.length === 0) {
          const legacyProject = parsed.project;
          if (!legacyProject.id) legacyProject.id = Date.now().toString();
          projects = [legacyProject];
          activeProjectId = legacyProject.id;
        }

        // Safety: Ensure valid activeProjectId
        if (projects.length > 0) {
          const isValidId = projects.some((p: Project) => p.id === activeProjectId);
          if (!activeProjectId || !isValidId) {
            activeProjectId = projects[0].id;
          }
        }

        setState({
          ...initialState,
          ...parsed,
          projects,
          activeProjectId,
        });
      } catch (e) {
        console.error("Failed to parse stored state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // --- ACTIONS ---

  const addProject = (project: Project) => {
    setState(prev => ({
      ...prev,
      projects: [...prev.projects, project],
      activeProjectId: project.id
    }));
  };

  const switchProject = (id: string) => {
    setState(prev => ({
      ...prev,
      activeProjectId: id
    }));
  };

  const removeProject = (id: string) => {
    setState(prev => {
      const newProjects = prev.projects.filter(p => p.id !== id);
      let newActiveId = prev.activeProjectId;
      if (id === prev.activeProjectId) {
        newActiveId = newProjects.length > 0 ? newProjects[0].id : null;
      }
      return {
        ...prev,
        projects: newProjects,
        activeProjectId: newActiveId,
      };
    });
  };

  const setProject = (updatedProject: Project) => {
    setState((prev) => ({ 
      ...prev, 
      projects: prev.projects.map(p => p.id === updatedProject.id ? updatedProject : p)
    }));
  };

  const addActivity = (activity: Activity) => {
    setState((prev) => ({ ...prev, activities: [activity, ...prev.activities] }));
  };

  const updateActivity = (activity: Activity) => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => (a.id === activity.id ? activity : a)),
    }));
  };

  const deleteActivity = (id: string) => {
    setState((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a.id !== id),
    }));
  };

  const updateReportData = (data: Partial<ReportData>) => {
    setState((prev) => {
      if (!prev.activeProjectId) return prev;
      
      const activeProject = prev.projects.find(p => p.id === prev.activeProjectId);
      if (!activeProject) return prev;

      const updatedProject = {
        ...activeProject,
        reportData: {
          ...activeProject.reportData,
          ...data
        }
      };

      return {
        ...prev,
        projects: prev.projects.map(p => p.id === prev.activeProjectId ? updatedProject : p)
      };
    });
  };

  const resetApp = () => {
    setState(initialState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const login = (email: string) => {
    let role: UserRole = 'USER';
    if (email.toLowerCase().includes('admin')) role = 'ADMIN';
    if (email.toLowerCase().includes('super')) role = 'SUPER_ADMIN';

    const name = email.split('@')[0];
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

    setState(prev => ({ 
      ...prev, 
      isAuthenticated: true,
      currentUser: {
        email,
        name: formattedName,
        role
      }
    }));
  };

  const logout = () => {
    setState(prev => ({ ...prev, isAuthenticated: false, currentUser: null }));
  };

  // --- DERIVED STATE ---
  const activeProject = state.projects.find(p => p.id === state.activeProjectId) || null;
  const currentProjectActivities = state.activities.filter(a => a.projectId === state.activeProjectId);

  if (!isLoaded) return null;

  return (
    <AppContext.Provider value={{ 
      ...state, 
      project: activeProject,
      activities: currentProjectActivities,
      allActivities: state.activities,
      setProject, 
      addProject,
      switchProject,
      removeProject,
      addActivity, 
      updateActivity, 
      deleteActivity, 
      resetApp, 
      updateReportData, 
      login, 
      logout 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useStore must be used within an AppProvider');
  }
  return context;
};
