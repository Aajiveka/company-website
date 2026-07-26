import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { Role } from '@/types/roles';

// Mock the auth store
const mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null as Record<string, unknown> | null,
};

vi.mock('@/features/auth/auth.store', () => ({
  useAuth: () => mockAuthState,
}));

// Mock FullPageLoader
vi.mock('@/components/ui', () => ({
  FullPageLoader: () => <div data-testid="loader">Loading...</div>,
}));

function renderWithRouter(initialPath: string, allow?: number[]) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute allow={allow as never} />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/admin" element={<div>Admin Page</div>} />
          <Route path="/candidate/onboarding" element={<div>Onboarding</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/candidate/profile" element={<div>Candidate Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.isLoading = false;
    mockAuthState.user = null;
  });

  it('redirects to /login when not authenticated', () => {
    renderWithRouter('/dashboard');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      userId: 1,
      userName: 'test',
      fullName: 'Test',
      email: 'test@test.com',
      roleId: Role.Admin,
      isOnboarded: true,
    };

    renderWithRouter('/dashboard');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows loader while isLoading is true', () => {
    mockAuthState.isLoading = true;

    renderWithRouter('/dashboard');
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('redirects to role home when role is not allowed', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      userId: 1,
      userName: 'test',
      fullName: 'Test',
      email: 'test@test.com',
      roleId: Role.Subscriber,
      isOnboarded: true,
    };

    // Only allow Admin
    renderWithRouter('/dashboard', [Role.Admin]);
    // Subscriber's home is /candidate/profile
    expect(screen.getByText('Candidate Home')).toBeInTheDocument();
  });

  it('redirects non-onboarded subscribers to onboarding', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      userId: 1,
      userName: 'test',
      fullName: 'Test',
      email: 'test@test.com',
      roleId: Role.Subscriber,
      isOnboarded: false,
    };

    renderWithRouter('/dashboard');
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });

  it('does not redirect onboarded subscribers away from dashboard', () => {
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = {
      userId: 1,
      userName: 'test',
      fullName: 'Test',
      email: 'test@test.com',
      roleId: Role.Subscriber,
      isOnboarded: true,
    };

    renderWithRouter('/dashboard');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
