import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, getCurrentUser } from '@/integrations/supabase/client';
import type { User, Session, AuthToken } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/integrations/supabase/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ needsProfileCompletion: boolean }>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ requiresConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 0,
  parent: 1,
  teacher: 2,
  admin: 3,
  super_admin: 4,
};

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.warn('Profile fetch error:', error.message);
      return null;
    }
    return data as Profile;
  } catch (error) {
    console.warn('Profile fetch exception:', error);
    return null;
  }
};

const ensureProfile = async (userId: string, email?: string): Promise<Profile | null> => {
  let profileData = await fetchProfile(userId);
  
  if (!profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId, email, role: 'student' })
      .select()
      .single();

    if (error) {
      console.warn('Profile insert error:', error.message);
      const { data: upsertData } = await supabase
        .from('profiles')
        .upsert({ id: userId, email, role: 'student' }, { onConflict: 'id' })
        .select()
        .single();
      return upsertData as Profile | null;
    }
    profileData = data as Profile | null;
  }
  
  return profileData;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    userRole: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session error:', error.message);
        updateState({ isLoading: false });
        return;
      }

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        updateState({
          user: session.user,
          session,
          profile: profileData,
          userRole: profileData?.role ?? null,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth init error:', error);
      updateState({ isLoading: false });
    }
  }, [updateState]);

  useEffect(() => {
    let mounted = true;
    let authTimeout: ReturnType<typeof setTimeout>;

    const init = async () => {
      authTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth init timeout');
          updateState({ isLoading: false });
        }
      }, 8000);
      await initializeAuth();
      clearTimeout(authTimeout);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        updateState({
          user: null,
          session: null,
          profile: null,
          userRole: null,
          isAuthenticated: false,
        });
        return;
      }

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        updateState({
          user: session.user,
          session,
          profile: profileData,
          userRole: profileData?.role ?? null,
          isAuthenticated: true,
        });
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, [initializeAuth, updateState]);

  const signIn = async (email: string, password: string) => {
    updateState(s => ({ ...s, isLoading: true }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        updateState(s => ({ ...s, isLoading: false }));
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid') || msg.includes('email or password')) {
          throw new Error('Invalid email or password');
        }
        if (msg.includes('email not confirmed')) {
          throw new Error('Please confirm your email first');
        }
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('quic')) {
          throw new Error('Unable to connect. Check your internet connection and try again.');
        }
        throw error;
      }

      if (data.session) {
        let profileData = await fetchProfile(data.session.user.id);
        const needsProfileCompletion = !profileData;
        
        if (needsProfileCompletion && data.session.user.email) {
          profileData = await ensureProfile(data.session.user.id, data.session.user.email);
        }

        updateState({
          user: data.session.user,
          session: data.session,
          profile: profileData,
          userRole: profileData?.role ?? null,
          isAuthenticated: true,
          isLoading: false,
        });

        return { needsProfileCompletion };
      }

      updateState(s => ({ ...s, isLoading: false }));
      throw new Error('Sign in failed');
    } catch (err) {
      updateState(s => ({ ...s, isLoading: false }));
      const msg = err instanceof Error ? err.message : 'Connection error';
      if (!msg.includes('network') && !msg.includes('fetch') && !msg.includes('quic')) {
        throw err;
      }
      throw new Error('Unable to connect. Check your internet connection and try again.');
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole) => {
    updateState(s => ({ ...s, isLoading: true }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    if (error) {
      updateState(s => ({ ...s, isLoading: false }));
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered')) {
        throw new Error('Account already exists');
      }
      if (msg.includes('password')) {
        throw new Error('Password too weak');
      }
      throw error;
    }

    if (!data.user && !data.session) {
      updateState(s => ({ ...s, isLoading: false }));
      throw new Error('Sign up failed');
    }

    updateState(s => ({ ...s, isLoading: false }));

    if (!data.session && data.user) {
      if (data.user.email) {
        await ensureProfile(data.user.id, data.user.email);
      }
      return { requiresConfirmation: true };
    }

    if (data.session) {
      let profileData = await fetchProfile(data.session.user.id);
      if (!profileData) {
        profileData = await ensureProfile(data.session.user.id, data.session.user.email);
      }
      updateState({
        user: data.session.user,
        session: data.session,
        profile: profileData,
        userRole: profileData?.role ?? null,
        isAuthenticated: true,
        isLoading: false,
      });
    }

    return { requiresConfirmation: false };
  };

  const signOut = async () => {
    updateState(s => ({ ...s, isLoading: true }));
    
    await supabase.auth.signOut();
    
    updateState({
      user: null,
      session: null,
      profile: null,
      userRole: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const profileData = await fetchProfile(state.user.id);
    updateState({ profile: profileData, userRole: profileData?.role ?? null });
  };

  const hasPermission = useCallback((requiredRole: UserRole | UserRole[]): boolean => {
    if (!state.userRole) return false;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const userLevel = ROLE_HIERARCHY[state.userRole];
    return roles.some(role => ROLE_HIERARCHY[role] <= userLevel);
  }, [state.userRole]);

  return (
    <AuthContext.Provider value={{
      ...state,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export type { UserRole };