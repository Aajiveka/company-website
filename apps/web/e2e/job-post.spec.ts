import { test, expect } from '@playwright/test';

// The portal uses page.route() fixtures, so service workers must remain disabled.
test.use({ serviceWorkers: 'block' });

const MASTERS = {
  designations: [{ id: 1, label: 'Software Engineer' }],
  states: [{ id: 10, label: 'Maharashtra' }],
  cities: [{ id: 100, label: 'Mumbai', stateId: 10 }],
  workModes: [{ id: 1, label: 'Remote' }],
  employmentTypes: [{ id: 1, label: 'Full-time' }],
  industryTypes: [{ id: 1, label: 'Technology' }],
  skills: [{ id: 1, label: 'React' }],
};

const POSTED_JOB = {
  jobId: 42,
  designation: 'Software Engineer',
  designationId: 1,
  city: 'Mumbai',
  cityId: 100,
  workMode: 'Remote',
  workModeId: 1,
  employmentType: 'Full-time',
  employmentTypeId: 1,
  industryTypeId: 1,
  minExp: 2,
  maxExp: 4,
  minCtc: 500000,
  maxCtc: 1200000,
  educationDetail: 'B.Tech in Computer Science',
  reportTo: '',
  teamSize: null,
  department: 'Engineering',
  subDepartment: '',
  interviewProcess: [],
  status: 'Active',
  applicants: 0,
  description: 'A great role for experienced developers.',
  candidateProfile: '',
  openings: null,
  skillIds: [1],
  postedOn: '2026-08-11',
};

function jobListResponse(items: typeof POSTED_JOB[]) {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    pageCount: 1,
    counts: { all: items.length, active: items.length, closed: 0, draft: 0, archived: 0 },
    cities: [...new Set(items.map((job) => job.city))],
  };
}

async function mockAuthSession(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('aaj.refresh', 'fake-refresh-token'));
  await page.route('**/api/auth/refresh', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ accessToken: 'fake-access', refreshToken: 'fake-refresh-token' }),
  }));
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ userId: 1, fullName: 'Test Employer', roleId: 4 }),
  }));
}

test.describe('Job Posting Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthSession(page);
    await page.route('**/api/clients/masters', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MASTERS),
    }));

    let jobs: typeof POSTED_JOB[] = [];
    await page.route('**/api/clients/me/jobs**', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jobListResponse(jobs)) });
      }
      jobs = [POSTED_JOB];
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(POSTED_JOB) });
    });
  });

  test('shows native validation when submitting an empty form', async ({ page }) => {
    await page.goto('/company/post-job');
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.getByLabel(/position/i)).not.toHaveJSProperty('validationMessage', '');
  });

  test('lists the cities supplied by the employer masters endpoint', async ({ page }) => {
    await page.goto('/company/post-job');
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
    const location = page.getByLabel(/location/i);
    await expect(location.locator('option')).toHaveText(['Select city', 'Mumbai']);
    await location.selectOption({ label: 'Mumbai' });
    await expect(location).toHaveValue('100');
  });

  test('fills the employer form and publishes a job', async ({ page }) => {
    await page.goto('/company/post-job');
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
    await page.getByLabel(/position/i).selectOption({ label: 'Software Engineer' });
    await page.getByLabel(/employment type/i).selectOption({ label: 'Full-time' });
    await page.getByLabel(/work mode/i).selectOption({ label: 'Remote' });
    await page.getByLabel(/industry type/i).selectOption({ label: 'Technology' });
    await page.getByLabel(/location/i).selectOption({ label: 'Mumbai' });
    await page.getByLabel(/experience \(min yrs\)/i).fill('2');
    await page.getByLabel(/ctc \(min\)/i).fill('500000');
    await page.getByLabel(/ctc \(max\)/i).fill('1200000');
    await page.getByLabel(/education detail/i).fill('B.Tech in Computer Science');
    await page.getByLabel(/^department/i).fill('Engineering');
    await page.getByRole('button', { name: /skills.*0 selected/i }).click();
    await page.getByLabel(/job description/i).fill('A great role for experienced developers.');
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.getByText('Software Engineer')).toBeVisible({ timeout: 10_000 });
  });

  test('shows a pre-populated job in the listing page', async ({ page }) => {
    await page.route('**/api/clients/me/jobs**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(jobListResponse([POSTED_JOB])),
    }));
    await page.goto('/company/jobs');
    await expect(page.getByText('Software Engineer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('cell', { name: 'Mumbai' })).toBeVisible();
  });
});
