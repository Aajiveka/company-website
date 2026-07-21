import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  AppliedJob,
  CandidateDocument,
  CandidateProfile,
  CvEditProfile,
  CvMasters,
  CvPersonal,
  CvProfessional,
  JobAlert,
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
export function useAppliedJobs() {
  return useQuery({
    queryKey: ['candidate', 'applied-jobs'],
    queryFn: () => api.get<AppliedJob[]>('/candidates/me/applied-jobs').then((r) => r.data),
  });
}

/** id-backed lookup lists for the CV editor. */
export function useCvMasters() {
  return useQuery({
    queryKey: ['candidate', 'cv-masters'],
    queryFn: () => api.get<CvMasters>('/candidates/me/cv-masters').then((r) => r.data),
    staleTime: Infinity,
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

/** Save professional details, preferred locations and skill tags. */
export function useUpdateProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CvProfessional) => api.put('/candidates/me/professional', payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
}

/** Create or update one education entry. */
export function useUpsertEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { subscriberEducationId?: number; courseTypeId: number; degreeId: number }) =>
      api.put('/candidates/me/education', payload).then((r) => r.data),
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
    mutationFn: (payload: { subscriberCertificateId?: number; certificateName: string }) =>
      api.put('/candidates/me/certificates', payload).then((r) => r.data),
    onSuccess: () => invalidateCv(qc),
  });
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

/** Change password (spSecChangePassword). */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.post<{ message: string }>('/candidates/me/change-password', payload).then((r) => r.data),
  });
}
