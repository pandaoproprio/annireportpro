import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, role } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // 1. Check Authentication
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Oficineiro users can only access the Diário de Bordo
  const isDiaryRoute = location.pathname.startsWith('/diario');
  if (role === 'OFICINEIRO' && !isDiaryRoute) {
    return <Navigate to="/diario" replace />;
  }

  return <>{children}</>;
};
