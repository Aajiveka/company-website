import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { AppliedJob, CandidateDocument, CandidateProfile, JobAlert } from './candidate.types';

/** GET the logged-in candidate's profile (backed by spSubscriberGetCVToDisplay). */
export function useCandidateProfile() {
  return useQuery({
    queryKey: queryKeys.candidate.profile('me'),
    queryFn: () => api.get<CandidateProfile>('/candidates/me').then((r) => r.data),
  });
}

/** GET jobs the candidate has applied to (spSubscriberInterviews / mapping). */
export function useAppliedJobs() {
  return useQuery({
    queryKey: ['candidate', 'applied-jobs'],
    queryFn: () => api.get<AppliedJob[]>('/candidates/me/applied-jobs').then((r) => r.data),
  });
}

/** GET candidate documents + statuses (spSubscriberDoc). */
export function useCandidateDocuments() {
  return useQuery({
    queryKey: ['candidate', 'documents'],
    queryFn: () => api.get<CandidateDocument[]>('/candidates/me/documents').then((r) => r.data),
  });
}

/** GET saved job alerts. */
export function useJobAlerts() {
  return useQuery({
    queryKey: ['candidate', 'job-alerts'],
    queryFn: () => api.get<JobAlert[]>('/candidates/me/job-alerts').then((r) => r.data),
  });
}

/** Create a job alert. */
export function useCreateJobAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<JobAlert, 'alertId'>) =>
      api.post<JobAlert>('/candidates/me/job-alerts', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate', 'job-alerts'] }),
  });
}

/** Change password (spSecChangePassword). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.post<{ message: string }>('/candidates/me/change-password', payload).then((r) => r.data),
  });
}
