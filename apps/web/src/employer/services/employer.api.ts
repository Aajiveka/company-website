import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  BulkUploadResult,
  CompanyAnalytics,
  CompanyBilling,
  CompanyMasters,
  CompanyProfile,
  EmployerApplicant,
  EmployerApplicantDetail,
  ApplicantListParams,
  ApplicantListResponse,
  JobListParams,
  JobListResponse,
  JobListing,
  JobPostInput,
  ApplicantDecision,
  ApplicantPipelineStatus,
  UpdateCompanyProfileInput,
} from './employer.types';

export type {
  JobPostInput,
  JobListParams,
  JobListResponse,
  JobListing,
  EmployerApplicant,
  EmployerApplicantDetail,
  ApplicantListParams,
  ApplicantListResponse,
  CompanyAnalytics,
  CompanyBilling,
  ApplicantDecision,
  ApplicantPipelineStatus,
};

/** @deprecated Prefer `EmployerApplicant` — kept for legacy `features/clients` imports. */
export type ApplicantRow = EmployerApplicant;

/** Company profile (spClientGetCompanyInfo). HTTP stays /clients for API compatibility. */
export function useCompanyProfile() {
  return useQuery({
    queryKey: queryKeys.employer.company('me'),
    queryFn: () => api.get<CompanyProfile>('/clients/me').then((r) => r.data),
  });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCompanyProfileInput) =>
      api.patch<CompanyProfile>('/clients/me', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employer.company('me') }),
  });
}

export function useUploadCompanyLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post<CompanyProfile>('/clients/me/logo', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employer.company('me') }),
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

/** Restore an archived job to Active. */
export function useUnarchiveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/clients/me/jobs/${jobId}/activate`).then((r) => r.data),
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
export function useApplicants(params: ApplicantListParams = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  return useQuery({
    queryKey: [...queryKeys.employer.applicants(), { ...params, page, pageSize }],
    queryFn: async () => {
      const raw = await api
        .get<ApplicantListResponse | EmployerApplicant[]>('/clients/me/applicants', {
          params: {
            page,
            pageSize,
            ...(params.status ? { status: params.status } : {}),
            ...(params.q ? { q: params.q } : {}),
            ...(params.jobId ? { jobId: params.jobId } : {}),
            ...(params.city ? { city: params.city } : {}),
            ...(params.minExp != null ? { minExp: params.minExp } : {}),
            ...(params.maxNotice != null ? { maxNotice: params.maxNotice } : {}),
          },
        })
        .then((r) => r.data);

      // Backward-compat: older API / mocks returned a bare array.
      if (Array.isArray(raw)) {
        const total = raw.length;
        const start = (page - 1) * pageSize;
        const items = raw.slice(start, start + pageSize);
        return {
          items,
          total,
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize) || 0,
        } satisfies ApplicantListResponse;
      }

      return {
        items: raw.items ?? [],
        total: raw.total ?? raw.items?.length ?? 0,
        page: raw.page ?? page,
        pageSize: raw.pageSize ?? pageSize,
          pageCount: raw.pageCount ?? (Math.ceil((raw.total ?? 0) / pageSize) || 0),
      } satisfies ApplicantListResponse;
    },
  });
}

export function useApplicant(jobSubscriberMapId: number | null) {
  return useQuery({
    queryKey: ['employer', 'applicants', 'detail', jobSubscriberMapId],
    enabled: jobSubscriberMapId != null && jobSubscriberMapId > 0,
    queryFn: () =>
      api.get<EmployerApplicantDetail>(`/clients/me/applicants/${jobSubscriberMapId}`).then((r) => r.data),
  });
}

/** Full profiles for compare table (one request per selected application). */
export function useApplicantDetails(jobSubscriberMapIds: number[]) {
  const queries = useQueries({
    queries: jobSubscriberMapIds.map((id) => ({
      queryKey: ['employer', 'applicants', 'detail', id],
      enabled: id > 0,
      queryFn: () =>
        api.get<EmployerApplicantDetail>(`/clients/me/applicants/${id}`).then((r) => r.data),
    })),
  });

  const details = jobSubscriberMapIds
    .map((_, i) => queries[i]?.data)
    .filter((d): d is EmployerApplicantDetail => Boolean(d));

  return {
    details,
    isLoading: queries.some((q) => q.isLoading || q.isFetching),
    isError: queries.some((q) => q.isError),
    error: queries.find((q) => q.isError)?.error,
  };
}

/** Fetch applicant resume as a blob URL (auth header required — cannot use plain <a href>). */
export function useApplicantResumeBlob(jobSubscriberMapId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['employer', 'applicants', 'resume-blob', jobSubscriberMapId],
    enabled: enabled && jobSubscriberMapId != null && jobSubscriberMapId > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const res = await api.get(`/clients/me/applicants/${jobSubscriberMapId}/resume`, {
        params: { inline: 1 },
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const contentType = (res.headers['content-type'] as string | undefined) || blob.type || 'application/pdf';
      const typed = blob.type ? blob : new Blob([blob], { type: contentType });
      return {
        url: URL.createObjectURL(typed),
        contentType,
        isPdf: contentType.includes('pdf') || typed.type.includes('pdf'),
      };
    },
  });
}

export async function downloadApplicantResume(jobSubscriberMapId: number, fileName?: string | null) {
  const res = await api.get(`/clients/me/applicants/${jobSubscriberMapId}/resume`, {
    responseType: 'blob',
  });
  const href = URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName || 'resume.pdf';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export function useApplicantNotes(jobSubscriberMapId: number | null) {
  return useQuery({
    queryKey: ['employer', 'applicants', 'notes', jobSubscriberMapId],
    enabled: jobSubscriberMapId != null && jobSubscriberMapId > 0,
    queryFn: () =>
      api
        .get<{ notes: Array<{ noteId: number; note: string; createdAt: string; updatedBy: number | null }> }>(
          `/clients/me/applicants/${jobSubscriberMapId}/notes`,
        )
        .then((r) => r.data),
  });
}

export function useSaveApplicantNote(jobSubscriberMapId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (note: string) =>
      api.put(`/clients/me/applicants/${jobSubscriberMapId}/notes`, { note }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employer', 'applicants', 'notes', jobSubscriberMapId] });
    },
  });
}

export function useCompanyAnalytics() {
  return useQuery({
    queryKey: ['employer', 'analytics'],
    queryFn: () => api.get<CompanyAnalytics>('/clients/me/analytics').then((r) => r.data),
  });
}

export function useCompanyBilling() {
  return useQuery({
    queryKey: ['employer', 'billing'],
    queryFn: () => api.get<CompanyBilling>('/clients/me/billing').then((r) => r.data),
  });
}

export async function downloadBillingCsv() {
  const res = await api.get('/clients/me/billing/export', { responseType: 'blob' });
  const blob = res.data as Blob;
  const disposition = String(res.headers['content-disposition'] ?? '');
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const fileName = match?.[1] || `aajiveka-hire-billing-${new Date().toISOString().slice(0, 10)}.csv`;
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

/** Download full analytics audit CSV (summary + jobs + all applicants). */
export async function downloadAnalyticsAuditCsv() {
  const res = await api.get('/clients/me/analytics/export', { responseType: 'blob' });
  const blob = res.data as Blob;
  const disposition = String(res.headers['content-disposition'] ?? '');
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  const fileName = match?.[1] || `aajiveka-analytics-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function csvEscape(v: string | number | null | undefined) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV of the on-screen analytics summary + job performance. */
export function downloadAnalyticsSummaryCsv(data: CompanyAnalytics) {
  const lines: string[] = [];
  const row = (cells: Array<string | number | null | undefined>) => lines.push(cells.map(csvEscape).join(','));

  row(['Metric', 'Value']);
  row(['TotalJobs', data.totalJobs]);
  row(['ActiveJobs', data.activeJobs]);
  row(['ClosedJobs', data.closedJobs]);
  row(['DraftJobs', data.draftJobs]);
  row(['ArchivedJobs', data.archivedJobs]);
  row(['TotalApplications', data.totalApplications]);
  row(['Mapped', data.mapped]);
  row(['Shortlisted', data.shortlisted]);
  row(['InterviewScheduled', data.interviewScheduled]);
  row(['Hired', data.selected]);
  row(['Rejected', data.rejected]);
  row(['ShortlistRatePct', data.rates?.shortlistRate ?? '']);
  row(['InterviewRatePct', data.rates?.interviewRate ?? '']);
  row(['HireRatePct', data.rates?.hireRate ?? '']);
  row(['RejectRatePct', data.rates?.rejectRate ?? '']);
  lines.push('');
  row([
    'JobId',
    'Designation',
    'City',
    'Status',
    'Applications',
    'Shortlisted',
    'Interview',
    'Hired',
    'Rejected',
    'ShortlistRatePct',
    'HireRatePct',
  ]);
  for (const j of data.jobPerformance ?? []) {
    row([
      j.jobId,
      j.designation,
      j.city,
      j.status,
      j.applications,
      j.shortlisted,
      j.interviewScheduled,
      j.selected,
      j.rejected,
      j.shortlistRate,
      j.hireRate,
    ]);
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `aajiveka-analytics-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

/** Shortlist / Interview / Hire / Reject an applicant. */
export function useDecideApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobSubscriberMapId: number; decision: ApplicantDecision }) =>
      api
        .post(`/clients/me/applicants/${payload.jobSubscriberMapId}/decision`, { decision: payload.decision })
        .then((r) => r.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employer', 'applicants'] });
      void qc.invalidateQueries({ queryKey: ['employer', 'analytics'] });
      void qc.invalidateQueries({ queryKey: ['employer', 'billing'] });
    },
  });
}

/** Bulk pipeline decisions. */
export function useBulkDecideApplicants() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: number[]; decision: ApplicantDecision }) => {
      await Promise.all(
        payload.ids.map((id) => api.post(`/clients/me/applicants/${id}/decision`, { decision: payload.decision })),
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['employer', 'applicants'] });
      void qc.invalidateQueries({ queryKey: ['employer', 'analytics'] });
      void qc.invalidateQueries({ queryKey: ['employer', 'billing'] });
    },
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
