/* eslint-disable @typescript-eslint/no-explicit-any */

let sentry: any = null;

export async function initErrorTracking(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  if (!dsn) {
    if (import.meta.env.DEV) {
      console.log('[errorTracking] No VITE_SENTRY_DSN set — running without Sentry');
    }
    return;
  }

  try {
    // Dynamic import with variable to prevent Rollup from resolving the module at build time
    const sentryModule = '@sentry/react';
    const mod = await import(/* @vite-ignore */ sentryModule);
    sentry = mod;

    const isProd = (import.meta.env.VITE_ENV ?? 'development') === 'production';

    mod.init({
      dsn,
      environment: (import.meta.env.VITE_ENV as string) ?? 'development',
      tracesSampleRate: isProd ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      integrations: [
        mod.browserTracingIntegration(),
        mod.replayIntegration(),
      ],
    });
  } catch {
    if (import.meta.env.DEV) {
      console.log('[errorTracking] @sentry/react not installed — skipping initialization');
    }
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry) {
    sentry.withScope((scope: any) => {
      if (context) {
        scope.setExtras(context);
      }
      sentry.captureException(error);
    });
    return;
  }

  console.error('[errorTracking]', error, context);
}

export function setUser(user: { id: string; email?: string } | null): void {
  if (sentry) {
    sentry.setUser(user);
    return;
  }

  if (import.meta.env.DEV) {
    console.log('[errorTracking] setUser', user);
  }
}
