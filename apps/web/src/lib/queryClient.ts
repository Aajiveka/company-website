import { QueryClient, type QueryClient as QC } from '@tanstack/react-query';

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
  /** @deprecated Prefer queryKeys.employer — kept for legacy mock/tests. */
  client: {
    company: (id: string | number) => ['employer', 'company', id] as const,
    jobs: (id: string | number) => ['employer', 'jobs', id] as const,
  },
  employer: {
    company: (id: string | number) => ['employer', 'company', id] as const,
    jobs: (id: string | number) => ['employer', 'jobs', id] as const,
    jobsList: (params?: unknown) => ['employer', 'jobs', 'list', params] as const,
    applicants: () => ['employer', 'applicants'] as const,
    masters: () => ['employer', 'masters'] as const,
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

// ---------------------------------------------------------------------------
// Invalidation helpers
// ---------------------------------------------------------------------------

/** Invalidate all job-related queries (search, detail, filters). */
export function invalidateJobs(qc: QC) {
  return qc.invalidateQueries({ queryKey: ['jobs'] });
}

/** Invalidate all application-related queries. */
export function invalidateApplications(qc: QC) {
  return qc.invalidateQueries({ queryKey: ['candidate'] });
}

/** Invalidate all recruitment queries (candidates list, QC1 dashboard). */
export function invalidateRecruitment(qc: QC) {
  return qc.invalidateQueries({ queryKey: ['recruitment'] });
}

/** Invalidate all client/employer queries (company profile, job listings). */
export function invalidateClient(qc: QC) {
  return qc.invalidateQueries({ queryKey: ['employer'] });
}

/** Invalidate all employer portal queries. */
export function invalidateEmployer(qc: QC) {
  return qc.invalidateQueries({ queryKey: ['employer'] });
}

/** Invalidate all payment queries (plans, subscription, orders). */
export function invalidatePayments(qc: QC) {
  return qc.invalidateQueries({ queryKey: ['payments'] });
}

/** Invalidate the authenticated user query. */
export function invalidateAuth(qc: QC) {
  return qc.invalidateQueries({ queryKey: queryKeys.auth.me });
}
