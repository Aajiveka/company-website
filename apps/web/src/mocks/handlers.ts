import { http, HttpResponse } from 'msw';
import {
  addJobAlert,
  APPLIED_JOBS,
  CANDIDATE_DOCUMENTS,
  CANDIDATE_PROFILE,
  CANDIDATE_ROWS,
  COMPANY_JOBS,
  COMPANY_PROFILE,
  DEMO_USERS,
  DOC_REVIEWS,
  INTERVIEWS,
  JOB_ALERTS,
  JOB_DESIGNATIONS,
  JOB_INDUSTRIES,
  JOB_LOCATIONS,
  PUBLIC_JOBS,
  QC1_STATS,
  makeSession,
  reviewDoc,
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

  http.post(`${BASE}/auth/forgot-password`, () =>
    HttpResponse.json({ message: 'If the email exists, a reset link was sent.' }),
  ),
  http.post(`${BASE}/auth/reset-password`, () => HttpResponse.json({ message: 'Password updated.' })),

  http.post(`${BASE}/auth/register`, () => HttpResponse.json({ userId: 999, otpRequired: true })),
  http.post(`${BASE}/auth/verify-otp`, () => HttpResponse.json(makeSession(DEMO_USERS[0]))),

  // ---------------------------- Candidate -----------------------------
  http.get(`${BASE}/candidates/me`, ({ request }) => {
    if (!userFromAuth(request)) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return HttpResponse.json(CANDIDATE_PROFILE);
  }),
  http.get(`${BASE}/candidates/me/applied-jobs`, () => HttpResponse.json(APPLIED_JOBS)),
  http.get(`${BASE}/candidates/me/documents`, () => HttpResponse.json(CANDIDATE_DOCUMENTS)),
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
  http.get(`${BASE}/clients/me/applicants`, () => HttpResponse.json(CANDIDATE_ROWS.slice(0, 20))),

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

  http.get(`${BASE}/recruitment/qc1/stats`, () => HttpResponse.json(QC1_STATS)),

  http.get(`${BASE}/recruitment/candidates/:id`, () => HttpResponse.json(CANDIDATE_PROFILE)),
  http.get(`${BASE}/recruitment/interviews`, () => HttpResponse.json(INTERVIEWS)),
  http.get(`${BASE}/recruitment/documents`, () => HttpResponse.json(DOC_REVIEWS)),
  http.post(`${BASE}/recruitment/documents/review`, async ({ request }) => {
    const { documentId, status } = (await request.json()) as { documentId: number; status: 'Verified' | 'Rejected' };
    reviewDoc(documentId, status);
    return HttpResponse.json({ ok: true });
  }),
];
