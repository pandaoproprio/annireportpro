import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMfa } from '@/hooks/useMfa';
import { Loader2, ShieldOff } from 'lucide-react';
import { MfaSetupDialog } from '@/components/MfaSetupDialog';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const MFA_EXEMPT_PATHS = ['/consentimento', '/change-password', '/mfa-verify'];
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, role, hasLgpdConsent, profile, mustChangePassword, signOut } = useAuth();
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

  // Block suspended users
  if (profile.suspended_at) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldOff className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Acesso Suspenso</h1>
          <p className="text-muted-foreground">
            Seu acesso foi temporariamente suspenso por inatividade prolongada. Entre em contato com o administrador do sistema para reativação.
          </p>
          <button
            onClick={() => signOut()}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sair
          </button>
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

    // Check if user has a temporary MFA exemption
    const mfaExemptUntil = (profile as any)?.mfa_exempt_until;
    const isMfaExempt = mfaExemptUntil && new Date(mfaExemptUntil) > new Date();

    // If admin without MFA enrolled, force setup (unless exempt)
    if (ADMIN_ROLES.includes(role) && !isEnrolled && !isMfaExempt) {
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
