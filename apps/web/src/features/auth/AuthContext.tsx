import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStorage } from '@/lib/tokenStorage';
import { authApi } from './auth.api';
import type { AuthSession, AuthUser } from './auth.types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, if a refresh token exists try to restore the session.
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      if (!tokenStorage.getRefresh()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (active) setUser(me);
      } catch {
        tokenStorage.clear();
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const setSession = useCallback((session: AuthSession) => {
    tokenStorage.setAccess(session.accessToken);
    tokenStorage.setRefresh(session.refreshToken);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore network errors on logout */
    } finally {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, setSession, logout }),
    [user, isLoading, setSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
