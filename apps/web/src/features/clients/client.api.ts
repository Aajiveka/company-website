import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { CompanyProfile, JobListing } from './client.types';
import type { CandidateRow } from '@/features/recruitment/recruitment.types';

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

export interface JobPostInput {
  designation: string;
  city: string;
  workMode: string;
  employmentType: string;
  minExp: number;
  minCtc: number;
  maxCtc: number;
  jobDescr: string;
}

/** Post a new job (spClientManageJob). */
export function usePostJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobPostInput) => api.post('/clients/me/jobs', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.client.jobs('me') }),
  });
}

/** Applicants across the company's jobs (spClientGetJobSubscribers). */
export function useApplicants() {
  return useQuery({
    queryKey: ['client', 'applicants'],
    queryFn: () => api.get<CandidateRow[]>('/clients/me/applicants').then((r) => r.data),
  });
}
