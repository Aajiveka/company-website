import { useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Warn users when they try to navigate away (in-app or browser close/refresh)
 * while a form has unsaved changes.
 *
 * @param isDirty - whether the form currently has unsaved changes
 * @param message - optional message shown in the browser's native dialog (most
 *   browsers ignore custom text and show a generic prompt, but we set it for the
 *   few that still respect it).
 */
export function useUnsavedChanges(isDirty: boolean, message?: string) {
  const msg = message ?? 'You have unsaved changes. Are you sure you want to leave?';

  // --- Browser close / refresh ---
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = msg;
      return msg;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, msg]);

  // --- In-app navigation (react-router) ---
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmed = window.confirm(msg);
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    }
  }, [blocker, msg]);
}
