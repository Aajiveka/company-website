import { test, expect } from '@playwright/test';

// These specs mock the network with page.route(), which requires MSW's service
// worker to be OFF. Blocking it makes the app fall back to the real network layer
// where Playwright's route handlers apply. (See bootstrap fallback in src/main.tsx.)
test.use({ serviceWorkers: 'block' });

/**
 * Candidate Profile — tests profile page rendering and data display.
 *
 * The page at /candidate/profile is the candidate's own profile, every section editable in
 * place. It renders from three endpoints: /candidates/me for the header and resume card,
 * /candidates/me/cv-edit for the sections, and /candidates/me/cv-masters for the id-backed
 * labels (a designation, course or degree is stored as an id, so without the masters those
 * rows render blank). All three are mocked so the tests run without a live backend.
 */

const CANDIDATE_PROFILE = {
  subscriberId: 10,
  fullName: 'Priya Patel',
  email: 'priya@example.com',
  emailVerified: true,
  mobile: '9876543210',
  gender: 'F',
  city: 'Pune',
  designation: 'Senior Developer',
  // A count, not a sentence — the header runs it through the pluralised
  // `profile.yearsExperience` to render "5 years".
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
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  education: [{ degree: 'B.Tech Computer Science', institute: 'IIT Bombay', year: '2020' }],
  experience: [
    { designation: 'Senior Developer', company: 'TechCorp', from: 'Jan 2023', to: 'Present' },
    { designation: 'Developer', company: 'StartupXYZ', from: 'Jun 2020', to: 'Dec 2022' },
  ],
};

// Only the lists the sections under test actually look ids up in.
const CV_MASTERS = {
  states: [{ id: 1, label: 'Maharashtra' }],
  cities: [{ id: 1, label: 'Pune', stateId: 1 }],
  subFunctions: [{ id: 1, label: 'Software Development' }],
  industries: [{ id: 1, label: 'IT Services' }],
  skills: [{ id: 1, label: 'React' }],
  degrees: [{ id: 1, label: 'Graduation' }],
  courses: [{ id: 1, label: 'B.Tech Computer Science', degreeId: 1 }],
  designations: [
    { id: 1, label: 'Senior Developer' },
    { id: 2, label: 'Developer' },
  ],
  employmentTypes: [{ id: 1, label: 'Full Time' }],
  tags: [{ id: 1, label: 'React' }],
};

const CV_EDIT = {
  personal: {
    fullName: 'Priya Patel',
    email: 'priya@example.com',
    mobile: '9876543210',
    dob: '1996-04-12',
    gender: 'F',
    address: 'Kothrud',
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
  education: [
    {
      subscriberEducationId: 1,
      courseTypeId: 1,
      degreeId: 1,
      instituteName: 'IIT Bombay',
      passingYear: 2020,
      courseMode: 'Full Time',
      marks: '8.4 CGPA',
    },
  ],
  employment: [
    {
      subscriberEmployerId: 1,
      employer: 'TechCorp',
      designationId: 1,
      employeeTypeId: 1,
      joiningDate: '2023-01-15',
      releavingDate: '',
      flgCurrent: true,
      salary: 1800000,
      jobDescr: '',
      noticePeriodDays: 30,
    },
    {
      subscriberEmployerId: 2,
      employer: 'StartupXYZ',
      designationId: 2,
      employeeTypeId: 1,
      joiningDate: '2020-06-01',
      releavingDate: '2022-12-31',
      flgCurrent: false,
      salary: 900000,
      jobDescr: '',
      noticePeriodDays: null,
    },
  ],
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
    preferredSalary: null,
    preferredJobRoles: [],
    preferredCityIds: [],
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
  accomplishments: [],
  languages: [],
};

const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

async function setupCandidateMocks(page: import('@playwright/test').Page) {
  // Set refresh token so the auth bootstrap calls /auth/me
  await page.addInitScript(() => {
    localStorage.setItem('aaj.refresh', 'fake-refresh-token');
  });

  await Promise.all([
    // Auth: mock the refresh + me endpoints the app actually calls
    page.route('**/api/auth/refresh', (route) =>
      route.fulfill(json({ accessToken: 'fake-access', refreshToken: 'fake-refresh-token' })),
    ),
    page.route('**/api/auth/me', (route) =>
      route.fulfill(json({ userId: 10, fullName: 'Priya Patel', roleId: 1, isOnboarded: true })),
    ),
    // One handler for the whole /candidates/me tree: the glob has to reach the sub-paths
    // (`**/api/candidates/me` on its own does not match `/candidates/me/cv-edit`), and with
    // the profile mocked but cv-edit falling through to a backend that is not running, the
    // page never leaves its loading skeleton.
    page.route('**/api/candidates/me**', (route) => {
      const url = route.request().url();
      if (url.includes('/cv-masters')) return route.fulfill(json(CV_MASTERS));
      if (url.includes('/cv-edit')) return route.fulfill(json(CV_EDIT));
      if (url.includes('/applied-jobs')) return route.fulfill(json([]));
      if (url.includes('/saved-job-ids')) return route.fulfill(json([]));
      if (route.request().method() === 'GET') return route.fulfill(json(CANDIDATE_PROFILE));
      // PUT — profile update
      return route.fulfill(json({ ...CANDIDATE_PROFILE, fullName: 'Priya Patel Updated' }));
    }),
    page.route('**/api/jobs/recommended*', (route) => route.fulfill(json({ rows: [], total: 0 }))),
  ]);
}

test.describe('Candidate Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupCandidateMocks(page);
  });

  test('renders candidate name and designation', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('Priya Patel').first()).toBeVisible({ timeout: 10_000 });
    // Also the current employment row's designation, hence .first().
    await expect(page.getByText('Senior Developer').first()).toBeVisible();
  });

  test('displays contact information', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('priya@example.com')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('9876543210')).toBeVisible();
    await expect(page.getByText('Pune').first()).toBeVisible();
  });

  test('displays skills', async ({ page }) => {
    await page.goto('/candidate/profile');

    // Key skills come from cv-edit's tagNames, not the profile's flat skills array.
    const skills = page.locator('#key-skills');
    await expect(skills.getByText('React')).toBeVisible({ timeout: 10_000 });
    await expect(skills.getByText('TypeScript')).toBeVisible();
    await expect(skills.getByText('Node.js')).toBeVisible();
    await expect(skills.getByText('PostgreSQL')).toBeVisible();
  });

  test('displays experience entries', async ({ page }) => {
    await page.goto('/candidate/profile');

    const employment = page.locator('#employment');
    await expect(employment.getByText('TechCorp')).toBeVisible({ timeout: 10_000 });
    await expect(employment.getByText('StartupXYZ')).toBeVisible();
    // "Full Time | Jan 2023 to Present (…)" — the dates are formatted from joiningDate.
    await expect(employment.getByText(/Jan 2023/)).toBeVisible();
  });

  test('displays education entries', async ({ page }) => {
    await page.goto('/candidate/profile');

    const education = page.locator('#education');
    // The course is stored as an id; the label comes from cv-masters.
    await expect(education.getByText('B.Tech Computer Science').first()).toBeVisible({ timeout: 10_000 });
    await expect(education.getByText('IIT Bombay')).toBeVisible();
    await expect(education.getByText(/2020/).first()).toBeVisible();
  });

  test('shows experience duration', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('5 years').first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows download resume button', async ({ page }) => {
    await page.goto('/candidate/profile');

    // A button, not a link: the download goes through the authenticated API client, because
    // a plain <a download> would send no Authorization header.
    const downloadBtn = page.locator('#resume').getByRole('button', { name: /download/i });
    await expect(downloadBtn).toBeVisible({ timeout: 10_000 });
  });
});
