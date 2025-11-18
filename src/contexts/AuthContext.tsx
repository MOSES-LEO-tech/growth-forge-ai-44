import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, type ApiUser } from "@/lib/api";

type User = ApiUser | null;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const { user: u } = await api.me();
      setUser(u);
    } catch (e) {
      setUser(null);
    }
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    await loadUser();
    setLoading(false);
  }, [loadUser]);

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
  }, [initialize, loadUser]);

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await api.login({ email, password });
    await loadUser();
  }, [loadUser]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    await api.signup({ email, password, fullName });
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, signOut, signIn, signUp, refreshUser }),
    [loading, refreshUser, signIn, signOut, signUp, user],
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