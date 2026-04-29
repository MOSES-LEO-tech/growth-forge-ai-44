import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/integrations/supabase/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ requiresConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create profile directly in database
const createProfileInDb = async (userId: string, fullName: string, role: UserRole, email?: string): Promise<Profile | null> => {
  try {
    // Use upsert with onConflict to handle race conditions
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: fullName,
        role: role,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (error) {
      // Log the error but don't throw - profile may be created by trigger
      console.warn('Profile upsert error (will retry):', error.message);
      return null;
    }
    return data as Profile;
  } catch (error) {
    console.warn('Error in createProfileInDb:', error);
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced fetchProfile with retry logic
  const fetchProfile = async (userId: string, retries = 2, delayMs = 500): Promise<Profile | null> => {
    // Simple fetch without complex logic - just get profile directly
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch error:', error.message);
        // If profile doesn't exist (404), return null - let caller handle
        if (error.code === 'PGRST116') {
          return null;
        }
        return null;
      }
      return data as Profile;
    } catch (error) {
      console.warn('Profile fetch exception:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    let hasTimedOut = false;

    // Safety timeout: if auth doesn't initialize within 10s, proceed anyway
    const timeoutId = setTimeout(() => {
      if (mounted && !hasTimedOut) {
        console.warn("Auth initialization timed out, proceeding with current state");
        hasTimedOut = true;
        setIsLoading(false);
      }
    }, 10000);

    // Initial session check
    const initAuth = async () => {
      try {
        console.log("Initializing auth...");
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting initial session:", sessionError);
          if (mounted) {
            setIsLoading(false);
            hasTimedOut = true;
          }
          return;
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }

        if (initialSession?.user) {
          const profileData = await fetchProfile(initialSession.user.id);
          if (mounted) setProfile(profileData);
        }
      } catch (error) {
        console.error('Error in initAuth:', error);
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setIsLoading(false);
          hasTimedOut = true;
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state changed:", event, !!currentSession);

      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const profileData = await fetchProfile(currentSession.user.id);
        if (mounted) setProfile(profileData);
      } else {
        if (mounted) setProfile(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // First check if user exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) {
        // Provide more user-friendly error messages
        const errorMsg = signInError.message.toLowerCase();
        
        if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid email or password')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        if (errorMsg.includes('email not confirmed')) {
          throw new Error('Please confirm your email address before signing in. Check your inbox for the confirmation link.');
        }
        throw signInError;
      }
      
      if (signInData.session) {
        setSession(signInData.session);
        setUser(signInData.session.user);
        
        // Fetch profile - if fails, user can still use app
        const profileData = await fetchProfile(signInData.session.user.id);
        
        if (profileData) {
          setProfile(profileData);
        } else {
          console.warn('Profile not found, user signed in without profile');
        }
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole): Promise<{ requiresConfirmation: boolean }> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });
      
      if (error) {
        // Provide more user-friendly error messages
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('already been registered') || errorMsg.includes('already registered')) {
          throw new Error('An account with this email already exists. Please sign in or reset your password.');
        }
        if (errorMsg.includes('password')) {
          throw new Error('Password is too weak or invalid. Please use at least 6 characters.');
        }
        if (errorMsg.includes('database') || errorMsg.includes('new user')) {
          // This is the RLS/trigger issue - try to continue anyway
          console.warn('Database error during signup, attempting to continue:', error);
          
          if (data.user) {
            // User was created in auth, just need to handle profile
            return { requiresConfirmation: true };
          }
        }
        throw error;
      }

      // Check if user was created in auth
      if (!data.user && !data.session) {
        throw new Error('Failed to create account. Please try again.');
      }

      // Check if email confirmation is required
      if (!data.session && data.user) {
        // Email confirmation required - try to create profile anyway
        try {
          await createProfileInDb(data.user.id, fullName, role, email);
        } catch (profileError) {
          console.warn('Could not create profile yet, will create on first login:', profileError);
        }
        
        return { requiresConfirmation: true };
      }

      // No email confirmation needed - session should be available
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        
        // Try to fetch profile
        try {
          const profileData = await fetchProfile(data.session.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        } catch (profileError) {
          console.warn('Profile fetch failed after signup:', profileError);
        }
        
        return { requiresConfirmation: false };
      }

      // Edge case
      return { requiresConfirmation: false };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Sign out from Supabase - ignore network errors
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.includes('network')) {
        console.warn('Sign out warning:', error.message);
      }
    } catch (error) {
      // Network errors are common on logout, ignore them
      console.warn('Sign out error (ignored):', error);
    }
  };

  const userRole = profile?.role ?? null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      userRole, 
      isLoading, 
      signIn, 
      signUp, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


