/**
 * Where events are sent, or nowhere.
 *
 * This used to beacon to a hard-coded `/analytics/events`. Nothing serves that path — it is not
 * under `/api`, so nginx answered every POST with 405 — which meant a failed request and a
 * console error on every single navigation in production. `VITE_ANALYTICS_ENDPOINT` is the
 * switch `webVitals` already uses; until it is set there is nowhere to send events, so we don't.
 */
const ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  const payload = { name, properties, timestamp: Date.now() };

  if (import.meta.env.DEV) {
    console.log('[analytics]', name, properties);
    return;
  }

  if (!ENDPOINT) return;
  navigator.sendBeacon?.(ENDPOINT, JSON.stringify(payload));
}

export function trackPageView(path: string) {
  trackEvent('page_view', { path });
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  trackEvent('identify', { userId, ...traits });
}
