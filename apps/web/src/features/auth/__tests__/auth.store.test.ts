import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../auth.store';
import { tokenStorage } from '@/lib/tokenStorage';
import { authApi } from '../auth.api';
import type { AuthUser } from '../auth.types';

vi.mock('@/lib/tokenStorage', () => ({
  tokenStorage: {
    getAccess: vi.fn(),
    setAccess: vi.fn(),
    getRefresh: vi.fn(),
    setRefresh: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../auth.api', () => ({
  authApi: {
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

const mockUser: AuthUser = {
  userId: 1,
  userName: 'candidate',
  fullName: 'Test User',
  email: 'test@test.com',
  roleId: 1,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset zustand store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  describe('initial state', () => {
    it('starts unauthenticated with loading true', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setSession', () => {
    it('stores tokens and sets user as authenticated', () => {
      useAuthStore.getState().setSession({
        user: mockUser,
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });

      expect(tokenStorage.setAccess).toHaveBeenCalledWith('access-1');
      expect(tokenStorage.setRefresh).toHaveBeenCalledWith('refresh-1');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('calls API logout, clears tokens, and resets state', async () => {
      vi.mocked(tokenStorage.getRefresh).mockReturnValue('refresh-1');
      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      // First log in
      useAuthStore.getState().setSession({
        user: mockUser,
        accessToken: 'a',
        refreshToken: 'r',
      });

      await useAuthStore.getState().logout();

      expect(authApi.logout).toHaveBeenCalledWith('refresh-1');
      expect(tokenStorage.clear).toHaveBeenCalled();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('still clears state if API logout fails', async () => {
      vi.mocked(authApi.logout).mockRejectedValue(new Error('Network'));

      await useAuthStore.getState().logout();

      expect(tokenStorage.clear).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('bootstrap', () => {
    it('sets isLoading false immediately if no refresh token', async () => {
      vi.mocked(tokenStorage.getRefresh).mockReturnValue(null);

      await useAuthStore.getState().bootstrap();

      expect(authApi.me).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('restores session when refresh token exists', async () => {
      vi.mocked(tokenStorage.getRefresh).mockReturnValue('refresh-1');
      vi.mocked(authApi.me).mockResolvedValue(mockUser);

      await useAuthStore.getState().bootstrap();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('clears tokens and resets state if me() fails', async () => {
      vi.mocked(tokenStorage.getRefresh).mockReturnValue('refresh-1');
      vi.mocked(authApi.me).mockRejectedValue(new Error('401'));

      await useAuthStore.getState().bootstrap();

      expect(tokenStorage.clear).toHaveBeenCalled();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });
});
