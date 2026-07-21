import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { JobFilters, JobsPage, JobsQuery, PublicJob } from './jobs.types';

/** Master lists for the function/location dropdowns. */
export function useJobFilters() {
  return useQuery({
    queryKey: queryKeys.jobs.filters,
    queryFn: () => api.get<JobFilters>('/jobs/filters').then((r) => r.data),
    // Master data barely changes — keep it for the session.
    staleTime: Infinity,
  });
}

/** Paginated public job search filtered by function and location. */
export function usePublicJobs(params: JobsQuery) {
  return useQuery({
    queryKey: queryKeys.jobs.search(params),
    queryFn: () => api.get<JobsPage>('/jobs', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/** A single public job listing. */
export function useJob(id: string | number) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => api.get<PublicJob>(`/jobs/${id}`).then((r) => r.data),
    enabled: id !== '',
  });
}

/** Candidate self-apply. */
export function useApplyToJob(id: string | number) {
  return useMutation({
    mutationFn: () => api.post(`/jobs/${id}/apply`).then((r) => r.data),
  });
}
