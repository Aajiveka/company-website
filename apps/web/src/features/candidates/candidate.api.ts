import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  AppliedJob,
  CandidateDocument,
  CandidateProfile,
  CvAccomplishmentEntry,
  CvCareerProfile,
  CvDiversity,
  CvEditProfile,
  CvItSkillEntry,
  CvLanguageEntry,
  CvMasters,
  CvPersonal,
  CvPersonalDetails,
  CvProfessional,
  CvProjectEntry,
  JobAlert,
  SavedJob,
} from './candidate.types';

const CV_EDIT_KEY = ['candidate', 'cv-edit'];

function invalidateCv(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: CV_EDIT_KEY });
  qc.invalidateQueries({ queryKey: queryKeys.candidate.profile('me') });
}

/** GET the logged-in candidate's profile (backed by spSubscriberGetCVToDisplay). */
export function useCandidateProfile() {
  return useQuery({
    queryKey: queryKeys.candidate.profile('me'),
    queryFn: () => api.get<CandidateProfile>('/candidates/me').then((r) => r.data),
  });
}

/** GET jobs the candidate has applied to (spSubscriberInterviews / mapping). */
export function useAppliedJobs(enabled = true) {
  return useQuery({
    queryKey: ['candidate', 'applied-jobs'],
    queryFn: () => api.get<AppliedJob[]>('/candidates/me/applied-jobs').then((r) => r.data),
    enabled,
    // Poll every 60s for status updates (powers notification bell)
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

/** id-backed lookup lists for the CV editor. */
export function useCvMasters() {
  return useQuery({
    queryKey: ['candidate', 'cv-masters'],
    queryFn: () => api.get<CvMasters>('/candidates/me/cv-masters').then((r) => r.data),
    staleTime: 10 * 60_000, // 10 minutes
  });
}

/** The candidate's own CV in edit-friendly shape (raw ids, not display strings). */
export function useCvEditProfile() {
  return useQuery({
    queryKey: CV_EDIT_KEY,
    queryFn: () => api.get<CvEditProfile>('/candidates/me/cv-edit').then((r) => r.data),
  });
}

/** Save personal details (spSubscriberCVUpdate_Personal). */
export function useUpdatePersonal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CvPersonal) => api.put('/candidates/me/personal', payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

/**
 * Save professional details, preferred locations and skill tags.
 *
 * The payload is partial on purpose: the API only replaces the keys it is sent, so an editor
 * that does not show preferred locations or skill tags must leave them out rather than
 * round-trip them and risk clobbering a concurrent change.
 */
export function useUpdateProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CvProfessional>) =>
      api.put('/candidates/me/professional', payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

/** Create or update one education entry. */
export function useUpsertEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      subscriberEducationId?: number;
      courseTypeId?: number;
      degreeId: number;
      instituteName?: string;
      passingYear?: number;
      courseMode?: string;
      marks?: string;
    }) => api.put('/candidates/me/education', payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

export function useDeleteEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/candidates/me/education/${id}`).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

/** Create or update one employment entry. */
export function useUpsertEmployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      subscriberEmployerId?: number;
      employer: string;
      designationId?: number;
      employeeTypeId?: number;
      joiningDate?: string;
      releavingDate?: string;
      flgCurrent?: boolean;
      salary?: number;
      jobDescr?: string;
      noticePeriodDays?: number;
    }) => api.put('/candidates/me/employment', payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

export function useDeleteEmployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/candidates/me/employment/${id}`).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

/** Create or update one certificate entry. */
export function useUpsertCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      subscriberCertificateId?: number;
      certificateName: string;
      certificateUrl?: string;
      certificationId?: string;
      validFromMonth?: number;
      validFromYear?: number;
      validTillMonth?: number;
      validTillYear?: number;
      neverExpires?: boolean;
    }) => api.put('/candidates/me/certificates', payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

/* --------------------------- Profile sections ---------------------------- *
 * One hook per section, mirroring the API: the profile page edits one section at a time,
 * and a single whole-profile mutation would let each dialog clear fields it never showed.
 * -------------------------------------------------------------------------- */

/** Shared shape: PUT one section, then refresh the CV and the profile header. */
function useSectionMutation<TPayload>(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TPayload) => api.put(path, payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

function useSectionDelete(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`${path}/${id}`).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

export function useUpdateHeadline() {
  return useSectionMutation<{ resumeHeadline: string }>('/candidates/me/headline');
}

export function useUpdateSummary() {
  return useSectionMutation<{ profileSummary: string }>('/candidates/me/summary');
}

export function useUpdateKeySkills() {
  return useSectionMutation<{ tagNames: string[] }>('/candidates/me/key-skills');
}

export function useUpdateCareerProfile() {
  return useSectionMutation<Partial<CvCareerProfile>>('/candidates/me/career-profile');
}

export function useUpdatePersonalDetails() {
  return useSectionMutation<Partial<CvPersonalDetails>>('/candidates/me/personal-details');
}

export function useUpdateDiversity() {
  return useSectionMutation<Partial<CvDiversity>>('/candidates/me/diversity');
}

export function useUpsertItSkill() {
  return useSectionMutation<Partial<CvItSkillEntry> & { skillName: string }>('/candidates/me/it-skills');
}

export function useDeleteItSkill() {
  return useSectionDelete('/candidates/me/it-skills');
}

export function useUpsertProject() {
  return useSectionMutation<Partial<CvProjectEntry> & { title: string }>('/candidates/me/projects');
}

export function useDeleteProject() {
  return useSectionDelete('/candidates/me/projects');
}

export function useUpsertAccomplishment() {
  return useSectionMutation<Partial<CvAccomplishmentEntry> & { kind: string; title: string }>(
    '/candidates/me/accomplishments',
  );
}

export function useDeleteAccomplishment() {
  return useSectionDelete('/candidates/me/accomplishments');
}

export function useUpsertLanguage() {
  return useSectionMutation<Partial<CvLanguageEntry> & { languageName: string; proficiencyId: number }>(
    '/candidates/me/languages',
  );
}

export function useDeleteLanguage() {
  return useSectionDelete('/candidates/me/languages');
}

export function useDeleteCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/candidates/me/certificates/${id}`).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

/** GET candidate documents + statuses (spSubscriberDoc). */
export function useCandidateDocuments() {
  return useQuery({
    queryKey: ['candidate', 'documents'],
    queryFn: () => api.get<CandidateDocument[]>('/candidates/me/documents').then((r) => r.data),
  });
}

/** Upload a requested document (candidate-doc.aspx). */
export function useUploadCandidateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentTypeId, file }: { documentTypeId: number; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post(`/candidates/me/documents/${documentTypeId}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate', 'documents'] }),
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

/** GET saved/bookmarked jobs. */
export function useSavedJobs() {
  return useQuery({
    queryKey: ['candidate', 'saved-jobs'],
    queryFn: () => api.get<SavedJob[]>('/candidates/me/saved-jobs').then((r) => r.data),
  });
}

/** GET just the saved job IDs (for bookmark toggle icons). */
export function useSavedJobIds(enabled = true) {
  return useQuery({
    queryKey: ['candidate', 'saved-job-ids'],
    queryFn: () => api.get<number[]>('/candidates/me/saved-job-ids').then((r) => r.data),
    enabled,
  });
}

/** Save / bookmark a job. */
export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.post(`/candidates/me/saved-jobs/${jobId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-jobs'] });
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-job-ids'] });
    },
  });
}

/** Remove a saved job bookmark. */
export function useUnsaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => api.delete(`/candidates/me/saved-jobs/${jobId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-jobs'] });
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-job-ids'] });
    },
  });
}

/** Change password (spSecChangePassword). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.post<{ message: string }>('/candidates/me/change-password', payload).then((r) => r.data),
  });
}

/** Upload a resume (multipart/form-data). */
export function useUploadResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (pct: number) => void }) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post<{ url: string; fileName: string }>('/files/resume', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
          },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.candidate.profile('me') }),
  });
}

/**
 * Download the stored resume.
 *
 * A plain `<a href download>` cannot be used: the API is bearer-authenticated and the browser
 * would send no token, so the link 401s. The file is fetched through the API client and saved
 * from a blob URL under the candidate's original filename.
 */
export function useDownloadResume() {
  return useMutation({
    mutationFn: async (fileName: string) => {
      const res = await api.get('/files/resume', { responseType: 'blob' });
      const href = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName || 'resume';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    },
  });
}

/** Delete the current resume. */
export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/files/resume').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.candidate.profile('me') }),
  });
}

/** Upload a profile photo / avatar (multipart/form-data). */
export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api
        .post<{ url: string }>('/files/avatar', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.candidate.profile('me') }),
  });
}

// ── Dashboard ──

export interface DashboardSummary {
  appliedCount: number;
  savedCount: number;
  interviewCount: number;
  profileCompletion: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['candidate', 'dashboard'],
    queryFn: () => api.get<DashboardSummary>('/candidates/me/dashboard').then((r) => r.data),
  });
}

// ── Notification Preferences ──

export interface NotificationPrefs {
  emailAlerts: boolean;
  pushAlerts: boolean;
  smsAlerts: boolean;
  jobAlertFrequency: 'Daily' | 'Weekly' | 'Instant';
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ['candidate', 'notification-prefs'],
    queryFn: () => api.get<NotificationPrefs>('/candidates/me/notification-prefs').then((r) => r.data),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<NotificationPrefs>) =>
      api.put('/candidates/me/notification-prefs', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate', 'notification-prefs'] }),
  });
}

// ── Saved Searches ──

export interface SavedSearchItem {
  id: number;
  name: string;
  query: string | null;
  filters: Record<string, unknown> | null;
  createdAt: string | null;
}

export function useSavedSearches() {
  return useQuery({
    queryKey: ['candidate', 'saved-searches'],
    queryFn: () => api.get<SavedSearchItem[]>('/candidates/me/saved-searches').then((r) => r.data),
  });
}

export function useCreateSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; query?: string; filters?: Record<string, unknown> }) =>
      api.post<SavedSearchItem>('/candidates/me/saved-searches', payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate', 'saved-searches'] }),
  });
}

export function useDeleteSavedSearch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/candidates/me/saved-searches/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate', 'saved-searches'] }),
  });
}

// ── Recommendations ──

export function useRecommendedJobs() {
  return useQuery({
    queryKey: ['candidate', 'recommendations'],
    queryFn: () => api.get('/jobs/recommended').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

// ── Activity ──

export function useActivity() {
  return useQuery({
    queryKey: ['candidate', 'activity'],
    queryFn: () => api.get('/candidates/me/activity').then((r) => r.data),
  });
}
