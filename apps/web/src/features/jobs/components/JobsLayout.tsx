import { Outlet } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { RouteAnnouncer } from '@/components/RouteAnnouncer';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';
import { PortalHeader } from '@/features/candidates/portal/components/PortalHeader';
import { usePortalProfile } from '@/features/candidates/portal/usePortalProfile';

/**
 * Chrome for the job screens, which the design draws behind the candidate header.
 *
 * These routes stay public — they are the site's SEO surface and anonymous visitors have to
 * be able to read a job before signing up — so the chrome adapts instead of the route
 * splitting in two: a signed-in candidate gets the portal header (with Applications and
 * Saved Jobs, which only mean anything to them), everyone else keeps the marketing shell.
 * One set of job pages either way.
 */
export default function JobsLayout() {
  const { isAuthenticated, user } = useAuth();
  const isCandidate = isAuthenticated && user?.roleId === Role.Subscriber;

  if (!isCandidate) return <PublicLayout />;
  return <CandidateChrome />;
}

/**
 * Split out so `usePortalProfile` — which fetches the CV — only runs for candidates, not for
 * every anonymous visitor browsing jobs.
 */
function CandidateChrome() {
  const { portal } = usePortalProfile();

  return (
    <div className="flex min-h-screen flex-col bg-aj-canvas dark:bg-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-aj-blue focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <RouteAnnouncer />
      <PortalHeader profile={portal} />
      <main id="main-content" className="mx-auto w-full max-w-[1194px] flex-1 px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
