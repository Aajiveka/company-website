import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the service worker's navigation fallback.
 *
 * Workbox routes every navigation to index.html so a deep link into the SPA survives a reload
 * offline. Without a denylist that also caught top-level navigations to the API: opening a
 * published document in a new tab handed the browser the app shell, the router matched no
 * route, and the visitor got a 404 instead of their file. Embedded views kept working, being
 * subresources rather than navigations, which is what disguised it as one broken link.
 *
 * Asserted against the config source because the option is consumed by workbox at build time —
 * importing the config here would pull esbuild into jsdom, and the generated sw.js only exists
 * after a build.
 */
describe('PWA navigation fallback', () => {
  it('excludes /api from the app-shell fallback', () => {
    // Resolved from the project root: import.meta.url is an http URL under the jsdom runner.
    const config = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

    const line = config.split('\n').find((l) => l.includes('navigateFallbackDenylist'));
    expect(line, 'vite.config.ts must set navigateFallbackDenylist').toBeDefined();
    expect(line).toContain('api');
  });
});
