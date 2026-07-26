import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { RouteAnnouncer } from '@/components/RouteAnnouncer';
import PageTransition from '@/components/PageTransition';
import CommandPalette from '@/components/CommandPalette';

/** Layout for the public marketing site (fixed transparent header + footer). */
export function PublicLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <CommandPalette />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <RouteAnnouncer />
      <Navbar />
      <main id="main-content" className="flex-1">
        <PageTransition transitionKey={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}
