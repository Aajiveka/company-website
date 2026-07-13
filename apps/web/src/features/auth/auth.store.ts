import { create } from 'zustand';
import { tokenStorage } from '@/lib/tokenStorage';
import { authApi } from './auth.api';
import type { AuthSession, AuthUser } from './auth.types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True until the initial "do we have a session?" check has finished. */
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  /** Restore the session from the persisted refresh token. Called once at startup. */
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setSession: (session) => {
    tokenStorage.setAccess(session.accessToken);
    tokenStorage.setRefresh(session.refreshToken);
    set({ user: session.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    // Hand the refresh token back so the API can actually revoke it. Without it the
    // endpoint has nothing to revoke and the token stays valid until it expires.
    await authApi.logout(tokenStorage.getRefresh()).catch(() => undefined);
    tokenStorage.clear();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  bootstrap: async () => {
    if (!tokenStorage.getRefresh()) {
      set({ isLoading: false });
      return;
    }
    try {
      // The access token lives in memory, so after a reload there isn't one. This 401s,
      // and the axios interceptor refreshes and replays it.
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      tokenStorage.clear();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

/** Kept as a hook so the ~5 call sites read the same as before the Zustand move. */
export const useAuth = () => useAuthStore();
