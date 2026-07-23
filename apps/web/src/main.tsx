import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { PwaReloadPrompt } from './components/PwaReloadPrompt';
import { router } from './routes/router';
import { env } from './lib/env';
import './lib/i18n';
import './styles/index.css';

async function bootstrap() {
  // Start the MSW mock API until the real SQL Server-backed API is reachable.
  if (env.useMocks) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
        <PwaReloadPrompt />
      </AppProviders>
    </React.StrictMode>,
  );
}

void bootstrap();
