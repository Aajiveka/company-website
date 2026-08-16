import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  ApplyFormValues,
  ApplyResult,
  FullTextSearchQuery,
  JobDetail,
  JobFilters,
  JobsPage,
  JobsQuery,
  SuggestionsResponse,
} from './jobs.types';

/** Master lists for the function/location dropdowns. */
export function useJobFilters() {
  return useQuery({
    queryKey: queryKeys.jobs.filters,
    queryFn: () => api.get<JobFilters>('/jobs/filters').then((r) => r.data),
    // Master data barely changes -- keep it for the session.
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

/** Full-text search across jobs with ranking. */
export function useFullTextJobSearch(params: FullTextSearchQuery) {
  return useQuery({
    queryKey: ['jobs', 'fulltext', params],
    queryFn: () => api.get<JobsPage>('/jobs/search', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
    enabled: !!params.q?.trim(),
  });
}

/** Autocomplete suggestions for job search. */
export function useJobSuggestions(q: string, enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'suggestions', q],
    queryFn: () => api.get<SuggestionsResponse>('/jobs/suggestions', { params: { q } }).then((r) => r.data),
    enabled: enabled && q.trim().length >= 2,
    staleTime: 30_000,
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
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ApplyFormValues & { resumeFileName?: string }) =>
      api.post<ApplyResult>(`/jobs/${id}/apply`, payload).then((r) => r.data),
    // The tracker and the applied-jobs list both change the moment this succeeds.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['candidate', 'applied-jobs'] });
      void qc.invalidateQueries({ queryKey: ['candidate', 'dashboard'] });
    },
  });
}
