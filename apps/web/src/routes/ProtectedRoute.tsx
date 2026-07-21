import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/auth.store';
import { FullPageLoader } from '@/components/ui';
import { ROLE_HOME, type RoleId } from '@/types/roles';

interface ProtectedRouteProps {
  /** If provided, only these roles may access the nested routes. */
  allow?: RoleId[];
}

/**
 * Guards nested routes. Unauthenticated users go to /login (preserving the
 * intended destination); authenticated users lacking the role are redirected
 * to their own role home.
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

  return <Outlet />;
}
