import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { JobDetail, JobFilters, JobsPage, JobsQuery } from './jobs.types';

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

/** Infinite-scroll variant of public job search. */
export function useInfinitePublicJobs(params: Omit<JobsQuery, 'page'> & { pageSize: number }) {
  return useInfiniteQuery({
    queryKey: ['jobs', 'infinite', params],
    queryFn: ({ pageParam = 1 }) =>
      api.get<JobsPage>('/jobs', { params: { ...params, page: pageParam } }).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const totalPages = Math.ceil(lastPage.total / params.pageSize);
      return lastPageParam < totalPages ? lastPageParam + 1 : undefined;
    },
  });
}

/** Recommended jobs for the logged-in candidate based on their profile. */
export function useRecommendedJobs(enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'recommended'],
    queryFn: () => api.get<JobsPage>('/jobs/recommended').then((r) => r.data),
    enabled,
  });
}

/** A single public job listing (extended detail). */
export function useJob(id: string | number) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: () => api.get<JobDetail>(`/jobs/${id}`).then((r) => r.data),
    enabled: id !== '',
  });
}

/** Candidate self-apply. */
export function useApplyToJob(id: string | number) {
  return useMutation({
    mutationFn: () => api.post(`/jobs/${id}/apply`).then((r) => r.data),
  });
}
