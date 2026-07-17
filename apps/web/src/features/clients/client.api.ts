import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { CompanyMasters, CompanyProfile, JobListing } from './client.types';
import type { CandidateRow } from '@/features/recruitment/recruitment.types';

export type ApplicantRow = CandidateRow & { jobSubscriberMapId: number };

/** Company profile (spClientGetCompanyInfo). */
export function useCompanyProfile() {
  return useQuery({
    queryKey: queryKeys.client.company('me'),
    queryFn: () => api.get<CompanyProfile>('/clients/me').then((r) => r.data),
  });
}

/** Company job listing (spClientGetJoblisting). */
export function useCompanyJobs() {
  return useQuery({
    queryKey: queryKeys.client.jobs('me'),
    queryFn: () => api.get<JobListing[]>('/clients/me/jobs').then((r) => r.data),
  });
}

/** Matches apps/api's CreateJobDto/UpdateJobDto — every axis is an id, not free text. */
export interface JobPostInput {
  designationId: number;
  cityId: number;
  workModeId: number;
  employmentTypeId: number;
  industryTypeId?: number;
  minExp: number;
  minCtc: number;
  maxCtc: number;
  openings?: number;
  description: string;
  candidateProfile?: string;
  skillIds?: number[];
}

/** id-backed lookup lists for the job post/edit form. */
export function useCompanyMasters() {
  return useQuery({
    queryKey: ['client', 'masters'],
    queryFn: () => api.get<CompanyMasters>('/clients/masters').then((r) => r.data),
    staleTime: Infinity,
  });
}

/** Post a new job (spClientManageJob). */
export function usePostJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobPostInput) => api.post('/clients/me/jobs', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.client.jobs('me') }),
  });
}

/** Edit a job posting. */
export function useUpdateJob(jobId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<JobPostInput>) =>
      api.patch(`/clients/me/jobs/${jobId}`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.client.jobs('me') }),
  });
}

/** Close a job posting (spClientMarkJobInactive). */
export function useDeactivateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/clients/me/jobs/${jobId}/deactivate`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.client.jobs('me') }),
  });
}

/** Applicants across the company's jobs (spClientGetJobSubscribers). */
export function useApplicants() {
  return useQuery({
    queryKey: ['client', 'applicants'],
    queryFn: () => api.get<ApplicantRow[]>('/clients/me/applicants').then((r) => r.data),
  });
}

/** Shortlist or reject an applicant (spClientShortListRejectSubscriber). */
export function useDecideApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobSubscriberMapId: number; decision: 'Shortlisted' | 'Rejected' }) =>
      api
        .post(`/clients/me/applicants/${payload.jobSubscriberMapId}/decision`, { decision: payload.decision })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client', 'applicants'] }),
  });
}
