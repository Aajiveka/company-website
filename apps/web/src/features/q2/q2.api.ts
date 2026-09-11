import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  ApplicantBucket,
  ApplicantTab,
  MatchCriterionKey,
  Q2Analytics,
  Q2Application,
  Q2ApplicantsPage,
  Q2JobApplicants,
  Q2JobsPage,
  Q2NavCounts,
  Q2Sla,
  Q2Stats,
} from './q2.types';

export interface ApplicantsParams {
  tab: ApplicantTab;
  bucket?: ApplicantBucket;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useQ2Stats() {
  return useQuery({
    queryKey: queryKeys.q2.stats,
    queryFn: () => api.get<Q2Stats>('/q2/stats').then((r) => r.data),
  });
}

export function useQ2NavCounts() {
  return useQuery({
    queryKey: queryKeys.q2.navCounts,
    queryFn: () => api.get<Q2NavCounts>('/q2/nav-counts').then((r) => r.data),
  });
}

export function useQ2Sla() {
  return useQuery({
    queryKey: queryKeys.q2.sla,
    queryFn: () => api.get<Q2Sla>('/q2/sla').then((r) => r.data),
  });
}

/** Employer Jobs. `placeholderData` keeps the table on screen while a search debounce lands. */
export function useQ2Jobs(search?: string) {
  return useQuery({
    queryKey: queryKeys.q2.jobs(search ?? ''),
    queryFn: () =>
      api.get<Q2JobsPage>('/q2/jobs', { params: search ? { search } : {} }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useQ2JobApplicants(jobId: string | number, relevantOnly: boolean) {
  return useQuery({
    queryKey: queryKeys.q2.jobApplicants(jobId, relevantOnly),
    queryFn: () =>
      api
        .get<Q2JobApplicants>(`/q2/jobs/${jobId}`, { params: { relevantOnly } })
        .then((r) => r.data),
    enabled: jobId !== '' && jobId != null,
    placeholderData: keepPreviousData,
  });
}

export function useQ2Applicants(params: ApplicantsParams) {
  return useQuery({
    queryKey: queryKeys.q2.applicants(params),
    queryFn: () => api.get<Q2ApplicantsPage>('/q2/applicants', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useQ2Application(mapId: string | number) {
  return useQuery({
    queryKey: queryKeys.q2.application(mapId),
    queryFn: () => api.get<Q2Application>(`/q2/applications/${mapId}`).then((r) => r.data),
    enabled: mapId !== '' && mapId != null,
  });
}

export function useQ2Analytics() {
  return useQuery({
    queryKey: queryKeys.q2.analytics,
    queryFn: () => api.get<Q2Analytics>('/q2/analytics').then((r) => r.data),
  });
}

/**
 * Anything that changes review state invalidates the whole `['q2']` subtree: one decision
 * moves a row out of All Applicants, into one of the two decision buckets, and changes two of
 * the five dashboard cards and the SLA card at once. Invalidating only the detail query would
 * leave the rest of the workspace showing the pre-decision numbers.
 */
function useQ2Mutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.q2.root }),
  });
}

/**
 * Ticking a criterion re-scores the subset server-side and returns the whole application, so
 * the Total Match Score row and the "n/7 criteria" count stay in step with the checkboxes
 * without the page recomputing the weighting itself.
 */
export function useSetCriterion(mapId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { criterion: MatchCriterionKey; included: boolean }) =>
      api.patch<Q2Application>(`/q2/applications/${mapId}/criteria`, body).then((r) => r.data),
    // A checkbox does not move the row between screens, so only the detail is refreshed —
    // and it is written straight from the response to avoid a refetch flicker on every tick.
    onSuccess: (data) => qc.setQueryData(queryKeys.q2.application(mapId), data),
  });
}

export function useForwardToQ3(mapId: string | number) {
  return useQ2Mutation<{ note?: string } | void, { mapId: number; status: string }>((body) =>
    api
      .post<{ mapId: number; status: string }>(`/q2/applications/${mapId}/forward`, body ?? {})
      .then((r) => r.data),
  );
}

export function useSendBackToQ1(mapId: string | number) {
  return useQ2Mutation<{ note?: string } | void, { mapId: number; status: string }>((body) =>
    api
      .post<{ mapId: number; status: string }>(`/q2/applications/${mapId}/send-back`, body ?? {})
      .then((r) => r.data),
  );
}

export function useRejectApplication(mapId: string | number) {
  return useQ2Mutation<{ note?: string } | void, { mapId: number; status: string }>((body) =>
    api
      .post<{ mapId: number; status: string }>(`/q2/applications/${mapId}/reject`, body ?? {})
      .then((r) => r.data),
  );
}
