import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

/**
 * Portal-only endpoints added alongside the redesign: referrals, privacy, and the two
 * account-lifecycle requests. Everything else the portal needs already had a hook in
 * `candidate.api.ts` and is reused from there.
 */

/* ---------------------------------- Referrals ---------------------------------- */

export interface ReferralRow {
  referralId: number;
  name: string;
  email: string | null;
  mobile: string | null;
  status: string;
  rewardRupees: number;
  rewardPaid: boolean;
  invitedAt: string;
}

export interface ReferralSummary {
  code: string;
  totalInvited: number;
  successfulSignups: number;
  earnedRupees: number;
  pendingRupees: number;
  referrals: ReferralRow[];
}

const REFERRALS_KEY = ['candidate', 'referrals'] as const;

export function useReferrals() {
  return useQuery({
    queryKey: REFERRALS_KEY,
    queryFn: () => api.get<ReferralSummary>('/candidates/me/referrals').then((r) => r.data),
  });
}

export function useCreateReferral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; email?: string; mobile?: string }) =>
      api.post<{ referralId: number; duplicate: boolean }>('/candidates/me/referrals', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: REFERRALS_KEY }),
  });
}

/* ----------------------------------- Privacy ----------------------------------- */

export interface PrivacySettings {
  showCurrentEmployer: boolean;
  allowRecruiterMessages: boolean;
  exportRequestedAt: string | null;
  deletionRequestedAt: string | null;
}

const PRIVACY_KEY = ['candidate', 'privacy'] as const;

export function usePrivacySettings() {
  return useQuery({
    queryKey: PRIVACY_KEY,
    queryFn: () => api.get<PrivacySettings>('/candidates/me/privacy').then((r) => r.data),
  });
}

export function useUpdatePrivacy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Pick<PrivacySettings, 'showCurrentEmployer' | 'allowRecruiterMessages'>>) =>
      api.put<PrivacySettings>('/candidates/me/privacy', payload).then((r) => r.data),
    onSuccess: (data) => qc.setQueryData(PRIVACY_KEY, data),
  });
}

export function useRequestDataExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ requestedAt: string }>('/candidates/me/export').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRIVACY_KEY }),
  });
}

export function useRequestAccountDeletion() {
  return useMutation({
    mutationFn: () => api.post<{ requestedAt: string }>('/candidates/me/delete-account').then((r) => r.data),
  });
}
