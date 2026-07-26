import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth.store';
import { FullPageLoader } from '@/components/ui';
import { Role, ROLE_HOME, type RoleId } from '@/types/roles';

interface ProtectedRouteProps {
  /** If provided, only these roles may access the nested routes. */
  allow?: RoleId[];
}

const ONBOARDING_PATH = '/candidate/onboarding';

/**
 * Guards nested routes. Unauthenticated users go to /login (preserving the
 * intended destination); authenticated users lacking the role are redirected
 * to their own role home. Candidates who haven't completed onboarding are
 * redirected to the onboarding wizard.
 */
export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allow && !allow.includes(user.roleId)) {
    return <Navigate to={ROLE_HOME[user.roleId]} replace />;
  }

  // Redirect non-onboarded candidates to the onboarding wizard (unless already there).
  if (
    user.roleId === Role.Subscriber &&
    !user.isOnboarded &&
    location.pathname !== ONBOARDING_PATH
  ) {
    return <Navigate to={ONBOARDING_PATH} replace />;
  }

  return <Outlet />;
}
