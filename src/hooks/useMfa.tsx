import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MfaState {
  isEnrolled: boolean;
  isVerified: boolean; // AAL2 achieved
  isLoading: boolean;
  needsVerification: boolean; // enrolled but AAL1 only
  refreshMfa: () => Promise<void>;
}

export const useMfa = (userId: string | undefined): MfaState => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkMfa = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // Check enrolled factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedFactor = factors?.totp?.some(f => f.status === 'verified') ?? false;
      setIsEnrolled(hasVerifiedFactor);

      // Check current AAL level
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const currentAal = aal?.currentLevel ?? 'aal1';
      setIsVerified(currentAal === 'aal2');
    } catch {
      setIsEnrolled(false);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkMfa();
  }, [checkMfa]);

  return {
    isEnrolled,
    isVerified,
    isLoading,
    needsVerification: isEnrolled && !isVerified,
    refreshMfa: checkMfa,
  };
};
