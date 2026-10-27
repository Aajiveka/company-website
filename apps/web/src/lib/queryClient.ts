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
  /** Q1 screening workspace. Centralised rather than inline literals, so an invalidation
      cannot quietly miss a key the way the recruitment ones can. */
  q1: {
    root: ['q1'] as const,
    stats: ['q1', 'stats'] as const,
    navCounts: ['q1', 'nav-counts'] as const,
    queue: (params?: unknown) => ['q1', 'queue', params] as const,
    profile: (id: string | number) => ['q1', 'profile', id] as const,
    contactLog: (id: string | number) => ['q1', 'contact-log', id] as const,
    analytics: ['q1', 'analytics'] as const,
  },
  q2: {
    root: ['q2'] as const,
    stats: ['q2', 'stats'] as const,
    navCounts: ['q2', 'nav-counts'] as const,
    sla: ['q2', 'sla'] as const,
    jobs: (search?: string) => ['q2', 'jobs', search ?? ''] as const,
    jobApplicants: (jobId: string | number, relevantOnly: boolean) =>
      ['q2', 'job-applicants', jobId, relevantOnly] as const,
    applicants: (params?: unknown) => ['q2', 'applicants', params] as const,
    application: (mapId: string | number) => ['q2', 'application', mapId] as const,
    analytics: ['q2', 'analytics'] as const,
  },
  q3: {
    root: ['q3'] as const,
    navCounts: ['q3', 'nav-counts'] as const,
    dashboard: ['q3', 'dashboard'] as const,
    pipeline: (params?: unknown) => ['q3', 'pipeline', params] as const,
    queue: (name: string) => ['q3', 'queue', name] as const,
    referrals: ['q3', 'referrals'] as const,
    companyReview: (tab: string) => ['q3', 'company-review', tab] as const,
    shortlist: (mapId: string | number) => ['q3', 'shortlist', mapId] as const,
    scheduling: (mapId: string | number) => ['q3', 'scheduling', mapId] as const,
    interviews: (week: string) => ['q3', 'interviews', week] as const,
    rounds: (mapId: string | number) => ['q3', 'rounds', mapId] as const,
    documents: (mapId: string | number) => ['q3', 'documents', mapId] as const,
    returned: (tab: string) => ['q3', 'returned', tab] as const,
    returnMail: (referralId: number) => ['q3', 'return-mail', referralId] as const,
  },
  /** Admin panel. Every key sits under ['admin'] so one invalidation refreshes the panel. */
  admin: {
    root: ['admin'] as const,
    stats: ['admin', 'stats'] as const,
    users: (params?: unknown) => ['admin', 'users', params] as const,
    user: (id: string | number) => ['admin', 'user', id] as const,
    jobs: (params?: unknown) => ['admin', 'jobs', params] as const,
    job: (id: string | number) => ['admin', 'job', id] as const,
    applications: (params?: unknown) => ['admin', 'applications', params] as const,
    application: (id: string | number) => ['admin', 'application', id] as const,
    companies: (params?: unknown) => ['admin', 'companies', params] as const,
    audit: (params?: unknown) => ['admin', 'audit', params] as const,
    employerRegistrations: (status?: string) => ['admin', 'employer-registrations', status ?? 'all'] as const,
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
