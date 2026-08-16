import { Outlet, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { RouteAnnouncer } from '@/components/RouteAnnouncer';
import { useCvMasters, useDownloadResume } from '../candidate.api';
import { PortalHeader } from './components/PortalHeader';
import { ProfileHero } from './components/ProfileHero';
import { ModuleTiles, PortalSidebar } from './components/PortalSidebar';
import { ProfileAsideCards } from './components/ProfileAsideCards';
import { ErrorState } from './components/primitives';
import { usePortalProfile } from './usePortalProfile';

/**
 * Shell for every candidate screen in the Aajiveka UI design: header, blue profile
 * banner, left module rail, and the module's own content in the right column.
 *
 * The banner and rail are part of the layout rather than each page so they survive
 * navigation between modules without refetching or remounting — which is what the
 * design implies by keeping them fixed across all 29 frames.
 */
export default function CandidatePortalLayout() {
  const { portal, profile, cv, isLoading, isError, refetch } = usePortalProfile();
  const { data: masters } = useCvMasters();
  const download = useDownloadResume();
  const { notify } = useToast();
  const { pathname } = useLocation();

  // Only the profile overview adds its at-a-glance cards to the rail; every screen keeps the
  // "My Modules" tiles below them. The profile page used to replace the tiles rather than sit
  // above them, which left Interviews, Documents, Refer a Friend, the tracker and email
  // preferences with no link at all on the portal's own landing screen — the header and avatar
  // menu do not carry them either, so the only way in was a detour through Account Settings.
  const showProfileCards = pathname === '/candidate/profile';

  const onDownloadResume = () => {
    if (!portal) return;
    download.mutate(portal.resumeFileName, {
      onError: () => notify('Could not download your resume. Please try again.', 'error'),
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-aj-canvas dark:bg-gray-900">
      <a
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-aj-blue focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <RouteAnnouncer />

      <PortalHeader profile={portal} />

      {isError ? (
        <main id="portal-content" className="flex-1">
          <ErrorState message="We could not load your profile." onRetry={refetch} />
        </main>
      ) : isLoading || !portal ? (
        <PortalSkeleton />
      ) : (
        <>
          <ProfileHero profile={portal} onDownloadResume={onDownloadResume} downloading={download.isPending} />
          <main id="portal-content" className="mx-auto w-full max-w-[1194px] flex-1 px-4 py-6 sm:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
              <PortalSidebar profile={portal}>
                {showProfileCards && profile && cv ? (
                  <>
                    <ProfileAsideCards profile={profile} cv={cv} masters={masters} />
                    <ModuleTiles />
                  </>
                ) : undefined}
              </PortalSidebar>
              <div className="min-w-0 flex-1 space-y-4">
                <Outlet />
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div aria-busy className="flex-1">
      <div className="h-[238px] bg-linear-to-r from-aj-blue to-aj-blue-end" />
      <div className="mx-auto w-full max-w-[1194px] px-4 py-6 sm:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="w-full space-y-4 lg:w-80 lg:shrink-0">
            <div className="h-40 animate-pulse rounded-xl bg-white dark:bg-gray-800" />
            <div className="h-96 animate-pulse rounded-xl bg-white dark:bg-gray-800" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="h-32 animate-pulse rounded-xl bg-white dark:bg-gray-800" />
            <div className="h-64 animate-pulse rounded-xl bg-white dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
