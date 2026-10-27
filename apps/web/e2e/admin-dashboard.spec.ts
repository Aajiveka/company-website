import { test, expect } from '@playwright/test';

// These specs mock the network with page.route(), which requires MSW's service
// worker to be OFF. Blocking it makes the app fall back to the real network layer
// where Playwright's route handlers apply. (See bootstrap fallback in src/main.tsx.)
test.use({ serviceWorkers: 'block' });

/**
 * Admin Dashboard, Users and Jobs — rendering and request shape, against mocks.
 *
 * The mocks are the shapes /api/admin/* actually returns (admin.service.ts). The previous
 * version mocked jobs with status "Pending" and views: 150 — values the API never produced —
 * so it passed while job moderation could not be triggered at all. The real-API counterpart
 * of this suite is tests/admin-e2e.mjs.
 */

const STATS = {
  users: { total: 1250, active: 1200, inactive: 50, byRole: [{ roleId: 1, count: 1100 }, { roleId: 5, count: 2 }] },
  candidates: { total: 1100, last30Days: 30 },
  employers: { total: 85, pendingRegistrations: 3 },
  jobs: { total: 340, byStatus: { Active: 210, Closed: 100, Archived: 20, Draft: 10 } },
  applications: {
    total: 4800,
    byStage: { Screening: 2000, WithQ3: 300, CompanyReview: 900, Interview: 700, Selection: 200, Joined: 150, Closed: 550 },
    byStatus: [],
  },
  payments: { successfulOrders: 12, revenueInr: 1500000 },
  signups: [{ date: '2026-07-20', count: 12 }],
  topDesignations: [
    { label: 'Software Engineer', count: 45 },
    { label: 'Data Analyst', count: 30 },
  ],
  topCities: [
    { label: 'Mumbai', count: 60 },
    { label: 'Bengaluru', count: 55 },
  ],
  recentActivity: [
    { id: 1, action: 'admin.job_closed', entity: 'ClientJobs', entityId: '7', userId: 5, actor: 'Rahul Sharma', detail: null, ipAddress: null, at: new Date(Date.now() - 600_000).toISOString() },
    { id: 2, action: 'q3.round_decision', entity: null, entityId: null, userId: 6, actor: 'Priya Nair', detail: null, ipAddress: null, at: new Date(Date.now() - 3_600_000).toISOString() },
  ],
};

const page1 = <T,>(items: T[]) => ({ items, total: items.length, page: 1, pageSize: 20, pageCount: 1 });

const USERS = page1([
  { userId: 1, userName: 'admin', fullName: 'Admin User', email: 'admin@test.com', mobile: '', roleId: 5, isActive: true, subscriberId: null, clientId: null, createdAt: '2026-01-01T00:00:00Z' },
  { userId: 2, userName: 'candidate1', fullName: 'Test Candidate', email: 'candidate@test.com', mobile: '8888888888', roleId: 1, isActive: true, subscriberId: 9, clientId: null, createdAt: '2026-06-15T00:00:00Z' },
]);

const JOBS = {
  ...page1([
    { jobId: 1, clientId: 3, designation: 'Frontend Developer', company: 'TechCorp', city: 'Mumbai', minCtc: 600000, maxCtc: 1200000, status: 'Active', postedOn: '2026-07-01T00:00:00Z', applications: 25, allowedActions: ['close'] },
    { jobId: 2, clientId: 4, designation: 'Backend Engineer', company: 'DataInc', city: 'Bengaluru', minCtc: 800000, maxCtc: 1500000, status: 'Draft', postedOn: '2026-07-20T00:00:00Z', applications: 0, allowedActions: [] },
  ]),
  counts: { Active: 1, Closed: 0, Archived: 0, Draft: 1 },
};

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function setupAdminMocks(page: import('@playwright/test').Page) {
  await page.addInitScript(() => localStorage.setItem('aaj.refresh', 'fake-refresh-token'));
  await page.route('**/api/auth/refresh', (r) => r.fulfill(json({ accessToken: 'fake-access', refreshToken: 'fake-refresh-token' })));
  await page.route('**/api/auth/me', (r) => r.fulfill(json({ userId: 1, fullName: 'Admin User', roleId: 5 })));
  await page.route('**/api/notifications/**', (r) => r.fulfill(json([])));
  await page.route('**/api/admin/stats', (r) => r.fulfill(json(STATS)));
  await page.route('**/api/admin/users*', (r) => r.fulfill(json(USERS)));
  await page.route('**/api/admin/jobs?*', (r) => r.fulfill(json(JOBS)));
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => setupAdminMocks(page));

  test('renders stat cards from the stats endpoint', async ({ page }) => {
    await page.goto('/admin');
    const main = page.locator('main');
    await expect(main.getByRole('link', { name: /Logins\s*1,250/ })).toBeVisible({ timeout: 10_000 });
    await expect(main.getByRole('link', { name: /Active jobs\s*210/ })).toBeVisible();
    await expect(main.getByRole('link', { name: /Applications\s*4,800/ })).toBeVisible();
    await expect(main.getByText('₹15,00,000')).toBeVisible();
  });

  test('pending employer registrations are badged in the sidebar', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('navigation', { name: 'Admin' }).getByLabel('3 pending')).toBeVisible({ timeout: 10_000 });
  });

  test('activity feed reads as sentences with actor names', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Closed a job')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Rahul Sharma')).toBeVisible();
    await expect(page.getByText('Recorded a round decision')).toBeVisible();
  });

  test('pipeline stages link to the filtered applications list', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('link', { name: /Interviews\s*700/ })).toHaveAttribute('href', '/admin/applications?stage=Interview', { timeout: 10_000 });
  });

  test('renders top designations and cities', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByText('Software Engineer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Bengaluru')).toBeVisible();
  });
});

test.describe('Admin Users Page', () => {
  test.beforeEach(async ({ page }) => setupAdminMocks(page));

  test('renders users table with data', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('table').getByText('Admin User')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table').getByText('Test Candidate')).toBeVisible();
    await expect(page.locator('table').getByText('admin@test.com')).toBeVisible();
  });

  test('search is sent to the server, debounced', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('table').getByText('Admin User')).toBeVisible({ timeout: 10_000 });
    const req = page.waitForRequest((r) => r.url().includes('/api/admin/users') && r.url().includes('q=cand'));
    await page.getByRole('searchbox', { name: 'Search users' }).fill('cand');
    await req;
  });

  test('role and status filters are present', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('combobox', { name: 'Role' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('combobox', { name: 'Status' })).toBeVisible();
  });

  test('the admin cannot select their own row for bulk deactivation', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('table').getByText('Admin User')).toBeVisible({ timeout: 10_000 });
    const own = page.locator('table tbody tr', { hasText: 'Admin User' }).getByRole('checkbox');
    await expect(own).toBeDisabled();
  });
});

test.describe('Admin Jobs Page', () => {
  test.beforeEach(async ({ page }) => setupAdminMocks(page));

  test('renders jobs with their status', async ({ page }) => {
    await page.goto('/admin/jobs');
    await expect(page.locator('table').getByText('Frontend Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('table').getByText('Backend Engineer')).toBeVisible();
    await expect(page.locator('table').getByText('Draft')).toBeVisible();
  });

  test('status tabs show counts and filter on the server', async ({ page }) => {
    await page.goto('/admin/jobs');
    await expect(page.getByRole('tab', { name: /Active\s*1/ })).toBeVisible({ timeout: 10_000 });
    const req = page.waitForRequest((r) => r.url().includes('/api/admin/jobs') && r.url().includes('status=Closed'));
    await page.getByRole('tab', { name: /Closed/ }).click();
    await req;
  });

  // Draft and Archived belong to the employer: there is no admin action to offer.
  test('only an Active job offers Close; a Draft offers nothing', async ({ page }) => {
    await page.goto('/admin/jobs');
    const active = page.locator('table tbody tr', { hasText: 'Frontend Developer' });
    const draft = page.locator('table tbody tr', { hasText: 'Backend Engineer' });
    await expect(active.getByRole('button', { name: 'Close' })).toBeVisible({ timeout: 10_000 });
    await expect(draft.getByRole('button')).toHaveCount(0);
    await expect(draft.getByText('Employer-managed')).toBeVisible();
  });

  test('closing asks for confirmation and sends the close action', async ({ page }) => {
    let body: unknown;
    await page.route('**/api/admin/jobs/1/status', (r) => {
      body = r.request().postDataJSON();
      return r.fulfill(json({ ok: true, updated: 1 }));
    });
    await page.goto('/admin/jobs');
    await page.locator('table tbody tr', { hasText: 'Frontend Developer' }).getByRole('button', { name: 'Close' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('stop taking applications');
    await dialog.getByRole('button', { name: 'Close job', exact: true }).click();
    await expect.poll(() => body).toEqual({ action: 'close' });
  });
});
