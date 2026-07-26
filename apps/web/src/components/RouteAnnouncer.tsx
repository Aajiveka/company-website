import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Announces route changes to screen readers via an aria-live region
 * and resets focus to the top of the page on navigation.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const announcerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render — the page is already loaded.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Announce page change to screen readers via document title.
    const pageTitle = document.title;
    if (announcerRef.current) {
      announcerRef.current.textContent = pageTitle;
    }

    // Move focus to main content so keyboard users start from the top.
    const main = document.getElementById('main-content');
    if (main) {
      main.tabIndex = -1;
      main.focus({ preventScroll: true });
      // Remove tabIndex after focus so it doesn't appear in tab order.
      main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
    }
  }, [pathname]);

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
