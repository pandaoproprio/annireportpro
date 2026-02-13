import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, role, hasLgpdConsent, profile } = useAuth();
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

  // Wait for profile to load before checking consent
  if (!profile) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // Redirect to LGPD consent only when profile is loaded and consent is missing
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
