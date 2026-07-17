import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Centralised, type-safe query keys. */
export const queryKeys = {
  auth: { me: ['auth', 'me'] as const },
  candidate: { profile: (id: string | number) => ['candidate', 'profile', id] as const },
  client: {
    company: (id: string | number) => ['client', 'company', id] as const,
    jobs: (id: string | number) => ['client', 'jobs', id] as const,
  },
  recruitment: {
    candidates: (params?: unknown) => ['recruitment', 'candidates', params] as const,
    qc1Dashboard: ['recruitment', 'qc1-dashboard'] as const,
  },
  jobs: {
    filters: ['jobs', 'filters'] as const,
    search: (params?: unknown) => ['jobs', 'search', params] as const,
    detail: (id: string | number) => ['jobs', 'detail', id] as const,
  },
  payments: {
    plans: ['payments', 'plans'] as const,
    order: (ref: string) => ['payments', 'order', ref] as const,
    subscription: ['payments', 'subscription'] as const,
  },
} as const;
