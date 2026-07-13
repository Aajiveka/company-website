import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/features/auth/auth.store';
import { ToastProvider } from '@/components/ui';

/**
 * Composes the app-wide providers. Auth is a Zustand store rather than a context, so it
 * needs no provider — only a one-shot bootstrap to restore a session from the persisted
 * refresh token.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
