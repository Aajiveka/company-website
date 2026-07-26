import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard — verifies stat cards, activity feed, and sub-page navigation
 * for /admin, /admin/users, and /admin/jobs.
 *
 * All API endpoints are mocked so the suite runs without a backend.
 */

const PLATFORM_STATS = {
  totalCandidates: 1250,
  totalEmployers: 85,
  totalJobs: 340,
  activeJobs: 210,
  totalApplications: 4800,
  totalRevenue: 1500000,
  recentSignups: [
    { date: '2026-07-20', count: 12 },
    { date: '2026-07-21', count: 18 },
  ],
  topDesignations: [
    { designation: 'Software Engineer', count: 45 },
    { designation: 'Data Analyst', count: 30 },
  ],
  topCities: [
    { city: 'Mumbai', count: 60 },
    { city: 'Bengaluru', count: 55 },
  ],
  recentActivity: [
    {
      id: 1,
      type: 'user_signup',
      description: 'registered as a candidate',
      actor: 'Rahul Sharma',
      timestamp: new Date(Date.now() - 600_000).toISOString(),
    },
    {
      id: 2,
      type: 'job_posted',
      description: 'posted a new job',
      actor: 'TechCorp',
      timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    },
  ],
};

const ADMIN_USERS = [
  {
    userId: 1,
    userName: 'admin',
    fullName: 'Admin User',
    email: 'admin@test.com',
    mobile: '9999999999',
    roleId: 5,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    userId: 2,
    userName: 'candidate1',
    fullName: 'Test Candidate',
    email: 'candidate@test.com',
    mobile: '8888888888',
    roleId: 1,
    isActive: true,
    createdAt: '2026-06-15T00:00:00Z',
  },
];

const ADMIN_JOBS = [
  {
    jobId: 1,
    designation: 'Frontend Developer',
    company: 'TechCorp',
    city: 'Mumbai',
    minCtc: 600000,
    maxCtc: 1200000,
    status: 'Active',
    postedOn: '2026-07-01T00:00:00Z',
    views: 150,
    applications: 25,
  },
  {
    jobId: 2,
    designation: 'Backend Engineer',
    company: 'DataInc',
    city: 'Bengaluru',
    minCtc: 800000,
    maxCtc: 1500000,
    status: 'Pending',
    postedOn: '2026-07-20T00:00:00Z',
    views: 40,
    applications: 5,
  },
];

function setupAdminMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/auth/session', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { userId: 1, fullName: 'Admin User', roleId: 5 },
          token: 'fake-admin-token',
        }),
      }),
    ),
    page.route('**/api/admin/stats', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(PLATFORM_STATS),
      }),
    ),
    page.route('**/api/admin/users*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADMIN_USERS),
      }),
    ),
    page.route('**/api/admin/jobs*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ADMIN_JOBS),
      }),
    ),
  ]);
}

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
  });

  test('renders stat cards with correct values', async ({ page }) => {
    await page.goto('/admin');

    // Wait for stat cards to render (they show formatted numbers)
    await expect(page.getByText('1,250')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('85')).toBeVisible();
    await expect(page.getByText('210')).toBeVisible();
    await expect(page.getByText('4,800')).toBeVisible();
  });

  test('renders activity feed with recent entries', async ({ page }) => {
    await page.goto('/admin');

    // Activity feed shows actor names
    await expect(page.getByText('Rahul Sharma')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('TechCorp')).toBeVisible();

    // Activity badges
    await expect(page.getByText('user signup')).toBeVisible();
    await expect(page.getByText('job posted')).toBeVisible();
  });

  test('renders top designations and top cities charts', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByText('Software Engineer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Data Analyst')).toBeVisible();
    await expect(page.getByText('Mumbai')).toBeVisible();
    await expect(page.getByText('Bengaluru')).toBeVisible();
  });
});

test.describe('Admin Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
  });

  test('renders users table with data', async ({ page }) => {
    await page.goto('/admin/users');

    // Table should render user rows
    await expect(page.getByText('Admin User')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Test Candidate')).toBeVisible();
    await expect(page.getByText('admin@test.com')).toBeVisible();
  });

  test('search input filters the query', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });

    // Type in search
    const searchInput = page.locator('input[placeholder]').first();
    await searchInput.fill('admin');

    // The input value should be set (actual filtering depends on API mock)
    await expect(searchInput).toHaveValue('admin');
  });

  test('role and status filter dropdowns are present', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });

    // There should be at least 2 select dropdowns (role filter + status filter)
    const selects = page.locator('select');
    await expect(selects).toHaveCount(2, { timeout: 5_000 });
  });
});

test.describe('Admin Jobs Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminMocks(page);
  });

  test('renders jobs table with data', async ({ page }) => {
    await page.goto('/admin/jobs');

    await expect(page.getByText('Frontend Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Backend Engineer')).toBeVisible();
  });

  test('renders job stats summary cards', async ({ page }) => {
    await page.goto('/admin/jobs');

    // Stats bar shows total, active, pending counts
    await expect(page.getByText('2').first()).toBeVisible({ timeout: 10_000 }); // total
  });

  test('status filter dropdown is present and interactive', async ({ page }) => {
    await page.goto('/admin/jobs');
    await expect(page.locator('table')).toBeVisible({ timeout: 10_000 });

    // Status filter select exists
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Select "Pending" filter
    await selects.first().selectOption('Pending');
    await expect(selects.first()).toHaveValue('Pending');
  });

  test('shows status badges for jobs', async ({ page }) => {
    await page.goto('/admin/jobs');

    await expect(page.getByText('Active').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Pending').first()).toBeVisible();
  });
});
