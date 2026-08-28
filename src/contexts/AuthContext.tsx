import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
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
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    extraMetadata?: Record<string, string | null | undefined>
  ) => Promise<{ requiresConfirmation: boolean; userId?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
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

const PROFILE_TIMEOUT_MS = 6000;

const withTimeout = async <T,>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .limit(1)
        .maybeSingle(),
      PROFILE_TIMEOUT_MS,
      'Profile fetch'
    );

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
    const baseProfile = { id: userId, role: 'student' as UserRole, account_status: 'approved' as const };
    const profileWithEmail = email ? { ...baseProfile, email } : baseProfile;
    let { data, error } = await withTimeout(
      supabase
        .from('profiles')
        .insert(profileWithEmail)
        .select()
        .single(),
      PROFILE_TIMEOUT_MS,
      'Profile insert'
    );

    if (error && error.message.includes("'email' column")) {
      const retry = await withTimeout(
        supabase
          .from('profiles')
          .insert(baseProfile)
          .select()
          .single(),
        PROFILE_TIMEOUT_MS,
        'Profile insert without email'
      );
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.warn('Profile insert error:', error.message);
      const upsertProfile = error.message.includes("'email' column") ? baseProfile : profileWithEmail;
      const { data: upsertData, error: upsertError } = await withTimeout(
        supabase
          .from('profiles')
          .upsert(upsertProfile, { onConflict: 'id' })
          .select()
          .single(),
        PROFILE_TIMEOUT_MS,
        'Profile upsert'
      );

      if (upsertError) {
        console.warn('Profile upsert error:', upsertError.message);
        return null;
      }

      return upsertData as Profile | null;
    }

    profileData = data as Profile | null;
  }
  
  return profileData;
};

const loadProfileForUser = async (
  userId: string,
  applyProfile: (profile: Profile | null) => void
): Promise<void> => {
  const profileData = await fetchProfile(userId);
  applyProfile(profileData);
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

  const updateState = useCallback((updates: Partial<AuthState> | ((prev: AuthState) => AuthState)) => {
    setState(prev => {
      const patch = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...patch };
    });
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    await loadProfileForUser(userId, (profileData) => {
      updateState({ profile: profileData, userRole: profileData?.role ?? null });
    });
  }, [updateState]);

  const initializeAuth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Session error:', error.message);
        updateState({ isLoading: false });
        return;
      }

      if (session?.user) {
        updateState({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
        });
        void loadProfile(session.user.id);
      } else {
        updateState({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth init error:', error);
      updateState({ isLoading: false });
    }
  }, [loadProfile, updateState]);

  useEffect(() => {
    let mounted = true;
    let authTimeout: ReturnType<typeof setTimeout>;

    const init = async () => {
      authTimeout = setTimeout(() => {
        if (mounted) {
          console.warn('Auth init timeout');
          updateState({ isLoading: false });
        }
      }, 15000);
      await initializeAuth();
      clearTimeout(authTimeout);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        updateState({
          user: null,
          session: null,
          profile: null,
          userRole: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      if (session?.user) {
        updateState({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
        });

        window.setTimeout(() => {
          if (mounted) void loadProfile(session.user.id);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, [initializeAuth, loadProfile, updateState]);

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

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    extraMetadata: Record<string, string | null | undefined> = {}
  ) => {
    updateState(s => ({ ...s, isLoading: true }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          ...extraMetadata,
        },
      },
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

    return { requiresConfirmation: false, userId: data.session.user.id };
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

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!state.user?.email) {
      throw new Error('Unable to verify your account. Sign in again and retry.');
    }

    // Supabase updateUser() does not verify the current password, so confirm it
    // first with a password sign-in for the same account. This also surfaces
    // an honest "wrong password" error before any password is changed.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: state.user.email,
      password: currentPassword,
    });

    if (signInError) {
      const msg = signInError.message.toLowerCase();
      if (msg.includes('invalid') || msg.includes('email or password')) {
        throw new Error('Current password is incorrect.');
      }
      throw signInError;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      if (msg.includes('password')) {
        throw new Error('New password is too weak. Use at least 6 characters with a mix of letters, numbers, and symbols.');
      }
      throw updateError;
    }
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
      changePassword,
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
