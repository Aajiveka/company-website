import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { CandidateProfile } from '@/features/candidates/candidate.types';
import type {
  CandidateDocReview,
  CandidatesPage,
  CandidatesQuery,
  DocumentTypeOption,
  EligibleApplication,
  InterviewMode,
  InterviewRow,
  JobOption,
  QC1Stats,
  RegistrationStatus,
} from './recruitment.types';

export type CandidateDetail = CandidateProfile & { registrationStatus: RegistrationStatus };

/** Paginated candidate listing with search/status filters. */
export function useCandidates(params: CandidatesQuery) {
  return useQuery({
    queryKey: queryKeys.recruitment.candidates(params),
    queryFn: () =>
      api.get<CandidatesPage>('/recruitment/candidates', { params }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

/** QC1 dashboard aggregate counts. */
export function useQC1Stats() {
  return useQuery({
    queryKey: queryKeys.recruitment.qc1Dashboard,
    queryFn: () => api.get<QC1Stats>('/recruitment/qc1/stats').then((r) => r.data),
  });
}

/** Single candidate detail (spSubscriberGetCVToDisplay by id), incl. registration status. */
export function useCandidateDetail(id: string | number) {
  return useQuery({
    queryKey: queryKeys.candidate.profile(id),
    queryFn: () => api.get<CandidateDetail>(`/recruitment/candidates/${id}`).then((r) => r.data),
  });
}

/** Approve/reject a candidate's registration (spQC1ApproveRejectCandidate). */
export function useDecideCandidate(id: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decision: 'Approved' | 'Rejected') =>
      api.post(`/recruitment/candidates/${id}/decision`, { decision }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.candidate.profile(id) }),
  });
}

/** Active jobs, for the assign-job picker. */
export function useActiveJobs() {
  return useQuery({
    queryKey: ['recruitment', 'jobs'],
    queryFn: () => api.get<JobOption[]>('/recruitment/jobs').then((r) => r.data),
  });
}

/** Staff "assign candidate to job" (assign-job.aspx). */
export function useAssignJob(subscriberId: string | number) {
  return useMutation({
    mutationFn: (jobId: number) =>
      api.post(`/recruitment/candidates/${subscriberId}/assign-job`, { jobId }).then((r) => r.data),
  });
}

/** Interview schedule (spClientGetDataForInterview / spSubscriberInterviews). */
export function useInterviews() {
  return useQuery({
    queryKey: ['recruitment', 'interviews'],
    queryFn: () => api.get<InterviewRow[]>('/recruitment/interviews').then((r) => r.data),
  });
}

/** Mapped applications with no interview yet — the schedule-interview picker. */
export function useEligibleForInterview() {
  return useQuery({
    queryKey: ['recruitment', 'interviews', 'eligible'],
    queryFn: () => api.get<EligibleApplication[]>('/recruitment/interviews/eligible').then((r) => r.data),
  });
}

/** Interview mode master list. */
export function useInterviewModes() {
  return useQuery({
    queryKey: ['recruitment', 'interview-modes'],
    queryFn: () => api.get<InterviewMode[]>('/recruitment/interview-modes').then((r) => r.data),
    staleTime: Infinity,
  });
}

/** Schedule an interview (schedule-Interview.aspx). */
export function useScheduleInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobSubscriberMapId: number; interviewModeId: number; interviewTime: string; location?: string }) =>
      api.post('/recruitment/interviews', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment', 'interviews'] });
      qc.invalidateQueries({ queryKey: ['recruitment', 'interviews', 'eligible'] });
    },
  });
}

/** Mark an interview Completed or Cancelled (Interview-status.aspx). */
export function useUpdateInterviewStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewStatusId, ...body }: { interviewStatusId: number; status: 'Completed' | 'Cancelled'; comments?: string }) =>
      api.post(`/recruitment/interviews/${interviewStatusId}/status`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'interviews'] }),
  });
}

/** Candidate-uploadable document types, for the assign-documents checklist. */
export function useDocumentTypes() {
  return useQuery({
    queryKey: ['recruitment', 'document-types'],
    queryFn: () => api.get<DocumentTypeOption[]>('/recruitment/document-types').then((r) => r.data),
    staleTime: Infinity,
  });
}

/** QC assigns which documents a candidate must submit (mark-documents.aspx). */
export function useAssignDocuments(subscriberId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (documentTypeIds: number[]) =>
      api.post(`/recruitment/candidates/${subscriberId}/documents`, { documentTypeIds }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.candidate.profile(subscriberId) }),
  });
}

/** Documents awaiting QC review (spQC2GetMappedDocuments). */
export function useDocumentReviews() {
  return useQuery({
    queryKey: ['recruitment', 'doc-reviews'],
    queryFn: () => api.get<CandidateDocReview[]>('/recruitment/documents').then((r) => r.data),
  });
}

/** Approve/reject a document (spClientUpdateMapDocumentStatus). */
export function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { documentId: number; status: 'Verified' | 'Rejected' }) =>
      api.post('/recruitment/documents/review', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'doc-reviews'] }),
  });
}
