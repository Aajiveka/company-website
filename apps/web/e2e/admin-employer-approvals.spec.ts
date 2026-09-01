import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockAdminSession } from './support/auth-helpers';
import { PENDING_REGISTRATION } from './support/employer-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Admin Employer Approvals — Gap 1 (admin side).
 * Route: /admin/employer-approvals
 * APIs: GET /admin/employer-registrations, POST /admin/employer-registrations/:id/review
 */

const registrations = [
  { ...PENDING_REGISTRATION, id: 1, status: 'Pending' as const },
  { ...PENDING_REGISTRATION, id: 2, companyName: 'ApprovedCo', status: 'Approved' as const, reviewedAt: '2026-08-29T10:00:00.000Z' },
  { ...PENDING_REGISTRATION, id: 3, companyName: 'RejectedCo', status: 'Rejected' as const, reviewedAt: '2026-08-29T12:00:00.000Z' },
];

test.describe('Admin Employer Approvals', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminSession(page);
  });

  test('renders table with registrations and status badges', async ({ page }) => {
    await page.route('**/api/admin/employer-registrations*', (route) =>
      route.fulfill(json(registrations)),
    );

    await page.goto('/admin/employer-approvals');

    await expect(page.getByRole('heading', { name: 'Employer Registrations' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('NewCorp Pvt Ltd')).toBeVisible();
    await expect(page.getByText('ApprovedCo')).toBeVisible();
    await expect(page.getByText('RejectedCo')).toBeVisible();

    // Status badges
    await expect(page.getByText('Pending').first()).toBeVisible();
    await expect(page.getByText('Approved').first()).toBeVisible();
    await expect(page.getByText('Rejected').first()).toBeVisible();
  });

  test('empty state shows message', async ({ page }) => {
    await page.route('**/api/admin/employer-registrations*', (route) =>
      route.fulfill(json([])),
    );

    await page.goto('/admin/employer-approvals');

    await expect(page.getByText('No employer registrations found.')).toBeVisible({ timeout: 10_000 });
  });

  test('review button only on Pending rows', async ({ page }) => {
    await page.route('**/api/admin/employer-registrations*', (route) =>
      route.fulfill(json(registrations)),
    );

    await page.goto('/admin/employer-approvals');
    await expect(page.getByText('NewCorp Pvt Ltd')).toBeVisible({ timeout: 10_000 });

    // Only one "Review" button (for the Pending row)
    const reviewButtons = page.getByRole('button', { name: 'Review' });
    await expect(reviewButtons).toHaveCount(1);
  });

  test('approve sends correct payload', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/admin/employer-registrations/*/review', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ success: true }));
    });
    await page.route('**/api/admin/employer-registrations', (route) =>
      route.fulfill(json(registrations)),
    );

    await page.goto('/admin/employer-approvals');
    await expect(page.getByText('NewCorp Pvt Ltd')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByText('Company Email')).toBeVisible();

    await page.getByRole('button', { name: 'Approve' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ decision: 'Approved' });
  });

  test('reject with notes sends correct payload', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/admin/employer-registrations/*/review', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ success: true }));
    });
    await page.route('**/api/admin/employer-registrations', (route) =>
      route.fulfill(json(registrations)),
    );

    await page.goto('/admin/employer-approvals');
    await expect(page.getByText('NewCorp Pvt Ltd')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Review' }).click();

    await page.getByLabel('Notes (optional)').fill('Missing GSTIN');
    await page.getByRole('button', { name: 'Reject' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ decision: 'Rejected', notes: 'Missing GSTIN' });
  });
});
