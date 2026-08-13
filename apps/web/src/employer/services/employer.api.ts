import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  BulkUploadResult,
  CompanyMasters,
  CompanyProfile,
  JobListParams,
  JobListResponse,
  JobListing,
  JobPostInput,
} from './employer.types';
import type { CandidateRow } from '@/features/recruitment/recruitment.types';

export type ApplicantRow = CandidateRow & { jobSubscriberMapId: number };
export type { JobPostInput, JobListParams, JobListResponse, JobListing };

/** Company profile (spClientGetCompanyInfo). HTTP stays /clients for API compatibility. */
export function useCompanyProfile() {
  return useQuery({
    queryKey: queryKeys.employer.company('me'),
    queryFn: () => api.get<CompanyProfile>('/clients/me').then((r) => r.data),
  });
}

/** Company job listing — paginated search/filter from backend. */
export function useCompanyJobs(params: JobListParams = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return useQuery({
    queryKey: queryKeys.employer.jobsList(params),
    queryFn: () =>
      api
        .get<JobListResponse>('/clients/me/jobs', {
          params: {
            page,
            pageSize,
            ...(params.q ? { q: params.q } : {}),
            ...(params.city ? { city: params.city } : {}),
            ...(params.status ? { status: params.status } : {}),
          },
        })
        .then((r) => r.data),
  });
}

/** id-backed lookup lists for the job post/edit form. */
export function useCompanyMasters() {
  return useQuery({
    queryKey: queryKeys.employer.masters(),
    queryFn: () => api.get<CompanyMasters>('/clients/masters').then((r) => r.data),
    staleTime: Infinity,
  });
}

/** Post a new job (spClientManageJob). Pass `{ data, draft: true }` or bare JobPostInput. */
export function usePostJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: JobPostInput | { data: JobPostInput; draft?: boolean }) => {
      const wrapped = 'data' in input && !('designationId' in input);
      const data = wrapped ? input.data : input;
      const draft = wrapped ? input.draft : undefined;
      return api
        .post('/clients/me/jobs', data, {
          params: draft ? { draft: 'true' } : undefined,
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}

/** Edit a job. Pass `{ data, draft? }` or bare Partial<JobPostInput>. */
export function useUpdateJob(jobId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<JobPostInput> | { data: Partial<JobPostInput>; draft?: boolean }) => {
      const wrapped = 'data' in input && !('designationId' in input);
      const data = wrapped ? input.data : input;
      const draft = wrapped ? input.draft : undefined;
      return api
        .patch(`/clients/me/jobs/${jobId}`, data, {
          params: draft === undefined ? undefined : { draft: draft ? 'true' : 'false' },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}

/** Close a job posting (spClientMarkJobInactive). */
export function useDeactivateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/clients/me/jobs/${jobId}/deactivate`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}

export type JobDetail = JobListing & {
  industryType?: string;
  skills?: string[];
};

export function useCompanyJob(jobId: number | null) {
  return useQuery({
    queryKey: ['employer', 'jobs', 'detail', jobId],
    enabled: jobId != null && jobId > 0,
    queryFn: () => api.get<JobDetail>(`/clients/me/jobs/${jobId}`).then((r) => r.data),
  });
}

export function useSetJobStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobId: number; status: 'Active' | 'Closed' | 'Archived' }) =>
      api.post(`/clients/me/jobs/${payload.jobId}/status`, { status: payload.status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}

export function useArchiveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/clients/me/jobs/${jobId}/archive`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.delete(`/clients/me/jobs/${jobId}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}

/** Applicants across the company's jobs (spClientGetJobSubscribers). */
export function useApplicants() {
  return useQuery({
    queryKey: queryKeys.employer.applicants(),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employer.applicants() }),
  });
}

/** Bulk shortlist or reject multiple applicants at once. */
export function useBulkDecideApplicants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: number[]; decision: 'Shortlisted' | 'Rejected' }) => {
      await Promise.all(
        payload.ids.map((id) =>
          api.post(`/clients/me/applicants/${id}/decision`, { decision: payload.decision }),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employer.applicants() }),
  });
}

/** Duplicate/repost a job (creates a new Active copy). */
export function useDuplicateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/clients/me/jobs/${jobId}/duplicate`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}

/** Upload a CSV/XLSX file for bulk job import (multipart/form-data). */
export function useUploadBulkJobs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (pct: number) => void }) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post<BulkUploadResult>('/clients/me/jobs/bulk-upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
          },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employer', 'jobs'] }),
  });
}
