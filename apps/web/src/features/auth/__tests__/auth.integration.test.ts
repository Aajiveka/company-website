import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from '../auth.store';
import { tokenStorage } from '@/lib/tokenStorage';
import type { AuthUser, AuthSession } from '../auth.types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/lib/tokenStorage', () => ({
  tokenStorage: {
    getAccess: vi.fn(),
    setAccess: vi.fn(),
    getRefresh: vi.fn(() => null),
    setRefresh: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../auth.api', () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockUser: AuthUser = {
  userId: 42,
  userName: 'testcandidate',
  fullName: 'Test Candidate',
  email: 'test@example.com',
  roleId: 1,
  isOnboarded: true,
};

const mockSession: AuthSession = {
  user: mockUser,
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth integration flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });

  it('logs in: sets user and stores tokens, then logs out: clears everything', async () => {
    const { authApi } = await import('../auth.api');
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    // --- Login ---
    useAuthStore.getState().setSession(mockSession);

    // Verify user is set
    const loggedIn = useAuthStore.getState();
    expect(loggedIn.user).toEqual(mockUser);
    expect(loggedIn.isAuthenticated).toBe(true);
    expect(loggedIn.isLoading).toBe(false);

    // Verify tokens were stored
    expect(tokenStorage.setAccess).toHaveBeenCalledWith('access-token-123');
    expect(tokenStorage.setRefresh).toHaveBeenCalledWith('refresh-token-456');

    // --- Logout ---
    await useAuthStore.getState().logout();

    const loggedOut = useAuthStore.getState();
    expect(loggedOut.user).toBeNull();
    expect(loggedOut.isAuthenticated).toBe(false);
    expect(tokenStorage.clear).toHaveBeenCalled();
  });

  it('bootstrap restores session from persisted refresh token', async () => {
    const { authApi } = await import('../auth.api');
    vi.mocked(tokenStorage.getRefresh).mockReturnValue('persisted-refresh');
    vi.mocked(authApi.me).mockResolvedValue(mockUser);

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('bootstrap clears state when refresh token exists but /auth/me fails', async () => {
    const { authApi } = await import('../auth.api');
    vi.mocked(tokenStorage.getRefresh).mockReturnValue('expired-refresh');
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(tokenStorage.clear).toHaveBeenCalled();
  });

  it('login then updateUser merges partial data correctly', () => {
    useAuthStore.getState().setSession(mockSession);

    useAuthStore.getState().updateUser({ fullName: 'Updated Name' });

    const state = useAuthStore.getState();
    expect(state.user?.fullName).toBe('Updated Name');
    // Other fields remain intact
    expect(state.user?.email).toBe('test@example.com');
    expect(state.user?.userId).toBe(42);
  });
});
