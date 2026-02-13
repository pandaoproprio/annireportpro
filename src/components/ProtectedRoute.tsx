import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, role, hasLgpdConsent } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Redirect to LGPD consent if not yet accepted
  if (!hasLgpdConsent && location.pathname !== '/consentimento') {
    return <Navigate to="/consentimento" replace />;
  }

  // Oficineiro users can only access the Diário de Bordo
  const isDiaryRoute = location.pathname.startsWith('/diario');
  if (role === 'OFICINEIRO' && !isDiaryRoute) {
    return <Navigate to="/diario" replace />;
  }

  return <>{children}</>;
};
