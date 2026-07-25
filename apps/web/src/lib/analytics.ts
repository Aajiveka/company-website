export function trackEvent(name: string, properties?: Record<string, unknown>) {
  const payload = { name, properties, timestamp: Date.now() };

  if (import.meta.env.DEV) {
    console.log('[analytics]', name, properties);
    return;
  }

  navigator.sendBeacon?.('/analytics/events', JSON.stringify(payload));
}

export function trackPageView(path: string) {
  trackEvent('page_view', { path });
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  trackEvent('identify', { userId, ...traits });
}
