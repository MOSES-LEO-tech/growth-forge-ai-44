import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (_userId: string) => {
    // Auth disabled: provide a default guest profile
    const now = new Date().toISOString();
    const guest: Profile = {
      id: "00000000-0000-0000-0000-000000000000" as any,
      role: "student" as any,
      full_name: "Guest",
      age: null as any,
      grade_level: null as any,
      school_id: null as any,
      avatar_url: null as any,
      bio: null as any,
      created_at: now as any,
      updated_at: now as any,
    };
    setProfile(guest);
  }, []);

  const initialize = useCallback(async () => {
    // Auth disabled: set guest profile and no session/user
    setLoading(true);
    setSession(null);
    setUser(null);
    await loadProfile("guest");
    setLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await initialize();
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [initialize, loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile("guest");
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    // Auth disabled: reset to guest profile
    setUser(null);
    setSession(null);
    await loadProfile("guest");
  }, [loadProfile]);

  const value = useMemo<AuthContextType>(
    () => ({ user, session, profile, loading, signOut, refreshProfile }),
    [loading, profile, refreshProfile, session, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};


