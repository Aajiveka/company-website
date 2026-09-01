import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockQC1Session } from './support/auth-helpers';
import { CANDIDATE_DETAIL } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * QC1 Candidate Decision — Gap 9 (extended hold statuses).
 * Route: /recruitment/candidates/:id
 * API: POST /recruitment/candidates/:id/decision
 *
 * Tests that Approve goes straight through, all other decisions open a reason modal.
 */

function setupMocks(page: import('@playwright/test').Page, log: RequestLog[]) {
  return Promise.all([
    page.route('**/api/recruitment/candidates/100', (route) =>
      route.fulfill(json(CANDIDATE_DETAIL)),
    ),
    page.route('**/api/recruitment/candidates/100/decision', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ success: true }));
    }),
    // Supporting endpoints the page may call
    page.route('**/api/recruitment/jobs*', (route) => route.fulfill(json([]))),
    page.route('**/api/recruitment/document-types*', (route) => route.fulfill(json([]))),
  ]);
}

test.describe('QC1 Candidate Decision', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC1Session(page);
  });

  test('renders candidate details with decision buttons', async ({ page }) => {
    await setupMocks(page, []);
    await page.goto('/recruitment/candidates/100');

    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Software Engineer').first()).toBeVisible();
    await expect(page.getByText('Pending').first()).toBeVisible();

    // All decision buttons visible for Pending status
    await expect(page.getByRole('button', { name: 'Approve CV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'On Hold' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Need More Info' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Duplicate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdrawn' })).toBeVisible();
  });

  test('Approve sends immediately without reason modal', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, log);
    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Approve CV' }).click();

    // No modal should appear — decision is sent directly
    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ decision: 'Approved' });
  });

  test('Reject opens reason modal and sends with reason', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, log);
    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Reject' }).click();
    // Modal opens with title matching the decision
    await expect(page.getByText('Reason')).toBeVisible();

    await page.locator('textarea').fill('Insufficient experience');
    await page.getByRole('button', { name: 'Confirm' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ decision: 'Rejected', reason: 'Insufficient experience' });
  });

  test('OnHold opens reason modal', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, log);
    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'On Hold' }).click();
    await expect(page.getByText('Reason')).toBeVisible();

    await page.locator('textarea').fill('Awaiting more candidates');
    await page.getByRole('button', { name: 'Confirm' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ decision: 'OnHold', reason: 'Awaiting more candidates' });
  });

  test('NeedMoreInfo opens reason modal', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, log);
    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Need More Info' }).click();
    await expect(page.getByText('Reason')).toBeVisible();

    await page.locator('textarea').fill('Need updated resume');
    await page.getByRole('button', { name: 'Confirm' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ decision: 'NeedMoreInfo', reason: 'Need updated resume' });
  });

  test('Duplicate opens reason modal', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, log);
    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Duplicate' }).click();
    await expect(page.getByText('Reason')).toBeVisible();

    await page.locator('textarea').fill('Already registered');
    await page.getByRole('button', { name: 'Confirm' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ decision: 'Duplicate', reason: 'Already registered' });
  });

  test('Withdrawn opens reason modal', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, log);
    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Withdrawn' }).click();
    await expect(page.getByText('Reason')).toBeVisible();

    await page.locator('textarea').fill('Candidate withdrew');
    await page.getByRole('button', { name: 'Confirm' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ decision: 'Withdrawn', reason: 'Candidate withdrew' });
  });

  test('confirm sends without reason when textarea is empty', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, log);
    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'On Hold' }).click();
    await expect(page.getByText('Reason')).toBeVisible();

    // Leave textarea empty, confirm
    await page.getByRole('button', { name: 'Confirm' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ decision: 'OnHold' });
  });
});
