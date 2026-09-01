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
  InterviewRoundRow,
  InterviewRow,
  JobOption,
  OfferLetterRow,
  QC1Stats,
  ReferralRow,
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

export type CandidateDecision =
  | 'Approved'
  | 'Rejected'
  | 'OnHold'
  | 'NeedMoreInfo'
  | 'Duplicate'
  | 'Withdrawn';

/** Approve/reject/hold a candidate's registration (spQC1ApproveRejectCandidate). */
export function useDecideCandidate(id: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { decision: CandidateDecision; reason?: string }) =>
      api.post(`/recruitment/candidates/${id}/decision`, vars).then((r) => r.data),
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

export interface ScoreBreakdown {
  totalScore: number;
  skillScore: number;
  experienceScore: number;
  jobRoleScore: number;
  educationScore: number;
  locationScore: number;
  salaryScore: number;
  noticePeriodScore: number;
}

/** Compute/refresh match score for an application. */
export function useScoreApplication() {
  return useMutation({
    mutationFn: (applicationId: number) =>
      api.post<ScoreBreakdown>(`/recruitment/applications/${applicationId}/score`).then((r) => r.data),
  });
}

// ── CV Referral pipeline (Q2 → Q3 → Company) ─────────────────────────

/** List CV referrals. */
export function useReferrals(status?: string) {
  return useQuery({
    queryKey: ['recruitment', 'referrals', status],
    queryFn: () =>
      api.get<ReferralRow[]>('/recruitment/referrals', { params: status ? { status } : {} }).then((r) => r.data),
  });
}

/** Q2 refers candidate-job mappings to Q3. */
export function useReferToQ3() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobSubscriberMapIds: number[]) =>
      api.post('/recruitment/referrals', { jobSubscriberMapIds }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'referrals'] }),
  });
}

/** Q3 forwards CVs to the company. */
export function useForwardToCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (referralIds: number[]) =>
      api.post('/recruitment/referrals/forward', { referralIds }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'referrals'] }),
  });
}

// ── Multi-round interview management ──────────────────────────────────

/** List interview rounds for a job-subscriber mapping. */
export function useInterviewRounds(mapId: number | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'interview-rounds', mapId],
    queryFn: () =>
      api.get<InterviewRoundRow[]>(`/recruitment/interview-rounds/${mapId}`).then((r) => r.data),
    enabled: mapId != null,
  });
}

/** Create an interview round. */
export function useCreateInterviewRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      jobSubscriberMapId: number;
      roundNumber: number;
      roundName: string;
      interviewerName?: string;
      interviewerEmail?: string;
      hrName?: string;
      hrEmail?: string;
      interviewMode: string;
      meetingLink?: string;
      slots?: string[];
    }) => api.post('/recruitment/interview-rounds', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'interview-rounds'] }),
  });
}

/** Candidate selects a time slot. */
export function useSelectSlot(roundId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slotId: number) =>
      api.post(`/recruitment/interview-rounds/${roundId}/select-slot`, { slotId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'interview-rounds'] }),
  });
}

/** Submit interview round result. */
export function useSubmitRoundResult(roundId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { result: 'Passed' | 'Failed' | 'Hold'; feedback?: string }) =>
      api.post(`/recruitment/interview-rounds/${roundId}/result`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'interview-rounds'] }),
  });
}

// ── Offer letter management ───────────────────────────────────────────

/** Get offer letter for a job-subscriber mapping. */
export function useOffer(mapId: number | undefined) {
  return useQuery({
    queryKey: ['recruitment', 'offers', mapId],
    queryFn: () =>
      api.get<OfferLetterRow | null>(`/recruitment/offers/${mapId}`).then((r) => r.data),
    enabled: mapId != null,
  });
}

/** Create a draft offer letter. */
export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      jobSubscriberMapId: number;
      offerDetails: Record<string, unknown>;
      joiningDate?: string;
    }) => api.post('/recruitment/offers', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'offers'] }),
  });
}

/** Send an offer letter to the candidate. */
export function useSendOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: number) =>
      api.post(`/recruitment/offers/${offerId}/send`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'offers'] }),
  });
}

/** Candidate responds to an offer (accept/reject). */
export function useRespondToOffer(offerId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accept: boolean) =>
      api.post(`/recruitment/offers/${offerId}/respond`, { accept }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment', 'offers'] }),
  });
}
