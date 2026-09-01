import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockQC2Session, mockQ3Session } from './support/auth-helpers';
import { referralRow } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Referral Pipeline — Gap 4, part 1 (Q2 refer + Q3 forward).
 * Q2 route: /recruitment/referrals
 * Q3 route: /recruitment/q3
 * APIs: GET /recruitment/referrals, POST /recruitment/referrals/forward
 */

const referrals = [
  referralRow({ referralId: 1, status: 'Referred' }),
  referralRow({ referralId: 2, candidate: 'Priya Patel', status: 'Referred' }),
  referralRow({ referralId: 3, candidate: 'Amit Shah', status: 'SentToCompany', sentToCompanyAt: '2026-08-25T10:00:00.000Z', expiresAt: '2026-09-08T10:00:00.000Z' }),
  referralRow({ referralId: 4, candidate: 'Neha Gupta', status: 'Expired', expiresAt: '2026-08-20T10:00:00.000Z' }),
];

test.describe('Q2 Referral Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
  });

  test('renders referral table with status badges', async ({ page }) => {
    await page.route('**/api/recruitment/referrals*', (route) => route.fulfill(json(referrals)));

    await page.goto('/recruitment/referrals');

    await expect(page.getByRole('heading', { name: 'Referrals' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Ravi Kumar').first()).toBeVisible();
    await expect(page.getByText('Priya Patel')).toBeVisible();
    await expect(page.getByText('Amit Shah')).toBeVisible();
    await expect(page.getByText('Neha Gupta')).toBeVisible();

    // Status badges
    await expect(page.getByText('Referred').first()).toBeVisible();
    await expect(page.getByText('SentToCompany')).toBeVisible();
    await expect(page.getByText('Expired')).toBeVisible();
  });

  test('empty referral list shows message', async ({ page }) => {
    await page.route('**/api/recruitment/referrals*', (route) => route.fulfill(json([])));

    await page.goto('/recruitment/referrals');

    await expect(page.getByText('No referrals found.')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Q3 Dashboard — Forward to Company', () => {
  test.beforeEach(async ({ page }) => {
    await mockQ3Session(page);
  });

  test('renders Q3 dashboard with stats and referral table', async ({ page }) => {
    await page.route('**/api/recruitment/referrals*', (route) => route.fulfill(json(referrals)));

    await page.goto('/recruitment/q3');

    await expect(page.getByRole('heading', { name: 'Q3 Dashboard' })).toBeVisible({ timeout: 10_000 });

    // Stats cards
    await expect(page.getByText('Pending Review')).toBeVisible();
    await expect(page.getByText('Sent to Company')).toBeVisible();
    await expect(page.getByText('Total')).toBeVisible();

    // Stat values: 2 Referred, 1 SentToCompany, 4 total
    await expect(page.getByText('2').first()).toBeVisible();
  });

  test('checkboxes appear only on Referred rows', async ({ page }) => {
    await page.route('**/api/recruitment/referrals*', (route) => route.fulfill(json(referrals)));

    await page.goto('/recruitment/q3');
    await expect(page.getByRole('heading', { name: 'Q3 Dashboard' })).toBeVisible({ timeout: 10_000 });

    // 2 checkboxes for the 2 "Referred" rows
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(2);
  });

  test('forward button appears when checkboxes selected', async ({ page }) => {
    await page.route('**/api/recruitment/referrals*', (route) => route.fulfill(json(referrals)));

    await page.goto('/recruitment/q3');
    await expect(page.getByRole('heading', { name: 'Q3 Dashboard' })).toBeVisible({ timeout: 10_000 });

    // Initially no forward button
    await expect(page.getByRole('button', { name: /Forward.*Company/i })).toHaveCount(0);

    // Check one referral
    await page.locator('input[type="checkbox"]').first().check();

    // Forward button should appear
    await expect(page.getByRole('button', { name: /Forward.*Company/i })).toBeVisible();
  });

  test('forward sends correct referral IDs', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/recruitment/referrals/forward', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ forwarded: 2 }));
    });
    await page.route('**/api/recruitment/referrals', (route) =>
      route.fulfill(json(referrals)),
    );

    await page.goto('/recruitment/q3');
    await expect(page.getByRole('heading', { name: 'Q3 Dashboard' })).toBeVisible({ timeout: 10_000 });

    // Select both Referred rows
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await page.getByRole('button', { name: /Forward.*Company/i }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ referralIds: expect.arrayContaining([1, 2]) });
  });
});
