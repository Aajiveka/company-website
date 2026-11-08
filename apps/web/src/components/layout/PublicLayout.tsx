import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { hasHeroBehindHeader } from './publicChrome';
import { RouteAnnouncer } from '@/components/RouteAnnouncer';
import PageTransition from '@/components/PageTransition';
import CommandPalette from '@/components/CommandPalette';
import { cn } from '@/lib/cn';

export interface PublicLayoutProps {
  /** Extra classes for `<main>` — lets a route group impose its own container width. */
  contentClassName?: string;
}

/** Layout for the public marketing site (fixed transparent header + footer). */
export function PublicLayout({ contentClassName }: PublicLayoutProps = {}) {
  const location = useLocation();
  const heroBehindHeader = hasHeroBehindHeader(location.pathname);

  return (
    <div className="flex min-h-screen flex-col">
      <CommandPalette />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-1200 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <RouteAnnouncer />
      <Navbar />
      {/*
       * The header is `fixed`, so it takes up no space of its own. Pages that draw a hero
       * behind it reserve the height inside that hero; everyone else gets it here, once,
       * instead of each page guessing at a `pt-*`.
       */}
      {!heroBehindHeader && <div aria-hidden className="h-(--nav-h) shrink-0" />}
      {/* At least a viewport tall, so the footer starts below the fold. Pages are lazy-loaded:
          with flex-1 alone the footer first painted at the bottom of the screen and was then
          shoved down when the page arrived — Lighthouse measured CLS 0.5–0.8 from it alone. */}
      <main id="main-content" className={cn('min-h-svh flex-1', contentClassName)}>
        <PageTransition transitionKey={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
    </div>
  );
}
