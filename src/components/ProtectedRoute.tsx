import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, currentUser, projects } = useStore();
  const location = useLocation();
  
  // 1. Check Authentication
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // 2. Role Based Logic for Project Setup
  const isPrivileged = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // If no projects exist at all:
  if (projects.length === 0 && location.pathname !== '/setup') {
    // If it is a normal user, force them to setup
    if (!isPrivileged) {
      return <Navigate to="/setup" />;
    }
    // If it is an Admin/SuperAdmin, allow them to proceed
  }
  
  return <>{children}</>;
};
