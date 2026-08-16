import { test, expect, type Page } from '@playwright/test';
import { mockCandidateSession, mockJobsApi, json } from './support/mocks';

// page.route() only sees traffic when MSW's service worker is off.
test.use({ serviceWorkers: 'block' });

/**
 * Portal header + avatar menu — every clickable target in the signed-in chrome.
 *
 * The header is the one component present on every candidate screen, so a link that points at
 * a route nobody registered shows up as a 404 on every page rather than in one corner of the
 * app. These specs click each target for real and assert the destination actually rendered:
 * not the NotFound page, not an error boundary, and with no console error on the way.
 */

/** Endpoints the portal screens call that the candidate fixtures do not cover. */
async function mockPortalExtras(page: Page) {
  await page.route('**/api/candidates/me/privacy', (route) =>
    route.fulfill(json({ showCurrentEmployer: true, allowRecruiterMessages: true, exportRequestedAt: null })),
  );
  await page.route('**/api/candidates/me/referrals', (route) =>
    route.fulfill(
      json({
        code: 'PRIYA10',
        totalInvited: 0,
        successfulSignups: 0,
        earnedRupees: 0,
        pendingRupees: 0,
        referrals: [],
      }),
    ),
  );
  await page.route('**/api/candidates/me/dashboard', (route) =>
    route.fulfill(json({ appliedCount: 2, interviewCount: 1, savedCount: 0, profileCompletion: 72 })),
  );
  // The shared fixture's /candidates/me catch-all answers unknown sub-paths with the profile
  // object, so the documents list has to be claimed explicitly — the page maps over it and an
  // object where an array belongs takes the whole screen down to its error boundary.
  await page.route('**/api/candidates/me/documents**', (route) => route.fulfill(json([])));
  await page.route('**/api/payments/**', (route) => route.fulfill(json([])));
}

/**
 * Fails the test if the destination is the 404 screen or a caught render error.
 *
 * Every portal screen is lazy-loaded behind a Suspense fallback, so asserting the absence of
 * the 404 heading straight after a click passes while the chunk is still in flight — the
 * assertion has to wait for the route to actually commit first. Waiting for the loader to go
 * is what makes this a real check rather than a no-op.
 */
async function expectRendered(page: Page) {
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: /page not found/i })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /something went wrong/i })).toHaveCount(0);
}

async function openAvatarMenu(page: Page) {
  await page.getByRole('button', { name: 'Your account' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

/** Every entry of the avatar menu, with the URL it must land on. */
const MENU_ITEMS = [
  { label: 'My Profile', url: '/candidate/profile' },
  { label: 'My Resume', url: '/candidate/resume-builder' },
  { label: 'Applications', url: '/candidate/applications' },
  { label: 'Saved Jobs', url: '/candidate/saved-jobs' },
  { label: 'Account Settings', url: '/candidate/account' },
  { label: 'Privacy Settings', url: '/candidate/account?tab=privacy' },
  { label: 'Help & Support', url: '/help' },
] as const;

/** The links and pills sitting directly in the bar, left to right. */
const HEADER_ITEMS = [
  { name: 'Home', url: '/' },
  { name: 'Jobs', url: '/jobs' },
  { name: 'Applications', url: '/candidate/applications' },
  { name: 'Saved Jobs', url: '/candidate/saved-jobs' },
  { name: 'Help and support', url: '/help' },
  { name: 'Wallet', url: '/candidate/subscription' },
  { name: 'Alerts', url: '/candidate/all-notifications' },
] as const;

test.describe('portal header navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandidateSession(page);
    await mockJobsApi(page);
    await mockPortalExtras(page);
  });

  test('the avatar menu opens and shows the signed-in candidate', async ({ page }) => {
    await page.goto('/candidate/profile');
    await openAvatarMenu(page);

    const menu = page.getByRole('menu');
    await expect(menu.getByText('Priya Patel')).toBeVisible();
    await expect(menu.getByText('priya@example.com')).toBeVisible();
    await expect(menu.getByText(/Profile \d+% complete/)).toBeVisible();

    // Escape closes it, like every other menu in the app.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  for (const item of MENU_ITEMS) {
    test(`avatar menu → ${item.label} lands on ${item.url}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));

      await page.goto('/candidate/profile');
      await openAvatarMenu(page);
      await page.getByRole('menuitem', { name: item.label }).click();

      await expect(page).toHaveURL(new RegExp(`${item.url.replace(/[?]/g, '\\?')}$`));
      await expectRendered(page);
      // The menu closes on navigation rather than following the user to the next screen.
      await expect(page.getByRole('menu')).toHaveCount(0);
      expect(errors, `console errors on ${item.url}`).toEqual([]);
    });
  }

  test('Privacy Settings opens the account screen on its Privacy tab', async ({ page }) => {
    await page.goto('/candidate/profile');
    await openAvatarMenu(page);
    await page.getByRole('menuitem', { name: 'Privacy Settings' }).click();

    await expect(page.getByRole('heading', { name: 'Privacy Settings' })).toBeVisible();
    await expect(page.getByText('Show Current Employer')).toBeVisible();
  });

  for (const item of HEADER_ITEMS) {
    test(`header → ${item.name} lands on ${item.url}`, async ({ page }) => {
      await page.goto('/candidate/profile');
      await page.getByRole('navigation', { name: 'Portal' }).getByRole('link', { name: item.name, exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`${item.url}$`));
      await expectRendered(page);
    });
  }

  test('the module tiles in the rail each open their screen', async ({ page }) => {
    const tiles = [
      { name: 'Interviews', url: '/candidate/interviews' },
      { name: 'Documents', url: '/candidate/documents' },
      { name: 'Refer a Friend', url: '/candidate/referrals' },
      { name: 'Account Settings', url: '/candidate/account' },
      { name: 'Application Tracker', url: '/candidate/tracker' },
      { name: 'Resume Builder', url: '/candidate/resume-builder' },
      { name: 'Email Preferences', url: '/candidate/notifications' },
    ];

    for (const tile of tiles) {
      await page.goto('/candidate/profile');
      // Each tile's accessible name is its label followed by its blurb, so anchor on the start.
      await page.locator('#modules').getByRole('link', { name: new RegExp(`^${tile.name}`) }).click();
      await expect(page).toHaveURL(new RegExp(`${tile.url}$`));
      await expectRendered(page);
    }
  });

  test('the hero actions on the profile screen are wired', async ({ page }) => {
    await page.goto('/candidate/profile');

    // Edit Profile drops into the wizard.
    await page.getByRole('link', { name: 'Edit Profile' }).click();
    await expect(page).toHaveURL(/\/candidate\/onboarding$/);
    await expectRendered(page);

    // Share Profile copies a link rather than navigating.
    await page.goto('/candidate/profile');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: /Share Profile/ }).click();
    await expect(page.getByRole('button', { name: /Link copied/ })).toBeVisible();
  });

  test('each section Edit link opens the wizard on that step', async ({ page }) => {
    const sections = [
      { card: 'summary', step: 'summary' },
      { card: 'experience', step: 'experience' },
      { card: 'education', step: 'education' },
      { card: 'job-preferences', step: 'preferences' },
    ];

    for (const section of sections) {
      await page.goto('/candidate/profile');
      await page.locator(`#${section.card}`).getByRole('link').first().click();
      await expect(page).toHaveURL(new RegExp(`step=${section.step}$`));
      await expectRendered(page);
    }
  });

  test('Logout clears the session and returns to the login screen', async ({ page }) => {
    await page.route('**/api/auth/logout', (route) => route.fulfill(json({ ok: true })));

    await page.goto('/candidate/profile');
    await openAvatarMenu(page);
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('aaj.refresh'))).toBeFalsy();
  });
});
