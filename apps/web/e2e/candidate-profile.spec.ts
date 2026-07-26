import { test, expect } from '@playwright/test';

/**
 * Candidate Profile — tests profile page rendering and data display.
 *
 * The candidate profile page at /candidate/profile is a read-only dashboard
 * showing personal info, skills, experience, and education. API calls are
 * mocked so the tests run without a live backend.
 */

const CANDIDATE_PROFILE = {
  userId: 10,
  fullName: 'Priya Patel',
  designation: 'Senior Developer',
  email: 'priya@example.com',
  mobile: '9876543210',
  city: 'Pune',
  totalExperience: '5 years',
  photoUrl: null,
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  experience: [
    { designation: 'Senior Developer', company: 'TechCorp', from: 'Jan 2023', to: 'Present' },
    { designation: 'Developer', company: 'StartupXYZ', from: 'Jun 2020', to: 'Dec 2022' },
  ],
  education: [
    { degree: 'B.Tech Computer Science', institute: 'IIT Bombay', year: '2020' },
  ],
};

const DASHBOARD_STATS = {
  appliedJobs: 12,
  savedJobs: 5,
  profileViews: 48,
  interviews: 3,
};

function setupCandidateMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { userId: 10, fullName: 'Priya Patel', roleId: 1 },
          token: 'fake-candidate-token',
        }),
      }),
    ),
    page.route('**/api/candidate/profile', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(CANDIDATE_PROFILE),
        });
      }
      // PUT — profile update
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...CANDIDATE_PROFILE, fullName: 'Priya Patel Updated' }),
      });
    }),
    page.route('**/api/candidate/dashboard-stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DASHBOARD_STATS),
      }),
    ),
    // Mock other endpoints the profile page may call
    page.route('**/api/candidate/profile-completion', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ percentage: 75, missing: ['photo', 'resume'] }),
      }),
    ),
    page.route('**/api/jobs/recommended*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }),
    ),
  ]);
}

test.describe('Candidate Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupCandidateMocks(page);
  });

  test('renders candidate name and designation', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('Priya Patel')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Senior Developer')).toBeVisible();
  });

  test('displays contact information', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('priya@example.com')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('9876543210')).toBeVisible();
    await expect(page.getByText('Pune')).toBeVisible();
  });

  test('displays skills', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('React')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('TypeScript')).toBeVisible();
    await expect(page.getByText('Node.js')).toBeVisible();
    await expect(page.getByText('PostgreSQL')).toBeVisible();
  });

  test('displays experience entries', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('TechCorp')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('StartupXYZ')).toBeVisible();
    await expect(page.getByText('Jan 2023')).toBeVisible();
  });

  test('displays education entries', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('B.Tech Computer Science')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('IIT Bombay')).toBeVisible();
    await expect(page.getByText('2020')).toBeVisible();
  });

  test('shows experience duration', async ({ page }) => {
    await page.goto('/candidate/profile');

    await expect(page.getByText('5 years')).toBeVisible({ timeout: 10_000 });
  });

  test('shows download resume button', async ({ page }) => {
    await page.goto('/candidate/profile');

    const downloadBtn = page.getByRole('link', { name: /download/i });
    await expect(downloadBtn).toBeVisible({ timeout: 10_000 });
  });
});
