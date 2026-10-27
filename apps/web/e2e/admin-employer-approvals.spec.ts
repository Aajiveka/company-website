import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockAdminSession } from './support/auth-helpers';
import { PENDING_REGISTRATION } from './support/employer-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Admin Employer Approvals — Gap 1 (admin side).
 * Route: /admin/employer-approvals
 * APIs: GET /admin/employer-registrations?status=, POST /admin/employer-registrations/:id/review,
 *       GET /clients/masters (the city picker)
 */

const registrations = [
  { ...PENDING_REGISTRATION, id: 1, status: 'Pending' as const, suggestedCityId: 10, reviewedBy: null, adminNotes: null },
  { ...PENDING_REGISTRATION, id: 2, companyName: 'ApprovedCo', status: 'Approved' as const, reviewedAt: '2026-08-29T10:00:00.000Z', reviewedBy: 'Aajiveka Admin', suggestedCityId: null },
  { ...PENDING_REGISTRATION, id: 3, companyName: 'RejectedCo', status: 'Rejected' as const, reviewedAt: '2026-08-29T12:00:00.000Z', reviewedBy: 'Aajiveka Admin', suggestedCityId: null },
];

/** Answers like the API: filtered by ?status=, everything without it. */
async function mockRegistrations(page: import('@playwright/test').Page, rows = registrations) {
  await page.route('**/api/admin/employer-registrations?*', (route) => {
    const status = new URL(route.request().url()).searchParams.get('status');
    return route.fulfill(json(status ? rows.filter((r) => r.status === status) : rows));
  });
  await page.route('**/api/admin/employer-registrations', (route) =>
    route.request().method() === 'GET' ? route.fulfill(json(rows)) : route.fallback(),
  );
  await page.route('**/api/admin/stats', (route) => route.fulfill(json({ employers: { pendingRegistrations: 1 } })));
  await page.route('**/api/clients/masters', (route) =>
    route.fulfill(json({ states: [{ id: 1, label: 'Delhi' }], cities: [{ id: 10, label: 'New Delhi', stateId: 1 }] })),
  );
}

test.describe('Admin Employer Approvals', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminSession(page);
  });

  test('opens on the Pending tab, and All shows every status', async ({ page }) => {
    await mockRegistrations(page);
    await page.goto('/admin/employer-approvals');

    await expect(page.getByRole('heading', { level: 1, name: 'Employer approvals' })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table').getByText('NewCorp Pvt Ltd')).toBeVisible();
    await expect(page.locator('table').getByText('ApprovedCo')).toHaveCount(0);

    await page.getByRole('tab', { name: 'All' }).click();
    await expect(page.locator('table').getByText('ApprovedCo')).toBeVisible();
    await expect(page.locator('table').getByText('RejectedCo')).toBeVisible();
    await expect(page).toHaveURL(/status=all/);
  });

  test('empty state shows message', async ({ page }) => {
    await mockRegistrations(page, []);
    await page.goto('/admin/employer-approvals?status=all');
    await expect(page.getByText('No employer registrations found.')).toBeVisible({ timeout: 10_000 });
  });

  test('review button only on Pending rows', async ({ page }) => {
    await mockRegistrations(page);
    await page.goto('/admin/employer-approvals?status=all');
    await expect(page.locator('table').getByText('NewCorp Pvt Ltd')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Review' })).toHaveCount(1);
  });

  test('approve confirms first, then sends the decision with the matched city', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockRegistrations(page);
    await page.route('**/api/admin/employer-registrations/*/review', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ ok: true }));
    });

    await page.goto('/admin/employer-approvals');
    await page.getByRole('button', { name: 'Review' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Company email (becomes the login)')).toBeVisible();

    await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
    expect(log.length).toBe(0); // nothing is sent before the confirmation
    await dialog.getByRole('button', { name: 'Yes, approve' }).click();

    await expect.poll(() => log.find((r) => r.method === 'POST')?.body).toMatchObject({ decision: 'Approved', cityId: 10 });
  });

  test('approve is blocked until a city is chosen when the location matched none', async ({ page }) => {
    await mockRegistrations(page, [{ ...registrations[0], suggestedCityId: null }]);
    await page.goto('/admin/employer-approvals');
    await page.getByRole('button', { name: 'Review' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(dialog.getByText('Choose the company’s city first')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Yes, approve' })).toHaveCount(0);
  });

  test('reject with notes sends correct payload', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockRegistrations(page);
    await page.route('**/api/admin/employer-registrations/*/review', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ ok: true }));
    });

    await page.goto('/admin/employer-approvals');
    await page.getByRole('button', { name: 'Review' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Reject' }).click();
    await dialog.getByLabel(/^Notes/).fill('Missing GSTIN');
    await dialog.getByRole('button', { name: 'Yes, reject' }).click();

    await expect.poll(() => log.find((r) => r.method === 'POST')?.body).toMatchObject({ decision: 'Rejected', notes: 'Missing GSTIN' });
  });
});
