import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

/**
 * The navbar's login doors — one per audience.
 *
 * Every door posts to the same /auth/login; the portal is a client-side gate that picks the
 * copy and decides which roles that screen will sign in. The QC stages used to share the
 * admin door, so the case that matters most here is the narrowing: admin now accepts only
 * Role.Admin, and a QC1 who signs in there is rejected rather than let through.
 */

const card = (page: Page) => page.locator('#main-content');

/** Answers /auth/login with a session for `roleId`, and swallows the revoking logout. */
async function mockLoginAs(page: Page, roleId: number) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'fake-access',
        refreshToken: 'fake-refresh',
        user: { userId: 30, fullName: 'Staff User', roleId, isOnboarded: true },
      }),
    }),
  );
  await page.route('**/api/auth/logout', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
  );
}

async function submit(page: Page) {
  await card(page).getByLabel('Username or Email').fill('qc1');
  await card(page).getByLabel('Password', { exact: true }).fill('qc1');
  await card(page).getByRole('button', { name: 'Login', exact: true }).click();
}

test.describe('Login portals', () => {
  test('the navbar dropdown offers a door for every portal', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await page.getByRole('button', { name: 'Login' }).click();

    const menu = page.getByRole('menu');
    for (const label of [
      'Candidate Login',
      'Employer Login',
      'QC1 Login',
      'QC2 Login',
      'Q3 Login',
      'Admin Login',
    ]) {
      await expect(menu.getByRole('menuitem', { name: label })).toBeVisible();
    }
  });

  for (const [portal, heading] of [
    ['qc1', 'QC1 Login'],
    ['qc2', 'QC2 Login'],
    ['q3', 'Q3 Login'],
  ] as const) {
    test(`the ${portal} door has its own copy and no self-registration`, async ({ page }) => {
      await page.goto(`/login?as=${portal}`);

      await expect(card(page).getByRole('heading', { name: heading })).toBeVisible({ timeout: 10_000 });
      // Staff accounts are provisioned, and OAuth would bypass the portal's role check.
      await expect(card(page).getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
      await expect(card(page).getByRole('link', { name: 'Register now' })).toHaveCount(0);
    });
  }

  // Q1's landing page moved to the screening workspace when it was built from the "Q1 Flow"
  // designs. /recruitment/candidates still exists and still serves QC2, Q3 and Admin — it is
  // no longer where a QC1 starts their day.
  test('the QC1 door signs a QC1 in and lands them on the Q1 screening dashboard', async ({ page }) => {
    await mockLoginAs(page, 2);
    await page.goto('/login?as=qc1');
    await expect(card(page).getByRole('heading', { name: 'QC1 Login' })).toBeVisible({ timeout: 10_000 });

    await submit(page);

    await expect(page).toHaveURL(/\/q1\/dashboard$/, { timeout: 15_000 });
  });

  // The narrowing: QC staff no longer belong to the admin portal.
  test('the admin door turns a QC1 away instead of signing them in', async ({ page }) => {
    await mockLoginAs(page, 2);
    await page.goto('/login?as=admin');
    await expect(card(page).getByRole('heading', { name: 'Admin Login' })).toBeVisible({ timeout: 10_000 });

    await submit(page);

    await expect(page.getByText(/does not have admin access/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login\?as=admin$/);
  });

  test('the QC1 door turns an admin away too — each door means one role', async ({ page }) => {
    await mockLoginAs(page, 5);
    await page.goto('/login?as=qc1');
    await expect(card(page).getByRole('heading', { name: 'QC1 Login' })).toBeVisible({ timeout: 10_000 });

    await submit(page);

    await expect(page.getByText(/does not have QC1 access/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login\?as=qc1$/);
  });
});
