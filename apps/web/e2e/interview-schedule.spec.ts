import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockQC1Session } from './support/auth-helpers';
import { INTERVIEW_ROW, ELIGIBLE_APPLICATION, INTERVIEW_MODE } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * The flat, single-interview schedule — QC's `/recruitment/interviews` screen.
 * APIs: GET/POST /recruitment/interviews, POST /recruitment/interviews/:id/status
 *
 * This was called `interview-rounds.spec.ts` and described as "Gap 4, part 2 (schedule +
 * round result)", but every test here drives the legacy flat model: schedule one interview,
 * mark it Completed or Cancelled. It never touched multi-round interviews, which are a
 * different set of endpoints and a different role. The tests are good — the name was wrong.
 * Real rounds coverage now lives in `interview-rounds.spec.ts`.
 */

const interviews = [
  { ...INTERVIEW_ROW, interviewId: 1, interviewStatusId: 10, status: 'Scheduled' as const },
  { ...INTERVIEW_ROW, interviewId: 2, interviewStatusId: 11, candidate: 'Priya Patel', status: 'Completed' as const },
  { ...INTERVIEW_ROW, interviewId: 3, interviewStatusId: 12, candidate: 'Amit Shah', status: 'Cancelled' as const },
];

test.describe('Interview Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC1Session(page);
  });

  test('renders interview table with status badges', async ({ page }) => {
    await page.route('**/api/recruitment/interviews**', (route) => {
      if (route.request().url().includes('/eligible')) return route.fulfill(json([]));
      if (route.request().url().includes('/modes') || route.request().url().includes('interview-modes'))
        return route.fulfill(json([INTERVIEW_MODE]));
      return route.fulfill(json(interviews));
    });

    await page.goto('/recruitment/interviews');

    await expect(page.getByRole('heading', { name: 'Interviews' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Ravi Kumar').first()).toBeVisible();
    await expect(page.getByText('Priya Patel')).toBeVisible();
    await expect(page.getByText('Amit Shah')).toBeVisible();

    // Status badges
    await expect(page.getByText('Scheduled')).toBeVisible();
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('Cancelled')).toBeVisible();
  });

  test('empty state shows message', async ({ page }) => {
    await page.route('**/api/recruitment/interviews**', (route) => {
      if (route.request().url().includes('/eligible')) return route.fulfill(json([]));
      if (route.request().url().includes('interview-modes'))
        return route.fulfill(json([INTERVIEW_MODE]));
      return route.fulfill(json([]));
    });

    await page.goto('/recruitment/interviews');

    await expect(page.getByText('No interviews scheduled.')).toBeVisible({ timeout: 10_000 });
  });

  test('schedule interview button opens modal', async ({ page }) => {
    await page.route('**/api/recruitment/interviews**', (route) => {
      if (route.request().url().includes('/eligible'))
        return route.fulfill(json([ELIGIBLE_APPLICATION]));
      if (route.request().url().includes('interview-modes'))
        return route.fulfill(json([INTERVIEW_MODE]));
      return route.fulfill(json(interviews));
    });

    await page.goto('/recruitment/interviews');
    await expect(page.getByRole('heading', { name: 'Interviews' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Schedule Interview' }).click();

    // Modal opens with form fields — use the modal's label text to avoid ambiguity
    const modal = page.getByLabel('Schedule Interview');
    await expect(modal.getByText('Candidate')).toBeVisible();
    await expect(modal.getByText('Mode')).toBeVisible();
    await expect(modal.getByText('Date & Time')).toBeVisible();
  });

  test('schedule form validates required fields', async ({ page }) => {
    await page.route('**/api/recruitment/interviews**', (route) => {
      if (route.request().url().includes('/eligible'))
        return route.fulfill(json([ELIGIBLE_APPLICATION]));
      if (route.request().url().includes('interview-modes'))
        return route.fulfill(json([INTERVIEW_MODE]));
      return route.fulfill(json(interviews));
    });

    await page.goto('/recruitment/interviews');
    await expect(page.getByRole('heading', { name: 'Interviews' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Schedule Interview' }).click();
    // Submit without filling
    await page.getByRole('button', { name: 'Schedule' }).click();

    // Validation errors should appear
    await expect(page.getByText(/select a candidate|select a mode|pick a date/i).first()).toBeVisible();
  });

  test('mark interview completed sends correct status', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/recruitment/interviews**', (route) => {
      if (route.request().method() === 'POST' && route.request().url().includes('/status')) {
        recordRequest(log, route);
        return route.fulfill(json({ success: true }));
      }
      if (route.request().url().includes('/eligible')) return route.fulfill(json([]));
      if (route.request().url().includes('interview-modes'))
        return route.fulfill(json([INTERVIEW_MODE]));
      return route.fulfill(json(interviews));
    });

    await page.goto('/recruitment/interviews');
    await expect(page.getByText('Ravi Kumar').first()).toBeVisible({ timeout: 10_000 });

    // Click the Complete button on the Scheduled row
    await page.getByRole('button', { name: 'Complete' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ status: 'Completed' });
  });

  test('mark interview cancelled sends correct status', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/recruitment/interviews**', (route) => {
      if (route.request().method() === 'POST' && route.request().url().includes('/status')) {
        recordRequest(log, route);
        return route.fulfill(json({ success: true }));
      }
      if (route.request().url().includes('/eligible')) return route.fulfill(json([]));
      if (route.request().url().includes('interview-modes'))
        return route.fulfill(json([INTERVIEW_MODE]));
      return route.fulfill(json(interviews));
    });

    await page.goto('/recruitment/interviews');
    await expect(page.getByText('Ravi Kumar').first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Cancel' }).first().click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ status: 'Cancelled' });
  });

  test('action buttons only on Scheduled rows', async ({ page }) => {
    await page.route('**/api/recruitment/interviews**', (route) => {
      if (route.request().url().includes('/eligible')) return route.fulfill(json([]));
      if (route.request().url().includes('interview-modes'))
        return route.fulfill(json([INTERVIEW_MODE]));
      return route.fulfill(json(interviews));
    });

    await page.goto('/recruitment/interviews');
    await expect(page.getByText('Ravi Kumar').first()).toBeVisible({ timeout: 10_000 });

    // Only 1 Complete button (for the Scheduled row)
    await expect(page.getByRole('button', { name: 'Complete' })).toHaveCount(1);
  });
});
