import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  ChecklistKey,
  ContactChannel,
  ContactLogEntry,
  Q1Analytics,
  Q1NavCounts,
  Q1Profile,
  Q1Stats,
  QueuePage,
  QueueTab,
  ScreeningState,
} from './q1.types';

export interface QueueParams {
  tab: QueueTab;
  search?: string;
  priority?: string;
  experience?: string;
  cvOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export function useQ1Stats() {
  return useQuery({
    queryKey: queryKeys.q1.stats,
    queryFn: () => api.get<Q1Stats>('/q1/stats').then((r) => r.data),
  });
}

export function useQ1NavCounts() {
  return useQuery({
    queryKey: queryKeys.q1.navCounts,
    queryFn: () => api.get<Q1NavCounts>('/q1/nav-counts').then((r) => r.data),
  });
}

/** The Candidate Queue. `placeholderData` keeps the table on screen while a tab switch loads. */
export function useQ1Queue(params: QueueParams) {
  return useQuery({
    queryKey: queryKeys.q1.queue(params),
    queryFn: () => api.get<QueuePage>('/q1/candidates', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useQ1Profile(id: string | number) {
  return useQuery({
    queryKey: queryKeys.q1.profile(id),
    queryFn: () => api.get<Q1Profile>(`/q1/candidates/${id}`).then((r) => r.data),
    enabled: id !== '' && id != null,
  });
}

export function useQ1ContactLog(id: string | number) {
  return useQuery({
    queryKey: queryKeys.q1.contactLog(id),
    queryFn: () => api.get<ContactLogEntry[]>(`/q1/candidates/${id}/contact-log`).then((r) => r.data),
    enabled: id !== '' && id != null,
  });
}

export function useQ1Analytics() {
  return useQuery({
    queryKey: queryKeys.q1.analytics,
    queryFn: () => api.get<Q1Analytics>('/q1/analytics').then((r) => r.data),
  });
}

/**
 * Anything that changes screening state invalidates the whole `['q1']` subtree: a status
 * change moves the candidate between tabs, changes two sidebar badges and three dashboard
 * cards at once, so invalidating only the profile would leave the rest of the workspace
 * showing yesterday's numbers.
 */
function useQ1Mutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.q1.root }),
  });
}

export function useSetChecklistItem(id: string | number) {
  return useQ1Mutation<{ item: ChecklistKey; checked: boolean }, ScreeningState>((body) =>
    api.patch<ScreeningState>(`/q1/candidates/${id}/checklist`, body).then((r) => r.data),
  );
}

export function useSetAllChecklist(id: string | number) {
  return useQ1Mutation<boolean, ScreeningState>((checked) =>
    api.patch<ScreeningState>(`/q1/candidates/${id}/checklist/all`, { checked }).then((r) => r.data),
  );
}

export function useVerifyCandidate(id: string | number) {
  return useQ1Mutation<void, ScreeningState>(() =>
    api.post<ScreeningState>(`/q1/candidates/${id}/verify`).then((r) => r.data),
  );
}

export interface ContactPayload {
  channel: ContactChannel;
  reason?: string;
  internalNote?: string;
}

export function useContactCandidate(id: string | number) {
  return useQ1Mutation<ContactPayload, { contacted: boolean; missingItems: string[] }>((body) =>
    api.post(`/q1/candidates/${id}/contact`, body).then((r) => r.data),
  );
}

export function useRequestProfileUpdate(id: string | number) {
  return useQ1Mutation<ContactPayload, { contacted: boolean; missingItems: string[] }>((body) =>
    api.post(`/q1/candidates/${id}/request-update`, body).then((r) => r.data),
  );
}

export function useRequestCv(id: string | number) {
  return useQ1Mutation<ContactPayload, { contacted: boolean; missingItems: string[] }>((body) =>
    api.post(`/q1/candidates/${id}/request-cv`, body).then((r) => r.data),
  );
}

export interface StatusPayload {
  status: 'FollowUp' | 'NoResponse' | 'NotInterested';
  followUpDate?: string;
  followUpTime?: string;
  contactAttempts?: number;
  nextAttemptAt?: string;
  notInterestedReason?: string;
}

export function useUpdateScreeningStatus(id: string | number) {
  return useQ1Mutation<StatusPayload, ScreeningState>((body) =>
    api.post<ScreeningState>(`/q1/candidates/${id}/status`, body).then((r) => r.data),
  );
}
