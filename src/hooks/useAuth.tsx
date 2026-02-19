import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';
import { logAction } from '@/lib/systemLog';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  lgpd_consent_at: string | null;
  must_change_password: boolean;
  login_attempts_without_change: number;
  first_login_at: string | null;
  last_login_at: string | null;
  password_changed_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  permissions: string[];
  isLoading: boolean;
  hasLgpdConsent: boolean;
  mustChangePassword: boolean;
  isPasswordPolicyBlocked: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>('USUARIO');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTrackedLogin = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (profileData) {
      setProfile(profileData as Profile);
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    
    if (roleData) {
      const roleMap: Record<string, UserRole> = {
        'usuario': 'USUARIO',
        'oficineiro': 'OFICINEIRO',
        'coordenador': 'COORDENADOR',
        'analista': 'ANALISTA',
        'admin': 'ADMIN',
        'super_admin': 'SUPER_ADMIN',
        'user': 'USUARIO',
      };
      setRole(roleMap[roleData.role] || 'USUARIO');
    }

    const { data: permsData } = await supabase
      .from('user_permissions')
      .select('permission')
      .eq('user_id', userId);
    
    if (permsData) {
      setPermissions(permsData.map(p => p.permission));
    }
  }, []);

  // Track login attempt for password policy
  const trackLogin = useCallback(async (userId: string) => {
    if (hasTrackedLogin.current) return;
    hasTrackedLogin.current = true;

    const { data: prof } = await supabase
      .from('profiles')
      .select('must_change_password, login_attempts_without_change, first_login_at')
      .eq('user_id', userId)
      .single();

    if (!prof) return;

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { last_login_at: now };

    if (prof.must_change_password) {
      updates.login_attempts_without_change = (prof.login_attempts_without_change || 0) + 1;
      if (!prof.first_login_at) {
        updates.first_login_at = now;
      }
    }

    await supabase.from('profiles').update(updates).eq('user_id', userId);

    // Log the login
    logAction({ action: 'user_login', entityType: 'user', entityId: userId });

    // Re-fetch to get updated values
    await fetchProfile(userId);
  }, [fetchProfile]);

  // 4h timeout check for forced password change
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!profile?.must_change_password || !profile?.first_login_at) return;

    const check = async () => {
      const elapsed = Date.now() - new Date(profile.first_login_at!).getTime();
      const fourHours = 4 * 60 * 60 * 1000;
      if (elapsed > fourHours) {
        logAction({
          action: 'password_policy_timeout',
          entityType: 'user',
          entityId: user?.id,
          newData: { hours_elapsed: Math.round(elapsed / 3600000) },
        });
        await supabase.auth.signOut();
      }
    };

    check();
    timerRef.current = setInterval(check, 60_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [profile?.must_change_password, profile?.first_login_at, user?.id]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
            if (event === 'SIGNED_IN') {
              trackLogin(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setRole('USUARIO');
          setPermissions([]);
          hasTrackedLogin.current = false;
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, trackLogin]);

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name: name || email.split('@')[0] }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Check if blocked BEFORE signing in
    // We can't check before auth, so we check after
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error && data.user) {
      // Check if blocked by login attempts
      const { data: prof } = await supabase
        .from('profiles')
        .select('must_change_password, login_attempts_without_change')
        .eq('user_id', data.user.id)
        .single();

      if (prof?.must_change_password && (prof.login_attempts_without_change || 0) >= 3) {
        await logAction({
          action: 'password_policy_block',
          entityType: 'user',
          entityId: data.user.id,
          newData: { attempts: prof.login_attempts_without_change, email },
        });
        await supabase.auth.signOut();
        return { error: new Error('Senha temporária expirada. Contate o administrador para redefinir sua senha.') };
      }
    }
    
    return { error };
  };

  const signOut = async () => {
    if (user) {
      logAction({ action: 'user_logout', entityType: 'user', entityId: user.id });
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('USUARIO');
    setPermissions([]);
    hasTrackedLogin.current = false;
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const hasLgpdConsent = !!profile?.lgpd_consent_at;
  const mustChangePassword = !!profile?.must_change_password;
  const isPasswordPolicyBlocked = mustChangePassword && (profile?.login_attempts_without_change || 0) >= 3;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      permissions,
      isLoading,
      hasLgpdConsent,
      mustChangePassword,
      isPasswordPolicyBlocked,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
