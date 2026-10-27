import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type {
  AdminApplicationDetail,
  AdminAuditEntry,
  AdminCompany,
  AdminJobDetail,
  AdminStats,
  AdminUser,
  AdminUserDetail,
  ApplicationsPage,
  EmployerRegistration,
  JobAction,
  JobsPage,
  Page,
  SetPasswordResult,
} from './admin.types';

const get = <T>(url: string, params?: object) => api.get<T>(url, { params }).then((r) => r.data);
const post = <T>(url: string, body?: unknown) => api.post<T>(url, body ?? {}).then((r) => r.data);
const patch = <T>(url: string, body?: unknown) => api.patch<T>(url, body ?? {}).then((r) => r.data);

/** Drops empty filters so they are not sent as `?q=` and do not split the cache key. */
function clean<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  ) as Partial<T>;
}

// ── Reads ──────────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({ queryKey: queryKeys.admin.stats, queryFn: () => get<AdminStats>('/admin/stats') });
}

export interface UsersParams {
  page: number;
  pageSize?: number;
  q?: string;
  roleId?: number | '';
  isActive?: 'true' | 'false' | '';
}

export function useAdminUsers(params: UsersParams) {
  const p = clean(params);
  return useQuery({
    queryKey: queryKeys.admin.users(p),
    queryFn: () => get<Page<AdminUser>>('/admin/users', p),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: number) {
  return useQuery({
    queryKey: queryKeys.admin.user(id),
    queryFn: () => get<AdminUserDetail>(`/admin/users/${id}`),
    enabled: Number.isFinite(id),
  });
}

export interface JobsParams {
  page: number;
  pageSize?: number;
  q?: string;
  status?: string;
  clientId?: number;
}

export function useAdminJobs(params: JobsParams) {
  const p = clean(params);
  return useQuery({
    queryKey: queryKeys.admin.jobs(p),
    queryFn: () => get<JobsPage>('/admin/jobs', p),
    placeholderData: keepPreviousData,
  });
}

export function useAdminJob(id: number) {
  return useQuery({
    queryKey: queryKeys.admin.job(id),
    queryFn: () => get<AdminJobDetail>(`/admin/jobs/${id}`),
    enabled: Number.isFinite(id),
  });
}

export interface ApplicationsParams {
  page: number;
  pageSize?: number;
  q?: string;
  statusId?: number | '';
  stage?: string;
  jobId?: number;
}

export function useAdminApplications(params: ApplicationsParams) {
  const p = clean(params);
  return useQuery({
    queryKey: queryKeys.admin.applications(p),
    queryFn: () => get<ApplicationsPage>('/admin/applications', p),
    placeholderData: keepPreviousData,
  });
}

export function useAdminApplication(id: number) {
  return useQuery({
    queryKey: queryKeys.admin.application(id),
    queryFn: () => get<AdminApplicationDetail>(`/admin/applications/${id}`),
    enabled: Number.isFinite(id),
  });
}

export function useAdminCompanies(params: { page: number; q?: string }) {
  const p = clean(params);
  return useQuery({
    queryKey: queryKeys.admin.companies(p),
    queryFn: () => get<Page<AdminCompany>>('/admin/companies', p),
    placeholderData: keepPreviousData,
  });
}

export interface AuditParams {
  page: number;
  pageSize?: number;
  action?: string;
  entity?: string;
  userId?: number;
}

export function useAdminAudit(params: AuditParams) {
  const p = clean(params);
  return useQuery({
    queryKey: queryKeys.admin.audit(p),
    queryFn: () => get<Page<AdminAuditEntry>>('/admin/audit-logs', p),
    placeholderData: keepPreviousData,
  });
}

export function useEmployerRegistrations(status?: string) {
  return useQuery({
    queryKey: queryKeys.admin.employerRegistrations(status),
    queryFn: () => get<EmployerRegistration[]>('/admin/employer-registrations', clean({ status })),
  });
}

/** States and cities for the approval city picker — the employer portal's own masters. */
export function useCityMasters(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'city-masters'],
    queryFn: () =>
      get<{ states: { id: number; label: string }[]; cities: { id: number; label: string; stateId: number }[] }>(
        '/clients/masters',
      ),
    enabled,
    staleTime: 60 * 60 * 1000,
  });
}

// ── Writes ─────────────────────────────────────────────────────────────
// Each one invalidates the whole ['admin'] tree: a role change moves the dashboard's counts,
// a job closing moves the applications view, and the audit trail gains a row for all of them.

function useAdminMutation<TVars, TResult>(fn: (v: TVars) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.admin.root }),
  });
}

export function useUpdateUser() {
  return useAdminMutation((v: { userId: number; roleId?: number; isActive?: boolean }) =>
    patch<{ ok: true }>(`/admin/users/${v.userId}`, { roleId: v.roleId, isActive: v.isActive }),
  );
}

export function useBulkUpdateUsers() {
  return useAdminMutation((v: { userIds: number[]; isActive?: boolean }) =>
    post<{ ok: true }>('/admin/users/bulk-update', v),
  );
}

export function useCreateStaffUser() {
  return useAdminMutation((v: { userName: string; fullName: string; email: string; roleId: number }) =>
    post<SetPasswordResult & { userId: number }>('/admin/users', v),
  );
}

export function useSendPasswordReset() {
  return useAdminMutation((userId: number) => post<SetPasswordResult>(`/admin/users/${userId}/password-reset`));
}

export function useModerateJobs() {
  return useAdminMutation((v: { jobIds: number[]; action: JobAction }) =>
    v.jobIds.length === 1
      ? post<{ ok: true; updated: number }>(`/admin/jobs/${v.jobIds[0]}/status`, { action: v.action })
      : post<{ ok: true; updated: number }>('/admin/jobs/bulk-moderate', v),
  );
}

export function useReviewEmployer() {
  return useAdminMutation((v: { id: number; decision: 'Approved' | 'Rejected'; notes?: string; cityId?: number }) =>
    post<{ ok: true }>(`/admin/employer-registrations/${v.id}/review`, {
      decision: v.decision,
      notes: v.notes,
      cityId: v.cityId,
    }),
  );
}
