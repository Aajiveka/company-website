import type { Page, Route } from '@playwright/test';

/**
 * Shared network fixtures for the candidate-facing end-to-end specs.
 *
 * The specs mock with page.route() rather than talking to a live API, so they run in CI and
 * on a laptop with no database. That also means MSW's service worker has to be off in every
 * spec that uses these helpers (`test.use({ serviceWorkers: 'block' })`) — with the worker
 * installed it answers first and Playwright's handlers never see the request.
 *
 * One handler per endpoint *tree* rather than per endpoint: `**` /api/candidates/me` does not
 * match `/api/candidates/me/cv-edit`, and a sub-path that falls through to a backend which
 * is not running leaves the screen stuck on its skeleton.
 */

export const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

/** Every request a spec cares about, in order, so payloads and query strings can be asserted. */
export interface RequestLog {
  method: string;
  url: string;
  body: unknown;
}

export function recordRequest(log: RequestLog[], route: Route) {
  const request = route.request();
  let body: unknown = null;
  try {
    body = request.postData() ? JSON.parse(request.postData() as string) : null;
  } catch {
    body = request.postData();
  }
  log.push({ method: request.method(), url: request.url(), body });
}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

export const CANDIDATE_PROFILE = {
  subscriberId: 10,
  fullName: 'Priya Patel',
  email: 'priya@example.com',
  emailVerified: true,
  mobile: '9876543210',
  gender: 'F',
  city: 'Pune',
  designation: 'Senior Developer',
  totalExperience: '5',
  photoUrl: null,
  resumeHeadline: 'Senior developer with a product bent',
  currentCompany: 'TechCorp',
  currentDesignation: 'Senior Developer',
  currentCtc: 1800000,
  noticePeriod: 30,
  profileUpdatedAt: '2026-07-01T10:00:00.000Z',
  resumeUrl: '/files/resume',
  resumeFileName: 'priya-patel-cv.pdf',
  resumeUploadedAt: '2026-06-20T10:00:00.000Z',
  skills: ['React', 'TypeScript', 'Node.js'],
  education: [],
  experience: [],
};

/**
 * Only the branches the job screens read: `professional.tagNames` and `totalExp` feed the
 * match score, `careerProfile` feeds the apply form's expected salary, and `accomplishments`
 * carries the LinkedIn URL it pre-fills.
 */
export const CV_EDIT = {
  personal: {
    fullName: 'Priya Patel',
    email: 'priya@example.com',
    mobile: '9876543210',
    dob: '1996-04-12',
    gender: 'F',
    address: 'Pune',
    cityId: 1,
  },
  professional: {
    subFunctionId: 1,
    skillId: 1,
    totalExp: 5,
    currentCtc: 1800000,
    currentCityId: 1,
    flgReadyToRelocate: true,
    noticePeriod: 30,
    industryTypeId: 1,
    preferredCityIds: [1],
    tagNames: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  },
  education: [],
  employment: [],
  certificates: [],
  headline: 'Senior developer with a product bent',
  summary: 'Builds product-facing services end to end.',
  careerProfile: {
    industryTypeId: null,
    department: '',
    roleCategory: '',
    jobRole: '',
    desiredJobType: [],
    desiredEmploymentType: [],
    preferredShift: '',
    preferredWorkModes: ['Remote'],
    preferredSalary: 2500000,
    preferredJobRoles: [],
    preferredCityIds: [1],
  },
  personalDetails: {
    maritalStatus: '',
    personalTraits: [],
    category: '',
    workPermitCountries: [],
    usWorkPermit: '',
  },
  diversity: {
    disabilityStatus: '',
    disabilityType: '',
    disabilityPercent: null,
    assistanceRequired: '',
    militaryStatus: '',
    militaryServiceType: '',
    militaryRank: '',
    militaryEnrolmentDate: '',
    careerBreakStatus: '',
    careerBreakReason: '',
    careerBreakFrom: '',
    careerBreakTo: '',
  },
  itSkills: [],
  projects: [],
  accomplishments: [{ kind: 'ONLINE_PROFILE', url: 'https://linkedin.com/in/priya-patel', title: 'LinkedIn' }],
  languages: [],
};

export const CV_MASTERS = {
  states: [{ id: 1, label: 'Maharashtra' }],
  cities: [{ id: 1, label: 'Pune', stateId: 1 }],
  subFunctions: [{ id: 1, label: 'Software Development' }],
  industries: [{ id: 1, label: 'IT Services' }],
  skills: [{ id: 1, label: 'React' }],
  // `category` is the <optgroup> the qualification sits under in the Education step.
  degrees: [
    { id: 1, label: 'Graduation', category: 'Undergraduate' },
    { id: 136, label: 'B.Tech', category: 'Undergraduate' },
    { id: 132, label: 'B.Com.', category: 'Undergraduate' },
  ],
  courses: [
    { id: 1, label: 'B.Tech Computer Science', degreeId: 1 },
    { id: 1020, label: 'Computer Science and Engineering', degreeId: 136 },
    { id: 1021, label: 'Information Technology', degreeId: 136 },
    { id: 1010, label: 'Accounting and Finance', degreeId: 132 },
  ],
  designations: [{ id: 1, label: 'Senior Developer' }],
  employmentTypes: [{ id: 1, label: 'Full Time' }],
  tags: [{ id: 1, label: 'React' }],
};

/** Institution suggestions behind GET /candidates/me/institutes (a server-side search). */
export const CV_INSTITUTES = [
  { id: 1, label: 'Savitribai Phule Pune University', kind: 'University', city: 'Pune', stateId: 1 },
  { id: 2, label: 'University of Mumbai', kind: 'University', city: 'Mumbai', stateId: 1 },
];

export const NOTIFICATION_PREFS = {
  emailAlerts: true,
  pushAlerts: true,
  smsAlerts: false,
  jobAlertFrequency: 'Daily' as 'Daily' | 'Weekly' | 'Instant',
  newJobAlerts: true,
  weeklyJobDigest: false,
  profileViewAlerts: true,
  applicationStatusUpdates: true,
  recruiterMessages: true,
  interviewReminders: false,
  productUpdates: false,
  marketingOffers: false,
};

/** A public job row, as GET /jobs returns it. */
export function publicJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    jobId: 1,
    designation: 'Senior React Developer',
    company: 'TechCorp',
    industry: 'IT Services',
    city: 'Pune',
    workMode: 'Remote',
    employmentType: 'Full-time',
    minExp: 3,
    maxExp: 6,
    minCtc: 1800000,
    maxCtc: 2800000,
    postedOn: '2026-08-10T09:00:00.000Z',
    skills: ['React', 'TypeScript', 'Node.js'],
    ...overrides,
  };
}

/** The extended shape GET /jobs/:id returns. */
export function jobDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...publicJob(),
    description: 'Own the front end end to end.\nShip features weekly.\nMentor two juniors.',
    candidateProfile: 'Five years with React and TypeScript in production.',
    skills: ['React', 'TypeScript', 'Node.js'],
    educationTypes: ['B.Tech'],
    companyLogo: null,
    educationDetail: 'B.Tech in Computer Science',
    department: 'Engineering',
    subDepartment: 'Web Platform',
    reportTo: 'Engineering Manager',
    teamSize: 8,
    interviewRounds: ['Screening call', 'Technical round', 'Culture fit'],
    ...overrides,
  };
}

export function appliedJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    jobId: 1,
    designation: 'Senior React Developer',
    company: 'TechCorp',
    industry: 'IT Services',
    city: 'Pune',
    workMode: 'Remote',
    employmentType: 'Full-time',
    minExp: 3,
    minCtc: 1800000,
    maxCtc: 2800000,
    appliedOn: '2026-08-01T09:00:00.000Z',
    status: 'Application Received',
    statusHistory: [{ status: 'Application Received', timestamp: '2026-08-01T09:00:00.000Z', comments: null }],
    interview: null,
    ...overrides,
  };
}

export function savedJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    jobId: 1,
    designation: 'Senior React Developer',
    company: 'TechCorp',
    industry: 'IT Services',
    city: 'Pune',
    workMode: 'Remote',
    employmentType: 'Full-time',
    minExp: 3,
    minCtc: 1800000,
    maxCtc: 2800000,
    postedOn: '2026-08-10T09:00:00.000Z',
    savedOn: '2026-08-12T09:00:00.000Z',
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

export interface CandidateSessionOptions {
  profile?: Record<string, unknown>;
  cv?: Record<string, unknown> | null;
  savedJobIds?: number[];
  savedJobs?: Record<string, unknown>[];
  appliedJobs?: Record<string, unknown>[];
  prefs?: Record<string, unknown>;
  /** Every /candidates/me request, for asserting that a mutation actually fired. */
  log?: RequestLog[];
}

/**
 * Signs a candidate (roleId 1) in and answers the whole /candidates/me tree.
 *
 * Saved-job state is kept live rather than static: the pages invalidate and refetch after a
 * save or unsave, so a frozen list would show the bookmark snapping straight back and the
 * specs would be testing the mock rather than the app.
 */
export async function mockCandidateSession(page: Page, options: CandidateSessionOptions = {}) {
  const state = {
    profile: { ...CANDIDATE_PROFILE, ...(options.profile ?? {}) },
    cv: options.cv === null ? null : { ...CV_EDIT, ...(options.cv ?? {}) },
    savedJobIds: [...(options.savedJobIds ?? [])],
    savedJobs: [...(options.savedJobs ?? [])],
    appliedJobs: [...(options.appliedJobs ?? [])],
    prefs: { ...NOTIFICATION_PREFS, ...(options.prefs ?? {}) },
  };
  const log = options.log;

  await page.addInitScript(() => localStorage.setItem('aaj.refresh', 'fake-refresh-token'));

  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill(json({ accessToken: 'fake-access', refreshToken: 'fake-refresh-token' })),
  );
  await page.route('**/api/auth/me', (route) =>
    route.fulfill(json({ userId: 10, fullName: 'Priya Patel', roleId: 1, isOnboarded: true })),
  );
  // The portal header opens an SSE stream for the unread badge. Left unmocked it hangs the
  // request until the test's own timeout, so it is closed immediately with no events.
  await page.route('**/api/notifications/**', (route) => route.fulfill(json([])));

  await page.route('**/api/candidates/me**', (route) => {
    if (log) recordRequest(log, route);
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path.includes('/cv-masters')) return route.fulfill(json(CV_MASTERS));
    if (path.includes('/institutes')) {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      return route.fulfill(json(CV_INSTITUTES.filter((i) => i.label.toLowerCase().includes(q))));
    }
    if (path.includes('/cv-edit')) return route.fulfill(state.cv ? json(state.cv) : json({}, 404));
    if (path.includes('/saved-job-ids')) return route.fulfill(json(state.savedJobIds));

    if (path.includes('/saved-jobs')) {
      const match = path.match(/\/saved-jobs\/(\d+)$/);
      if (match && method === 'POST') {
        const id = Number(match[1]);
        if (!state.savedJobIds.includes(id)) state.savedJobIds.push(id);
        return route.fulfill(json({ saved: true }, 201));
      }
      if (match && method === 'DELETE') {
        const id = Number(match[1]);
        state.savedJobIds = state.savedJobIds.filter((v) => v !== id);
        state.savedJobs = state.savedJobs.filter((j) => j.jobId !== id);
        return route.fulfill(json({ saved: false }));
      }
      return route.fulfill(json(state.savedJobs));
    }

    if (path.includes('/applied-jobs')) return route.fulfill(json(state.appliedJobs));

    if (path.includes('/notification-prefs')) {
      if (method === 'PUT') {
        state.prefs = { ...state.prefs, ...((route.request().postDataJSON() as object) ?? {}) };
        return route.fulfill(json(state.prefs));
      }
      return route.fulfill(json(state.prefs));
    }

    if (path.includes('/resume')) return route.fulfill(json({ resumeFileName: 'priya-patel-cv.pdf' }));

    if (method === 'GET') return route.fulfill(json(state.profile));
    return route.fulfill(json(state.profile));
  });

  return state;
}

/* -------------------------------------------------------------------------- */
/* Jobs API                                                                   */
/* -------------------------------------------------------------------------- */

export interface JobsApiOptions {
  /** Rows for GET /jobs. A function receives the request URL so a spec can filter per query. */
  rows?: Record<string, unknown>[] | ((url: URL) => Record<string, unknown>[]);
  total?: number;
  detail?: Record<string, unknown> | null;
  /** Status for POST /jobs/:id/apply — 400 exercises the "already applied" branch. */
  applyStatus?: number;
  applyBody?: unknown;
  log?: RequestLog[];
}

/** Answers GET /jobs, GET /jobs/:id and POST /jobs/:id/apply. */
export async function mockJobsApi(page: Page, options: JobsApiOptions = {}) {
  const log = options.log;

  await page.route('**/api/jobs**', (route) => {
    if (log) recordRequest(log, route);
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (method === 'POST' && /\/jobs\/\d+\/apply$/.test(path)) {
      const status = options.applyStatus ?? 201;
      return route.fulfill(
        json(
          options.applyBody ?? (status >= 400 ? { message: 'Already applied' } : { jobSubscriberMapId: 77, reference: 'APP-2026-0077' }),
          status,
        ),
      );
    }

    if (/\/jobs\/\d+$/.test(path)) {
      return options.detail === null
        ? route.fulfill(json({ message: 'Not found' }, 404))
        : route.fulfill(json(options.detail ?? jobDetail()));
    }

    if (path.endsWith('/jobs/filters')) return route.fulfill(json({ designations: [], industries: [], states: [], locations: [], cityByState: {}, roleByFunction: {}, workModes: [], employmentTypes: [], skills: [] }));
    if (path.endsWith('/jobs/suggestions')) return route.fulfill(json({ suggestions: [] }));

    const rows = typeof options.rows === 'function' ? options.rows(url) : (options.rows ?? [publicJob()]);
    return route.fulfill(json({ rows, total: options.total ?? rows.length }));
  });
}

/** Query strings of every GET /jobs list call, newest last. */
export function searchQueries(log: RequestLog[]) {
  return log
    .filter((r) => r.method === 'GET' && /\/api\/jobs(\?|$)/.test(r.url))
    .map((r) => decodeURIComponent(new URL(r.url).search));
}
