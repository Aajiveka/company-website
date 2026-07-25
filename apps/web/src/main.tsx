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

async function bootstrap() {
  // Start the MSW mock API until the real SQL Server-backed API is reachable.
  if (env.useMocks) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
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
