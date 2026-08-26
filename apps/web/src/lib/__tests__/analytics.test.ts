import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

// We need to control import.meta.env.DEV per test, so we re-import after mocking.
let trackEvent: typeof import('../analytics').trackEvent;
let trackPageView: typeof import('../analytics').trackPageView;
let identifyUser: typeof import('../analytics').identifyUser;

describe('analytics', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: vi.fn(),
    });
  });

  describe('in DEV mode', () => {
    beforeEach(async () => {
      vi.stubEnv('DEV', true);
      // Vitest sets import.meta.env.DEV based on mode; we override via the module env.
      // Re-import so the module picks up the fresh env.
      const mod = await import('../analytics');
      trackEvent = mod.trackEvent;
      trackPageView = mod.trackPageView;
      identifyUser = mod.identifyUser;
    });

    it('trackEvent calls console.log in dev', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackEvent('click', { button: 'submit' });

      expect(spy).toHaveBeenCalledWith('[analytics]', 'click', { button: 'submit' });
      spy.mockRestore();
    });

    it('trackPageView calls trackEvent with page_view', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      trackPageView('/home');

      expect(spy).toHaveBeenCalledWith('[analytics]', 'page_view', { path: '/home' });
      spy.mockRestore();
    });

    it('identifyUser calls trackEvent with identify', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      identifyUser('user-42', { plan: 'pro' });

      expect(spy).toHaveBeenCalledWith('[analytics]', 'identify', {
        userId: 'user-42',
        plan: 'pro',
      });
      spy.mockRestore();
    });
  });

  describe('in production mode', () => {
    const loadWith = async (endpoint: string) => {
      vi.resetModules();
      vi.stubEnv('DEV', false);
      vi.stubEnv('VITE_ANALYTICS_ENDPOINT', endpoint);
      const mod = await import('../analytics');
      trackEvent = mod.trackEvent;
      trackPageView = mod.trackPageView;
      identifyUser = mod.identifyUser;
    };

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    /**
     * The module used to beacon to a hard-coded `/analytics/events`. Nothing serves that path —
     * it is outside `/api`, so nginx answered every POST with 405, and production logged a
     * failed request on every single navigation.
     */
    it('sends nothing when no endpoint is configured', async () => {
      await loadWith('');
      trackEvent('purchase', { amount: 99 });
      trackPageView('/home');
      identifyUser('user-42');

      expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });

    it('beacons to the configured endpoint', async () => {
      await loadWith('https://collect.example/e');
      trackEvent('purchase', { amount: 99 });

      expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
      const [url, body] = (navigator.sendBeacon as unknown as ReturnType<typeof vi.fn>).mock
        .calls[0] as [string, string];
      expect(url).toBe('https://collect.example/e');
      expect(JSON.parse(body)).toMatchObject({ name: 'purchase', properties: { amount: 99 } });
    });
  });
});
