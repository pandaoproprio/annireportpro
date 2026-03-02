import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMfa } from '@/hooks/useMfa';
import { Loader2 } from 'lucide-react';
import { MfaSetupDialog } from '@/components/MfaSetupDialog';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const MFA_EXEMPT_PATHS = ['/consentimento', '/change-password', '/mfa-verify'];
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, role, hasLgpdConsent, profile, mustChangePassword } = useAuth();
  const { isEnrolled, needsVerification, isLoading: mfaLoading, refreshMfa } = useMfa(user?.id);
  const location = useLocation();
  const [showMfaSetup, setShowMfaSetup] = useState(false);

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

  // Redirect to LGPD consent if needed
  if (!hasLgpdConsent && location.pathname !== '/consentimento') {
    if (!profile.lgpd_consent_at) {
      return <Navigate to="/consentimento" replace />;
    }
  }

  // Force password change redirect (skip if already on the page)
  if (mustChangePassword && location.pathname !== '/change-password' && location.pathname !== '/consentimento') {
    return <Navigate to="/change-password" replace />;
  }

  // MFA checks (skip on exempt paths)
  if (!MFA_EXEMPT_PATHS.includes(location.pathname) && !mfaLoading) {
    // If MFA enrolled but not verified (AAL1), redirect to verify page
    if (needsVerification) {
      return <Navigate to="/mfa-verify" replace />;
    }

    // If admin without MFA enrolled, force setup
    if (ADMIN_ROLES.includes(role) && !isEnrolled) {
      return (
        <>
          {children}
          <MfaSetupDialog
            open={!showMfaSetup ? true : showMfaSetup}
            onOpenChange={() => {}}
            mandatory
            onSuccess={refreshMfa}
          />
        </>
      );
    }
  }

  return <>{children}</>;
};
