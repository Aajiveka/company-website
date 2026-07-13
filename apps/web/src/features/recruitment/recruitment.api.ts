import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { CandidateProfile } from '@/features/candidates/candidate.types';
import type {
  CandidateDocReview,
  CandidatesPage,
  CandidatesQuery,
  InterviewRow,
  QC1Stats,
} from './recruitment.types';

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

/** Single candidate detail (spSubscriberGetCVToDisplay by id). */
export function useCandidateDetail(id: string | number) {
  return useQuery({
    queryKey: queryKeys.candidate.profile(id),
    queryFn: () => api.get<CandidateProfile>(`/recruitment/candidates/${id}`).then((r) => r.data),
  });
}

/** Interview schedule (spClientGetDataForInterview / spSubscriberInterviews). */
export function useInterviews() {
  return useQuery({
    queryKey: ['recruitment', 'interviews'],
    queryFn: () => api.get<InterviewRow[]>('/recruitment/interviews').then((r) => r.data),
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
