import { http, HttpResponse } from 'msw';
import type { CvEmploymentEntry, CvPersonal, CvProfessional } from '@/features/candidates/candidate.types';
import type { JobListing } from '@/features/clients/client.types';
import {
  ACTIVE_JOBS,
  addAppliedJob,
  addInterview,
  addJobAlert,
  APPLICANT_ROWS,
  APPLIED_JOB_LIST,
  assignDocumentTypes,
  CANDIDATE_DOCUMENTS,
  CANDIDATE_PROFILE,
  CANDIDATE_REGISTRATION_STATUS,
  CANDIDATE_ROWS,
  COMPANY_JOBS,
  COMPANY_MASTERS,
  COMPANY_PROFILE,
  CV_EDIT_PROFILE,
  CV_MASTERS,
  deactivateCompanyJob,
  decideApplicant,
  decideCandidate,
  deleteCvCertificate,
  deleteCvEducation,
  deleteCvEmployment,
  DEMO_USERS,
  DOC_REVIEWS,
  DOCUMENT_TYPES,
  ELIGIBLE_APPLICATIONS,
  INTERVIEW_MODES,
  INTERVIEWS,
  JOB_ALERTS,
  JOB_DESIGNATIONS,
  JOB_INDUSTRIES,
  JOB_LOCATIONS,
  PUBLIC_JOBS,
  QC1_STATS,
  makeSession,
  reviewDoc,
  updateCompanyJob,
  updateCvPersonal,
  updateCvProfessional,
  updateInterviewStatus,
  uploadCandidateDocument,
  upsertCvCertificate,
  upsertCvEducation,
  upsertCvEmployment,
} from './data';

const BASE = '/api';

// Resolve the "current user" from the mock bearer token (mock-access-<id>).
function userFromAuth(request: Request) {
  const auth = request.headers.get('Authorization') ?? '';
  const id = Number(auth.replace('Bearer mock-access-', ''));
  return DEMO_USERS.find((u) => u.userId === id) ?? null;
}

export const handlers = [
  // ------------------------------ Auth --------------------------------
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const { userName, password } = (await request.json()) as { userName: string; password: string };
    const user = DEMO_USERS.find(
      (u) => (u.userName === userName || u.email === userName) && u.password === password,
    );
    if (!user) return HttpResponse.json({ message: 'Invalid username or password' }, { status: 401 });
    return HttpResponse.json(makeSession(user));
  }),

  http.get(`${BASE}/auth/me`, ({ request }) => {
    const user = userFromAuth(request);
    if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const { userId, userName, fullName, email, roleId } = user;
    return HttpResponse.json({ userId, userName, fullName, email, roleId });
  }),

  http.post(`${BASE}/auth/logout`, () => HttpResponse.json({ ok: true })),

  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const { refreshToken } = (await request.json()) as { refreshToken: string };
    const id = Number(refreshToken.replace('mock-refresh-', ''));
    const user = DEMO_USERS.find((u) => u.userId === id);
    if (!user) return HttpResponse.json({ message: 'Invalid refresh token' }, { status: 401 });
    return HttpResponse.json(makeSession(user));
  }),

  // Same contract as the real NestJS backend (username-keyed; always the same response).
  http.post(`${BASE}/auth/forgot-password`, () =>
    HttpResponse.json({ message: 'If that account exists, a reset link has been sent.' }),
  ),
  http.post(`${BASE}/auth/reset-password`, async ({ request }) => {
    const { newPassword } = (await request.json()) as { token: string; newPassword: string };
    if (!newPassword || newPassword.length < 8) {
      return HttpResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });
    }
    return HttpResponse.json({ message: 'Your password has been updated.' });
  }),

  // Mobile-first OTP registration. Mock accepts any 10-digit mobile; the code is always 123456,
  // surfaced as devCode to mirror the backend's dev behaviour.
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const { mobile } = (await request.json()) as { mobile: string };
    if (!/^\d{10}$/.test(mobile ?? '')) {
      return HttpResponse.json({ message: 'Mobile must be 10 digits' }, { status: 400 });
    }
    return HttpResponse.json({ otpRequired: true, devCode: '123456' });
  }),
  http.post(`${BASE}/auth/verify-otp`, async ({ request }) => {
    const { code, fullName, email } = (await request.json()) as {
      mobile: string;
      code: string;
      fullName?: string;
      email?: string;
    };
    if (code !== '123456') return HttpResponse.json({ message: 'Incorrect code' }, { status: 400 });
    // Reflect the profile captured on the full form (mirrors the real backend persisting it).
    const session = makeSession(DEMO_USERS[0]);
    return HttpResponse.json({
      ...session,
      user: { ...session.user, fullName: fullName ?? session.user.fullName, email: email ?? session.user.email },
    });
  }),

  // ---------------------------- Candidate -----------------------------
  http.get(`${BASE}/candidates/me`, ({ request }) => {
    if (!userFromAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json(CANDIDATE_PROFILE);
  }),
  http.get(`${BASE}/candidates/me/applied-jobs`, () => HttpResponse.json(APPLIED_JOB_LIST)),
  http.get(`${BASE}/candidates/me/documents`, () => HttpResponse.json(CANDIDATE_DOCUMENTS)),
  http.post(`${BASE}/candidates/me/documents/:documentTypeId`, async ({ params }) => {
    uploadCandidateDocument(Number(params.documentTypeId));
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/candidates/me/cv-masters`, () => HttpResponse.json(CV_MASTERS)),
  http.get(`${BASE}/candidates/me/cv-edit`, () => HttpResponse.json(CV_EDIT_PROFILE)),
  http.put(`${BASE}/candidates/me/personal`, async ({ request }) => {
    updateCvPersonal((await request.json()) as CvPersonal);
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/professional`, async ({ request }) => {
    updateCvProfessional((await request.json()) as CvProfessional);
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/education`, async ({ request }) => {
    upsertCvEducation((await request.json()) as { subscriberEducationId?: number; courseTypeId: number; degreeId: number });
    return HttpResponse.json({ ok: true });
  }),
  http.delete(`${BASE}/candidates/me/education/:id`, ({ params }) => {
    deleteCvEducation(Number(params.id));
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/employment`, async ({ request }) => {
    upsertCvEmployment((await request.json()) as Partial<CvEmploymentEntry> & { employer: string });
    return HttpResponse.json({ ok: true });
  }),
  http.delete(`${BASE}/candidates/me/employment/:id`, ({ params }) => {
    deleteCvEmployment(Number(params.id));
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/certificates`, async ({ request }) => {
    upsertCvCertificate((await request.json()) as { subscriberCertificateId?: number; certificateName: string });
    return HttpResponse.json({ ok: true });
  }),
  http.delete(`${BASE}/candidates/me/certificates/:id`, ({ params }) => {
    deleteCvCertificate(Number(params.id));
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/candidates/me/job-alerts`, () => HttpResponse.json(JOB_ALERTS)),
  http.post(`${BASE}/candidates/me/job-alerts`, async ({ request }) => {
    const body = (await request.json()) as { keyword: string; location: string; frequency: 'Daily' | 'Weekly' };
    return HttpResponse.json(addJobAlert(body), { status: 201 });
  }),
  http.post(`${BASE}/candidates/me/change-password`, async ({ request }) => {
    const { currentPassword } = (await request.json()) as { currentPassword: string };
    if (currentPassword !== 'demo123') {
      return HttpResponse.json({ message: 'Current password is incorrect' }, { status: 400 });
    }
    return HttpResponse.json({ message: 'Password changed successfully' });
  }),

  // ------------------------------ Client ------------------------------
  http.get(`${BASE}/clients/me`, ({ request }) => {
    if (!userFromAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json(COMPANY_PROFILE);
  }),
  http.get(`${BASE}/clients/me/jobs`, () => HttpResponse.json(COMPANY_JOBS)),
  http.post(`${BASE}/clients/me/jobs`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ ok: true, job: body }, { status: 201 });
  }),
  http.get(`${BASE}/clients/masters`, () => HttpResponse.json(COMPANY_MASTERS)),
  http.patch(`${BASE}/clients/me/jobs/:id`, async ({ request, params }) => {
    const body = (await request.json()) as Partial<JobListing>;
    updateCompanyJob(Number(params.id), body);
    return HttpResponse.json({ ok: true });
  }),
  http.post(`${BASE}/clients/me/jobs/:id/deactivate`, ({ params }) => {
    deactivateCompanyJob(Number(params.id));
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/clients/me/applicants`, () => HttpResponse.json(APPLICANT_ROWS)),
  http.post(`${BASE}/clients/me/applicants/:id/decision`, async ({ request, params }) => {
    const { decision } = (await request.json()) as { decision: 'Shortlisted' | 'Rejected' };
    decideApplicant(Number(params.id), decision);
    return HttpResponse.json({ ok: true });
  }),

  // ---------------------------- Recruitment ---------------------------
  http.get(`${BASE}/recruitment/candidates`, ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const status = url.searchParams.get('status') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10');

    const filtered = CANDIDATE_ROWS.filter(
      (r) =>
        (!search || r.fullName.toLowerCase().includes(search) || r.designation.toLowerCase().includes(search)) &&
        (!status || r.jobStatus === status),
    );
    const start = (page - 1) * pageSize;
    return HttpResponse.json({ rows: filtered.slice(start, start + pageSize), total: filtered.length });
  }),

  // Public job search — no auth, powers the home hero + /jobs page.
  http.get(`${BASE}/jobs/filters`, () =>
    HttpResponse.json({
      designations: JOB_DESIGNATIONS,
      industries: JOB_INDUSTRIES,
      locations: JOB_LOCATIONS,
    }),
  ),

  http.get(`${BASE}/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const designation = url.searchParams.get('designation') ?? '';
    const industry = url.searchParams.get('industry') ?? '';
    const location = url.searchParams.get('location') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '10');

    const filtered = PUBLIC_JOBS.filter(
      (j) =>
        (!designation || j.designation === designation) &&
        (!industry || j.industry === industry) &&
        (!location || j.city === location),
    );
    const start = (page - 1) * pageSize;
    return HttpResponse.json({ rows: filtered.slice(start, start + pageSize), total: filtered.length });
  }),

  http.get(`${BASE}/jobs/:id`, ({ params }) => {
    const job = PUBLIC_JOBS.find((j) => j.jobId === Number(params.id));
    if (!job) return HttpResponse.json({ message: 'Job not found' }, { status: 404 });
    return HttpResponse.json(job);
  }),

  http.post(`${BASE}/jobs/:id/apply`, ({ request, params }) => {
    if (!userFromAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const job = PUBLIC_JOBS.find((j) => j.jobId === Number(params.id));
    if (!job) return HttpResponse.json({ message: 'Job not found or no longer active' }, { status: 404 });
    if (APPLIED_JOB_LIST.some((a) => a.jobId === job.jobId)) {
      return HttpResponse.json({ message: 'Already applied to this job' }, { status: 400 });
    }
    addAppliedJob(job);
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${BASE}/recruitment/qc1/stats`, () => HttpResponse.json(QC1_STATS)),
  http.get(`${BASE}/recruitment/jobs`, () => HttpResponse.json(ACTIVE_JOBS)),
  http.post(`${BASE}/recruitment/candidates/:id/assign-job`, async ({ request }) => {
    const { jobId } = (await request.json()) as { jobId: number };
    const job = ACTIVE_JOBS.find((j) => j.jobId === Number(jobId));
    if (!job) return HttpResponse.json({ message: 'Job not found or no longer active' }, { status: 404 });
    if (!APPLIED_JOB_LIST.some((a) => a.jobId === job.jobId)) {
      addAppliedJob({ ...job, industry: '', city: '', workMode: '', employmentType: '', minExp: 0, minCtc: 0, maxCtc: 0, postedOn: '' });
    }
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${BASE}/recruitment/candidates/:id`, () =>
    HttpResponse.json({ ...CANDIDATE_PROFILE, registrationStatus: CANDIDATE_REGISTRATION_STATUS }),
  ),
  http.get(`${BASE}/recruitment/interviews`, () => HttpResponse.json(INTERVIEWS)),
  http.get(`${BASE}/recruitment/interviews/eligible`, () => HttpResponse.json(ELIGIBLE_APPLICATIONS)),
  http.get(`${BASE}/recruitment/interview-modes`, () => HttpResponse.json(INTERVIEW_MODES)),
  http.post(`${BASE}/recruitment/interviews`, async ({ request }) => {
    const body = (await request.json()) as {
      jobSubscriberMapId: number; interviewModeId: number; interviewTime: string; location?: string;
    };
    return HttpResponse.json(addInterview(body));
  }),
  http.post(`${BASE}/recruitment/interviews/:id/status`, async ({ request, params }) => {
    const { status } = (await request.json()) as { status: 'Completed' | 'Cancelled' };
    updateInterviewStatus(Number(params.id), status);
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/recruitment/documents`, () => HttpResponse.json(DOC_REVIEWS)),
  http.post(`${BASE}/recruitment/documents/review`, async ({ request }) => {
    const { documentId, status } = (await request.json()) as { documentId: number; status: 'Verified' | 'Rejected' };
    reviewDoc(documentId, status);
    return HttpResponse.json({ ok: true });
  }),
  http.post(`${BASE}/recruitment/candidates/:id/decision`, async ({ request }) => {
    const { decision } = (await request.json()) as { decision: 'Approved' | 'Rejected' };
    decideCandidate(decision);
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/recruitment/document-types`, () => HttpResponse.json(DOCUMENT_TYPES)),
  http.post(`${BASE}/recruitment/candidates/:id/documents`, async ({ request }) => {
    const { documentTypeIds } = (await request.json()) as { documentTypeIds: number[] };
    assignDocumentTypes(documentTypeIds);
    return HttpResponse.json({ ok: true });
  }),
];
