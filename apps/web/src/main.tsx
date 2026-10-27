import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootFallback } from './components/RootFallback';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { PwaReloadPrompt } from './components/PwaReloadPrompt';
import OfflineBanner from './components/OfflineBanner';
import { useOfflineSync } from './hooks/useOfflineSync';
import { router } from './routes/router';
import { env } from './lib/env';
import './lib/i18n';
import './styles/index.css';

// eslint-disable-next-line react-refresh/only-export-components
function App() {
  useOfflineSync();
  return (
    <>
      <RouterProvider router={router} />
      <OfflineBanner />
      <PwaInstallPrompt />
      <PwaReloadPrompt />
    </>
  );
}

/**
 * Earlier builds cached every /api response — signed-in data included — in 'api-cache'. The
 * service worker no longer writes to it (vite.config.ts), but a cache Workbox stops using is
 * never deleted, so drop it once here. Fire-and-forget: Cache Storage may be absent or blocked.
 */
function purgeLegacyApiCache() {
  try {
    if (typeof caches !== 'undefined') void caches.delete('api-cache').catch(() => {});
  } catch {
    // No Cache Storage in this context; nothing was ever cached here.
  }
}

async function bootstrap() {
  purgeLegacyApiCache();

  // Start the MSW mock API until the real SQL Server-backed API is reachable.
  // If service-worker registration is unavailable (e.g. blocked in an e2e spec
  // that mocks the network itself), fall back to rendering without MSW rather
  // than crashing the bootstrap and leaving a blank page.
  if (env.useMocks) {
    try {
      const { worker } = await import('./mocks/browser');
      await worker.start({ onUnhandledRequest: 'bypass' });
    } catch (err) {
      console.warn('[mocks] MSW worker did not start; continuing without it', err);
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary fallback={<RootFallback />}>
        <AppProviders>
          <App />
        </AppProviders>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

void bootstrap();
