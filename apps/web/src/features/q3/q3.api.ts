import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  CompanyReviewPage,
  CompanyReviewTab,
  ContactChannel,
  DocumentsDetail,
  InterviewsWeek,
  PipelinePage,
  PipelineTab,
  Q3Dashboard,
  Q3NavCounts,
  QueueItem,
  Recipients,
  ReferralBatch,
  ReturnMail,
  ReturnReason,
  ReturnedPage,
  ReturnedTab,
  RoundDecision,
  RoundSetupInput,
  RoundsDetail,
  Scheduling,
  Shortlist,
} from './q3.types';

const get = <T>(url: string, params?: object) => api.get<T>(url, { params }).then((r) => r.data);
const post = <T>(url: string, body?: unknown) => api.post<T>(url, body ?? {}).then((r) => r.data);

// ── Reads ──────────────────────────────────────────────────────────────

export function useQ3NavCounts() {
  return useQuery({ queryKey: queryKeys.q3.navCounts, queryFn: () => get<Q3NavCounts>('/q3/nav-counts') });
}

export function useQ3Dashboard() {
  return useQuery({ queryKey: queryKeys.q3.dashboard, queryFn: () => get<Q3Dashboard>('/q3/dashboard') });
}

export interface PipelineParams {
  stage: PipelineTab;
  search?: string;
  company?: string;
}

/** `placeholderData` keeps the table on screen while a tab switch or search lands. */
export function useQ3Pipeline(params: PipelineParams) {
  return useQuery({
    queryKey: queryKeys.q3.pipeline(params),
    queryFn: () => get<PipelinePage>('/q3/pipeline', params),
    placeholderData: keepPreviousData,
  });
}

/** The applications a detail screen walks through (its queue switcher). */
export function useQ3Queue(name: 'scheduling' | 'decisions' | 'documents' | 'offers') {
  return useQuery({ queryKey: queryKeys.q3.queue(name), queryFn: () => get<QueueItem[]>(`/q3/queues/${name}`) });
}

export function useQ3Referrals() {
  return useQuery({
    queryKey: queryKeys.q3.referrals,
    queryFn: () => get<{ batches: ReferralBatch[] }>('/q3/referrals'),
  });
}

export function useQ3CompanyReview(tab: CompanyReviewTab) {
  return useQuery({
    queryKey: queryKeys.q3.companyReview(tab),
    queryFn: () => get<CompanyReviewPage>('/q3/company-review', { tab }),
    placeholderData: keepPreviousData,
  });
}

export function useQ3Shortlist(mapId: number | null) {
  return useQuery({
    queryKey: queryKeys.q3.shortlist(mapId ?? ''),
    queryFn: () => get<Shortlist>(`/q3/applications/${mapId}/shortlist`),
    enabled: mapId != null,
  });
}

export function useQ3Scheduling(mapId: string | number) {
  return useQuery({
    queryKey: queryKeys.q3.scheduling(mapId),
    queryFn: () => get<Scheduling>(`/q3/applications/${mapId}/scheduling`),
    enabled: mapId !== '' && mapId != null,
  });
}

/** `week` is any YYYY-MM-DD in the week to show; '' is this week. */
export function useQ3Interviews(week: string) {
  return useQuery({
    queryKey: queryKeys.q3.interviews(week),
    queryFn: () => get<InterviewsWeek>('/q3/interviews', week ? { week } : undefined),
    placeholderData: keepPreviousData,
    // "Starts in 45 min" and "Up next" are clock-driven; keep them honest while the page is open.
    refetchInterval: 60_000,
  });
}

export function useQ3Rounds(mapId: string | number) {
  return useQuery({
    queryKey: queryKeys.q3.rounds(mapId),
    queryFn: () => get<RoundsDetail>(`/q3/applications/${mapId}/rounds`),
    enabled: mapId !== '' && mapId != null,
  });
}

export function useQ3Documents(mapId: string | number) {
  return useQuery({
    queryKey: queryKeys.q3.documents(mapId),
    queryFn: () => get<DocumentsDetail>(`/q3/applications/${mapId}/documents`),
    enabled: mapId !== '' && mapId != null,
  });
}

export function useQ3Returned(tab: ReturnedTab) {
  return useQuery({
    queryKey: queryKeys.q3.returned(tab),
    queryFn: () => get<ReturnedPage>('/q3/returned', { tab }),
    placeholderData: keepPreviousData,
  });
}

export function useQ3ReturnMail(referralId: number | null) {
  return useQuery({
    queryKey: queryKeys.q3.returnMail(referralId ?? 0),
    queryFn: () => get<ReturnMail>(`/q3/returned/${referralId}/mail`),
    enabled: referralId != null,
  });
}

// ── Writes ─────────────────────────────────────────────────────────────

/**
 * Every Q3 action invalidates the whole `['q3']` subtree. One action moves an application
 * between stages, so it changes the sidebar badges, the dashboard cards, the pipeline and at
 * least two screens at once — refreshing only the screen that acted would leave the rest
 * showing the old stage.
 */
function useQ3Mutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.q3.root }),
  });
}

export const useForwardCvs = () =>
  useQ3Mutation((referralIds: number[]) => post<{ forwarded: number }>('/q3/referrals/forward', { referralIds }));

export const useReturnCvs = () =>
  useQ3Mutation((body: { items: Array<{ referralId: number; reason: ReturnReason }>; note?: string; emailQ2: boolean }) =>
    post<{ returned: number }>('/q3/referrals/return', body),
  );

/** "Reminders sent to 3 companies · CVs expiring within 2 days". */
export const useRemindExpiring = () =>
  useQ3Mutation(() =>
    post<{ companies: number; cvs: number; unreachable: string[] }>('/q3/company-review/remind-expiring'),
  );

export const useSetupRound = (mapId: number) =>
  useQ3Mutation((body: RoundSetupInput) =>
    api.put<{ roundId: number }>(`/q3/applications/${mapId}/round-setup`, body).then((r) => r.data),
  );

export const useLogContact = (mapId: number) =>
  useQ3Mutation((body: { channel: ContactChannel; note: string; roundId?: number }) =>
    post<{ logged: boolean; attempts: number }>(`/q3/applications/${mapId}/contact`, body),
  );

export const useSlotAvailability = () =>
  useQ3Mutation(({ roundId, slotId, unavailable }: { roundId: number; slotId: number; unavailable: boolean }) =>
    api
      .post<{ slotId: number; isUnavailable: boolean }>(`/q3/rounds/${roundId}/slots/${slotId}/availability`, {}, { params: { unavailable } })
      .then((r) => r.data),
  );

export const useRequestSlots = () =>
  useQ3Mutation((roundId: number) =>
    post<{ requested: boolean; mailed: boolean; company: string }>(`/q3/rounds/${roundId}/request-slots`),
  );

/** Not a state change, so it does not invalidate anything. */
export const useGenerateMeetingLink = () =>
  useMutation({ mutationFn: () => post<{ link: string }>('/q3/meeting-link') });

export const useConfirmSlot = () =>
  useQ3Mutation(({ roundId, ...body }: { roundId: number; slotId: number; meetingLink?: string; recipients: Recipients }) =>
    post<{ confirmed: boolean; sent: number; scheduledAt: string }>(`/q3/rounds/${roundId}/confirm`, body),
  );

export const useRemind = () =>
  useQ3Mutation((roundId: number) =>
    post<{ reminded: boolean; name: string; round: string; at: string }>(`/q3/rounds/${roundId}/remind`),
  );

export const useChecklist = () =>
  useQ3Mutation(({ roundId, ...body }: { roundId: number; item: 'candidateConfirmed' | 'candidateJoined'; done: boolean }) =>
    post(`/q3/rounds/${roundId}/checklist`, body),
  );

export const useReschedule = () =>
  useQ3Mutation((roundId: number) =>
    post<{ status: 'NoShow' | 'RescheduleRequested'; mapId: number }>(`/q3/rounds/${roundId}/reschedule`),
  );

export const useMarkConducted = () =>
  useQ3Mutation((roundId: number) => post<{ mapId: number }>(`/q3/rounds/${roundId}/conducted`));

export const useNudge = () =>
  useQ3Mutation((mapId: number) =>
    post<{ nudged: boolean; company: string; name: string; round: string }>(`/q3/applications/${mapId}/nudge`),
  );

export const useRecordDecision = () =>
  useQ3Mutation(({ roundId, ...body }: { roundId: number; decision: RoundDecision; sendMail: boolean; requestSlots?: boolean; feedback?: string }) =>
    post<{ decision: RoundDecision; mailed: boolean; nextRoundId: number | null }>(`/q3/rounds/${roundId}/decision`, body),
  );

export const useSendDecisionMail = () =>
  useQ3Mutation((roundId: number) =>
    post<{ sent: boolean; name: string; company: string; round: string }>(`/q3/rounds/${roundId}/decision-mail`),
  );

export const useVerifyDocument = () =>
  useQ3Mutation((docUploadId: number) =>
    post<{ verified: number; total: number; name: string }>(`/q3/documents/${docUploadId}/verify`),
  );

export const useSendBackDocument = () =>
  useQ3Mutation(({ docUploadId, comment }: { docUploadId: number; comment: string }) =>
    post<{ sentBack: boolean; name: string }>(`/q3/documents/${docUploadId}/send-back`, { comment }),
  );

export const useRequestDocuments = (mapId: number) =>
  useQ3Mutation((body: { documentTypeIds: number[]; message: string; email: boolean; whatsapp: boolean }) =>
    post<{ requested: number; channels: string; dueAt: string | null }>(`/q3/applications/${mapId}/documents/request`, body),
  );

export const useForwardDocuments = (mapId: number) =>
  useQ3Mutation(() => post<{ forwarded: number; company: string }>(`/q3/applications/${mapId}/documents/forward`));

export const useApproveDocuments = (mapId: number) =>
  useQ3Mutation(() => post<{ approved: boolean }>(`/q3/applications/${mapId}/documents/approve`));

export const useGenerateOffer = (mapId: number) =>
  useQ3Mutation((body: { designation: string; ctc: string; joiningDate: string; location?: string }) =>
    post<{ offerId: number }>(`/q3/applications/${mapId}/offer`, body),
  );

export const useMarkJoined = (mapId: number) =>
  useQ3Mutation(() => post<{ joined: boolean }>(`/q3/applications/${mapId}/joined`));

export const useResendReturnMail = () =>
  useQ3Mutation((referralId: number) => post<{ sent: boolean }>(`/q3/returned/${referralId}/resend`));

/**
 * The uploaded file as a Blob — for the preview modal and Download. Fetched through the API
 * client so the bearer token goes with it; a plain <a href> would arrive unauthenticated.
 */
export async function fetchDocumentFile(docUploadId: number, preview: boolean) {
  const res = await api.get<Blob>(`/q3/documents/${docUploadId}/file`, {
    params: { preview },
    responseType: 'blob',
  });
  return res.data;
}
