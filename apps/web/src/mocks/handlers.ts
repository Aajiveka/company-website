import { http, HttpResponse } from 'msw';
import type {
  AccomplishmentKind,
  CvAccomplishmentEntry,
  CvCareerProfile,
  CvDiversity,
  CvEmploymentEntry,
  CvItSkillEntry,
  CvLanguageEntry,
  CvPersonal,
  CvPersonalDetails,
  CvProfessional,
  CvProjectEntry,
  LanguageProficiency,
} from '@/features/candidates/candidate.types';
import type { JobListing } from '@/employer/services/employer.types';
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
  searchInstitutes,
  deactivateCompanyJob,
  decideApplicant,
  decideCandidate,
  deleteCvAccomplishment,
  deleteCvCertificate,
  deleteCvEducation,
  deleteCvEmployment,
  deleteCvItSkill,
  deleteCvLanguage,
  deleteCvProject,
  DEMO_USERS,
  DOC_REVIEWS,
  DOCUMENT_TYPES,
  ELIGIBLE_APPLICATIONS,
  INTERVIEW_MODES,
  INTERVIEWS,
  JOB_ALERTS,
  JOB_CITY_BY_STATE,
  JOB_DESIGNATIONS,
  JOB_INDUSTRIES,
  JOB_LOCATIONS,
  JOB_STATES,
  PUBLIC_JOBS,
  QC1_STATS,
  makeSession,
  reviewDoc,
  updateCompanyJob,
  updateCvCareerProfile,
  updateCvDiversity,
  updateCvHeadline,
  updateCvKeySkills,
  updateCvPersonal,
  updateCvPersonalDetails,
  updateCvProfessional,
  updateCvSummary,
  updateInterviewStatus,
  uploadCandidateDocument,
  upsertCvAccomplishment,
  upsertCvCertificate,
  upsertCvEducation,
  upsertCvEmployment,
  upsertCvItSkill,
  upsertCvLanguage,
  upsertCvProject,
} from './data';

const BASE = '/api';

/**
 * Signups awaiting their emailed code, standing in for the API's Redis store. Module-level so
 * it survives between the register and verify calls of one flow; specs that need a clean slate
 * should reset the worker rather than reach in here.
 */
const pendingRegistrations = new Map<string, { fullName: string; email: string }>();

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

  // Email-OTP registration. The mock holds the pending signup in a map keyed by the same kind
  // of opaque handle the API returns, so the frontend exercises the real three-call shape:
  // register -> (resend) -> verify. The code is always 123456, surfaced as devCode to mirror
  // the backend's non-production behaviour.
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      mobile?: string;
      password?: string;
    };
    if (!body.fullName || body.fullName.length < 2) {
      return HttpResponse.json({ message: 'Enter your full name' }, { status: 400 });
    }
    if (!body.email?.includes('@')) {
      return HttpResponse.json({ message: 'Enter a valid email address' }, { status: 400 });
    }
    if (!/^\d{10}$/.test(body.mobile ?? '')) {
      return HttpResponse.json({ message: 'Mobile must be 10 digits' }, { status: 400 });
    }
    if ((body.password ?? '').length < 8) {
      return HttpResponse.json({ message: 'Password must be at least 8 characters' }, { status: 400 });
    }
    // Lets a spec drive the already-registered branch without any shared state.
    if (body.email.startsWith('taken@')) {
      return HttpResponse.json(
        { message: 'An account already exists for this email address. Please log in instead.' },
        { status: 409 },
      );
    }

    const registrationToken = 'a'.repeat(64);
    pendingRegistrations.set(registrationToken, {
      fullName: body.fullName,
      email: body.email.toLowerCase(),
    });
    return HttpResponse.json({
      otpRequired: true,
      registrationToken,
      email: body.email.toLowerCase(),
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
      maxAttempts: 5,
      devCode: '123456',
    });
  }),

  http.post(`${BASE}/auth/resend-otp`, async ({ request }) => {
    const { registrationToken } = (await request.json()) as { registrationToken?: string };
    const pending = registrationToken ? pendingRegistrations.get(registrationToken) : undefined;
    if (!pending) {
      return HttpResponse.json(
        { message: 'This registration has expired. Please sign up again.' },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      otpRequired: true,
      email: pending.email,
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
      maxAttempts: 5,
      devCode: '123456',
    });
  }),

  http.post(`${BASE}/auth/verify-otp`, async ({ request }) => {
    const { registrationToken, code } = (await request.json()) as {
      registrationToken?: string;
      code?: string;
    };
    const pending = registrationToken ? pendingRegistrations.get(registrationToken) : undefined;
    if (!pending) {
      return HttpResponse.json(
        { message: 'This registration has expired. Please sign up again.' },
        { status: 400 },
      );
    }
    if (code !== '123456') {
      return HttpResponse.json(
        { message: 'Incorrect code. 4 attempts remaining.', attemptsRemaining: 4 },
        { status: 400 },
      );
    }
    pendingRegistrations.delete(registrationToken!);
    // Reflect the profile captured on the form (mirrors the real backend persisting it).
    const session = makeSession(DEMO_USERS[0]);
    return HttpResponse.json({
      ...session,
      user: { ...session.user, fullName: pending.fullName, email: pending.email },
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
  http.get(`${BASE}/candidates/me/institutes`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const stateId = params.get('stateId');
    return HttpResponse.json(searchInstitutes(params.get('q') ?? '', stateId ? Number(stateId) : null));
  }),
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

  // Profile sections — one route per section, mirroring the API.
  http.put(`${BASE}/candidates/me/headline`, async ({ request }) => {
    updateCvHeadline((await request.json()) as { resumeHeadline: string });
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/summary`, async ({ request }) => {
    updateCvSummary((await request.json()) as { profileSummary: string });
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/key-skills`, async ({ request }) => {
    updateCvKeySkills((await request.json()) as { tagNames: string[] });
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/career-profile`, async ({ request }) => {
    updateCvCareerProfile((await request.json()) as Partial<CvCareerProfile>);
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/personal-details`, async ({ request }) => {
    updateCvPersonalDetails((await request.json()) as Partial<CvPersonalDetails>);
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/diversity`, async ({ request }) => {
    updateCvDiversity((await request.json()) as Partial<CvDiversity>);
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/it-skills`, async ({ request }) => {
    upsertCvItSkill((await request.json()) as Partial<CvItSkillEntry> & { skillName: string });
    return HttpResponse.json({ ok: true });
  }),
  http.delete(`${BASE}/candidates/me/it-skills/:id`, ({ params }) => {
    deleteCvItSkill(Number(params.id));
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/projects`, async ({ request }) => {
    upsertCvProject((await request.json()) as Partial<CvProjectEntry> & { title: string });
    return HttpResponse.json({ ok: true });
  }),
  http.delete(`${BASE}/candidates/me/projects/:id`, ({ params }) => {
    deleteCvProject(Number(params.id));
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/accomplishments`, async ({ request }) => {
    upsertCvAccomplishment(
      (await request.json()) as Partial<CvAccomplishmentEntry> & { kind: AccomplishmentKind; title: string },
    );
    return HttpResponse.json({ ok: true });
  }),
  http.delete(`${BASE}/candidates/me/accomplishments/:id`, ({ params }) => {
    deleteCvAccomplishment(Number(params.id));
    return HttpResponse.json({ ok: true });
  }),
  http.put(`${BASE}/candidates/me/languages`, async ({ request }) => {
    upsertCvLanguage(
      (await request.json()) as Partial<CvLanguageEntry> & { languageName: string; proficiencyId: LanguageProficiency },
    );
    return HttpResponse.json({ ok: true });
  }),
  http.delete(`${BASE}/candidates/me/languages/:id`, ({ params }) => {
    deleteCvLanguage(Number(params.id));
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
  http.get(`${BASE}/clients/me/jobs`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const city = url.searchParams.get('city') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? 10));
    let rows = [...COMPANY_JOBS];
    if (status === 'Draft' || status === 'Archived') rows = [];
    else if (status) rows = rows.filter((j) => j.status === status);
    if (city) rows = rows.filter((j) => j.city === city);
    if (q) {
      rows = rows.filter(
        (j) =>
          j.designation.toLowerCase().includes(q) ||
          (j.city ?? '').toLowerCase().includes(q) ||
          (j.description ?? '').toLowerCase().includes(q),
      );
    }
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const items = rows.slice(start, start + pageSize);
    const cities = Array.from(new Set(COMPANY_JOBS.map((j) => j.city).filter(Boolean))).sort();
    return HttpResponse.json({
      items,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize) || 0,
      counts: {
        all: COMPANY_JOBS.length,
        active: COMPANY_JOBS.filter((j) => j.status === 'Active').length,
        closed: COMPANY_JOBS.filter((j) => j.status === 'Closed').length,
        draft: 0,
        archived: 0,
      },
      cities,
    });
  }),
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
  http.get(`${BASE}/clients/me/applicants`, ({ request }) => {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 10)));
    const total = APPLICANT_ROWS.length;
    const start = (page - 1) * pageSize;
    const items = APPLICANT_ROWS.slice(start, start + pageSize);
    return HttpResponse.json({
      items,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize) || 0,
    });
  }),
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
      states: JOB_STATES,
      locations: JOB_LOCATIONS,
      cityByState: JOB_CITY_BY_STATE,
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
    // Must mirror ApplyResult: the confirmation screen prints `reference`, and returning
    // `{ ok: true }` left it rendering the em-dash placeholder in every mocked run.
    const jobSubscriberMapId = 900_000 + job.jobId;
    return HttpResponse.json({
      jobSubscriberMapId,
      reference: `AJ-${String(jobSubscriberMapId).padStart(6, '0')}`,
    });
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
