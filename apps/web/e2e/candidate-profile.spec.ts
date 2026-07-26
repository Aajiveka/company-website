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


async function setupCandidateMocks(page: import('@playwright/test').Page) {
  // Set refresh token so the auth bootstrap calls /auth/me
  await page.addInitScript(() => {
    localStorage.setItem('aaj.refresh', 'fake-refresh-token');
  });

  await Promise.all([
    // Auth: mock the refresh + me endpoints the app actually calls
    page.route('**/api/auth/refresh', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'fake-access', refreshToken: 'fake-refresh-token' }),
      }),
    ),
    page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ userId: 10, fullName: 'Priya Patel', roleId: 1, isOnboarded: true }),
      }),
    ),
    // Profile data — the app calls /candidates/me
    page.route('**/api/candidates/me', (route) => {
      const url = route.request().url();
      // Sub-paths like /candidates/me/applied-jobs
      if (url.includes('/applied-jobs')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
      if (url.includes('/saved-job-ids')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }
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
    page.route('**/api/jobs/recommended*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rows: [], total: 0 }),
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

    await expect(page.getByText('Priya Patel').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Senior Developer').first()).toBeVisible();
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
    await expect(page.getByText('2020').first()).toBeVisible();
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
