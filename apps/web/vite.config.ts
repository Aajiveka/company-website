/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2';
import path from 'node:path';

/**
 * Serves a self-destroying service worker at /sw.js during `vite dev`.
 *
 * vite-plugin-pwa generates no service worker in dev (its useRegisterSW is a no-op there), so
 * nothing registers one — but a service worker installed by a PRODUCTION build survives in the
 * browser until it is explicitly unregistered, and localhost is the same origin as the preview
 * build. That leftover keeps serving its own cached app shell, which is why HMR then reports
 * "failed to connect to websocket": the page in front of you did not come from the dev server.
 *
 * Without this, the leftover cannot even fix itself. Its update check fetches /sw.js, Vite's SPA
 * fallback answers with index.html as text/html, the update is rejected for an unsupported MIME
 * type, and the stale worker stays active indefinitely. Answering with a real script that
 * unregisters and clears caches turns that dead end into automatic recovery on the next load.
 */
function devServiceWorkerReaper(): Plugin {
  const body = `// Dev-only: retires any service worker left behind by a production build.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.registration.unregister();
    await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
    // Reload open tabs so they come from the dev server instead of the dead cache.
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;
  return {
    name: 'dev-service-worker-reaper',
    apply: 'serve',
    configureServer(server) {
      // Registered here so it runs ahead of Vite's SPA html-fallback middleware, which would
      // otherwise answer /sw.js with index.html.
      server.middlewares.use('/sw.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript');
        // Never let the reaper itself be cached, or it cannot be replaced later.
        res.setHeader('Cache-Control', 'no-store');
        res.end(body);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode: _mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    devServiceWorkerReaper(),
    compression({ algorithms: ['gzip', 'brotliCompress'] }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'image/favicon.svg', 'image/apple-touch-icon.png'],
      manifest: {
        name: 'Aajiveka — Your Ultimate Career Partner',
        short_name: 'Aajiveka',
        description:
          "India's next-gen job portal connecting talented professionals with top employers.",
        theme_color: '#005985',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/image/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/image/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/image/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Search Jobs', url: '/jobs', icons: [{ src: '/image/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'My Profile', url: '/candidate/profile', icons: [{ src: '/image/pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Applied Jobs', url: '/candidate/applied-jobs', icons: [{ src: '/image/pwa-192x192.png', sizes: '192x192' }] },
        ],
        share_target: {
          action: '/jobs',
          method: 'GET',
          params: { title: 'q', text: 'q', url: 'q' },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        /**
         * Never answer an /api navigation with the app shell.
         *
         * Workbox routes every navigation to index.html so a deep link into the SPA works
         * offline. That also swallowed top-level navigations to the API — opening a document in
         * a new tab handed the browser index.html, the router matched no route, and the user got
         * the app's 404 instead of their file. Embeds were unaffected, being subresources rather
         * than navigations, which is what made it look like only "Open in new tab" was broken.
         */
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /*
           * Only the PUBLIC job catalogue is cached; every other /api request goes straight to
           * the network, untouched by the service worker. The previous rule matched all of /api:
           *
           *  - It held the notification stream (/api/notifications/stream, an SSE response that
           *    never ends). Workbox reads a body to cache it, so each page load left one stream
           *    open in the worker after the page was gone; at the browser's six connections per
           *    host the next request (/auth/me) could not get a socket, and the app logged the
           *    user out. CI's crawler failed on the seventh page of every role.
           *  - It stored signed-in responses (profile, admin and candidate data) in Cache Storage
           *    for a day, outliving logout — on a shared machine, the next person could be served
           *    them whenever the network failed.
           *  - Being first, it shadowed the job-detail rule below, which never ran.
           *
           * Order matters: Workbox uses the first matching route.
           */
          {
            urlPattern: /\/api\/jobs\/\d+$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'job-details-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The public listing, search, filters and suggestions — @Public() on JobsController,
            // identical for every visitor. /jobs/recommended and /jobs/:id/apply are per-user and
            // deliberately do not match.
            urlPattern: /\/api\/jobs(\/(search|filters|suggestions))?(\?.*)?$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'public-jobs-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/locales\/.+\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'i18n-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true, // listen on 0.0.0.0 so phones/PCs on the same Wi‑Fi can open http://<LAN-IP>:5173
    port: 5173,
    // Proxy API calls to the NestJS backend (default PORT=4000) to avoid CORS.
    // Override with VITE_API_PROXY if the API runs elsewhere.
    proxy: {
      // Prefer 127.0.0.1 over localhost — on Windows, localhost often resolves to ::1 first
      // and Vite then gets ECONNREFUSED while Nest is listening on IPv4.
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  // `vite preview` serves the production build. CI drives the e2e suite against it, so it
  // needs the same /api proxy the dev server has — otherwise every API call 404s.
  preview: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:4000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
  build: {
    // Deterministic vendor/ui chunk splitting for better long-term caching.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query', 'axios'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'i18n-vendor': ['i18next', 'react-i18next', 'i18next-http-backend', 'i18next-browser-languagedetector'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'pdf-vendor': ['html2canvas-pro', 'jspdf'],
          'state-vendor': ['zustand'],
        },
      },
    },
  },
}));
