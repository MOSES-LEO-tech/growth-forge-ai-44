import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, type User as ApiUser } from '@/services/api';

type Role = 'student' | 'parent' | 'teacher' | 'admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  avatarUrl?: string;
  schoolId?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: { email: string; password: string; fullName: string; role: string; schoolId?: number }) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    console.log('[AuthContext] Mount check - storedToken exists:', !!storedToken, 'storedUser exists:', !!storedUser);

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Verify token is still valid
      refreshUser().catch((error) => {
        console.error('[AuthContext] Token validation failed:', error);
        // Token expired, clear session
        signOut();
      });
    }
    setLoading(false);
    console.log('[AuthContext] Initial loading complete, loading:', false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await auth.login({ email, password });
    const { token: newToken, refreshToken: newRefreshToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const signUp = async (data: { email: string; password: string; fullName: string; role: string; schoolId?: number }) => {
    const response = await auth.register(data as { email: string; password: string; fullName: string; role: Role; schoolId?: number });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const signOut = () => {
    console.log('[AuthContext] signOut called - clearing localStorage and state');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await auth.getProfile();
      const userData = {
        id: response.data.id,
        email: response.data.email,
        fullName: response.data.full_name,
        role: response.data.role,
        avatarUrl: response.data.avatar_url,
        schoolId: response.data.school_id,
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut, refreshUser }}>
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

