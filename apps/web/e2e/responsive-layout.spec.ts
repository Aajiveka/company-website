import { test, expect, type Page } from '@playwright/test';
import { json, jobDetail, mockJobsApi } from './support/mocks';
import { mockAdminSession } from './support/auth-helpers';
import { VIEWPORTS, pageScrollsSideways } from './support/layout';

test.use({ serviceWorkers: 'block' });

/**
 * Responsive regression sweep — every public page at every audited viewport, plus the screens
 * whose phone layouts were fixed in the responsive audit.
 *
 * Fully mocked: anything not answered below gets a 404, so the pages render their empty or
 * error states. That is deliberate — those states have to fit a phone too.
 */

const PUBLIC_ROUTES = [
  '/',
  '/jobs',
  '/jobs/1',
  '/login',
  '/register',
  '/register/employer',
  '/forgot-password',
  '/reset-password?token=x',
  '/search?q=developer',
  '/pricing',
  '/about',
  '/contact',
  '/help',
  '/blogs',
  '/career',
  '/testimonial',
  '/privacy',
  '/terms',
  '/subscription',
  '/resume',
  '/student',
  '/salary-insights',
  '/this-page-does-not-exist',
];

/** Untranslated i18n keys rendered as text, e.g. "adminSettings.tagline". */
const RAW_KEY = /\b(?:adminSettings|adminJobs|adminUsers|blogCms|admin|actions|nav)\.[a-z][A-Za-z]+\b/;

async function mockUnhandledApi(page: Page) {
  // Registered first, so every more specific route below takes precedence.
  await page.route('**/api/**', (route) => route.fulfill(json({ message: 'Not mocked' }, 404)));
}

/** Uncaught exceptions during the test — a layout must never get there by crashing. */
function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

for (const vp of VIEWPORTS) {
  test.describe(`public pages at ${vp.width}x${vp.height} (${vp.name})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const route of PUBLIC_ROUTES) {
      test(`${route} does not scroll sideways`, async ({ page }) => {
        const errors = collectPageErrors(page);
        await mockUnhandledApi(page);
        await mockJobsApi(page, { detail: jobDetail({ jobId: 1 }) });

        await page.goto(route);
        // Any heading rather than <main>: the 404 page draws its own screen without a landmark.
        await expect(page.getByRole('heading').first()).toBeVisible();
        await page.waitForLoadState('networkidle');

        expect(await pageScrollsSideways(page), `${route} scrolls sideways at ${vp.width}px`).toBe(false);
        expect(errors).toEqual([]);
      });
    }
  });
}

test.describe('public header', () => {
  test.beforeEach(async ({ page }) => {
    await mockUnhandledApi(page);
  });

  test('on a phone, one Menu carries every link — including the login portals', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/about');

    const header = page.getByRole('navigation', { name: 'Main' });
    // The desktop pills are gone, so nothing runs off the right edge…
    await expect(header.getByRole('link', { name: 'Find Jobs' })).toBeHidden();
    // …and the menu that replaces them is fully on-screen.
    const menu = header.getByRole('button', { name: /menu/i });
    const box = await menu.boundingBox();
    expect(box && box.x + box.width).toBeLessThanOrEqual(320);

    await menu.click();
    for (const item of ['Home', 'Find Jobs', 'Register Now', 'Student', 'Candidate Login', 'Admin Login']) {
      await expect(page.getByRole('menuitem', { name: item })).toBeVisible();
    }
    await page.getByRole('menuitem', { name: 'Employer Login' }).click();
    await expect(page).toHaveURL(/\/login\?as=employer$/);
  });

  test('from md up the desktop links are back and the Menu is gone', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/about');

    const header = page.getByRole('navigation', { name: 'Main' });
    await expect(header.getByRole('button', { name: /^menu$/i })).toBeHidden();
    await expect(header.getByRole('link', { name: 'Find Jobs' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('the home hero headline starts below the fixed header on a phone', async ({ page }) => {
    await mockJobsApi(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    const headerBox = await page.locator('header').first().boundingBox();
    const h1Box = await page.getByRole('heading', { level: 1 }).boundingBox();
    expect(headerBox && h1Box && h1Box.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height);
  });

  test('the testimonial page starts with a solid header over its pale banner', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/testimonial');
    await expect(page.locator('header').first()).toHaveClass(/bg-primary/);
  });
});

test.describe('admin screens on the smallest phone', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test.beforeEach(async ({ page }) => {
    await mockUnhandledApi(page);
    await mockAdminSession(page);
    await page.route('**/api/admin/settings', (route) =>
      route.fulfill(
        json({
          siteName: 'Aajiveka',
          tagline: 'Empowering Careers',
          supportEmail: 'support@example.com',
          tollFreeNumber: '1800 000 000',
          enableJobAlerts: true,
          enableAssessments: false,
          enableReferrals: true,
          enableMessaging: false,
          maintenanceMode: false,
          registrationOpen: true,
          enableEmailNotifications: true,
          smtpHost: '',
          smtpPort: 587,
          senderEmail: '',
          senderName: '',
          maxJobsPerEmployer: 50,
          maxApplicationsPerCandidate: 100,
          maxFileUploadSizeMb: 10,
        }),
      ),
    );
    // The paginated shape /api/admin/jobs returns; a bare array rendered an empty table, so
    // the 320px check never saw a real row.
    await page.route('**/api/admin/jobs*', (route) =>
      route.fulfill(
        json({
          page: 1,
          pageSize: 20,
          total: 1,
          pageCount: 1,
          counts: { Active: 1, Closed: 0, Archived: 0, Draft: 0 },
          items: [
          {
            jobId: 1,
            designation: 'Senior React Developer',
            company: 'TechCorp',
            city: 'Pune',
            minCtc: 1800000,
            maxCtc: 2800000,
            status: 'Active',
            postedOn: '2026-08-10T09:00:00.000Z',
            applications: 8,
            clientId: 3,
            allowedActions: ['close'],
          },
          ],
        }),
      ),
    );
  });

  // The settings toggles were pushed off-screen by untranslated keys — long unbreakable strings
  // like "adminSettings.maintenanceModeDesc" — so both are checked together.
  for (const route of ['/admin/settings', '/admin/jobs']) {
    test(`${route} fits and shows no raw translation keys`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');

      expect(await pageScrollsSideways(page)).toBe(false);
      expect(await page.locator('main').innerText()).not.toMatch(RAW_KEY);
    });
  }
});
