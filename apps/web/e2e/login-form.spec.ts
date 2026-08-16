import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

/**
 * Login — the redesigned auth shell (Figma node 54:3868).
 *
 * Two things here are new and easy to regress silently: the password field's reveal toggle,
 * and the social buttons, which render because the design shows them but must stay disabled
 * while the API has no /auth/google or /auth/linkedin route to send anyone to.
 *
 * Everything is scoped to the auth card. The public navbar carries its own "Login" dropdown
 * and a "Register Now" link, so an unscoped role query would happily drive the header
 * instead of the form.
 */

const card = (page: Page) => page.locator('#main-content');

test.describe('Login form', () => {
  test('the password field starts masked and reveals on demand', async ({ page }) => {
    await page.goto('/login');

    const password = card(page).getByLabel('Password', { exact: true });
    await expect(password).toBeVisible({ timeout: 10_000 });
    await expect(password).toHaveAttribute('type', 'password');

    await password.fill('hunter2');
    const reveal = card(page).getByRole('button', { name: 'Show password' });
    await expect(reveal).toHaveAttribute('aria-pressed', 'false');

    await reveal.click();

    await expect(password).toHaveAttribute('type', 'text');
    // The typed value survives the swap — the toggle changes the field, not its contents.
    await expect(password).toHaveValue('hunter2');
    const hide = card(page).getByRole('button', { name: 'Hide password' });
    await expect(hide).toHaveAttribute('aria-pressed', 'true');

    await hide.click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('the reveal toggle stays out of the tab order between field and submit', async ({ page }) => {
    await page.goto('/login');
    await expect(card(page).getByLabel('Password', { exact: true })).toBeVisible({ timeout: 10_000 });

    await expect(card(page).getByRole('button', { name: 'Show password' })).toHaveAttribute('tabindex', '-1');
  });

  test('social sign-in renders but is disabled, with the reason stated', async ({ page }) => {
    await page.goto('/login');

    const google = card(page).getByRole('button', { name: 'Continue with Google' });
    const linkedin = card(page).getByRole('button', { name: 'Continue with LinkedIn' });
    await expect(google).toBeVisible({ timeout: 10_000 });
    await expect(google).toBeDisabled();
    await expect(linkedin).toBeDisabled();
    await expect(card(page).getByText(/social sign-in is not enabled yet/i)).toBeVisible();
  });

  test('clicking a disabled social button does not navigate away', async ({ page }) => {
    await page.goto('/login');
    await expect(card(page).getByRole('button', { name: 'Continue with Google' })).toBeVisible({ timeout: 10_000 });

    await card(page).getByRole('button', { name: 'Continue with Google' }).click({ force: true });

    await expect(page).toHaveURL(/\/login$/);
  });

  test('an empty submit is rejected client-side without calling the API', async ({ page }) => {
    let called = false;
    await page.route('**/api/auth/login', (route) => {
      called = true;
      return route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"nope"}' });
    });

    await page.goto('/login');
    const submit = card(page).getByRole('button', { name: 'Login', exact: true });
    await expect(submit).toBeVisible({ timeout: 10_000 });

    await submit.click();

    await expect(card(page).getByLabel('Username or Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(card(page).getByLabel('Password', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    expect(called).toBe(false);
  });

  test('bad credentials surface the API message rather than a blank screen', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Invalid username or password"}' }),
    );

    await page.goto('/login');
    await card(page).getByLabel('Username or Email').fill('priya@example.com');
    await card(page).getByLabel('Password', { exact: true }).fill('wrong-password');
    await card(page).getByRole('button', { name: 'Login', exact: true }).click();

    await expect(page.getByText('Invalid username or password')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('a candidate signing in lands on the candidate portal', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'fake-access',
          refreshToken: 'fake-refresh',
          user: { userId: 10, fullName: 'Priya Patel', roleId: 1, isOnboarded: true },
        }),
      }),
    );
    await page.route('**/api/candidates/me**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }),
    );

    await page.goto('/login');
    await card(page).getByLabel('Username or Email').fill('priya@example.com');
    await card(page).getByLabel('Password', { exact: true }).fill('correct-password');
    await card(page).getByRole('button', { name: 'Login', exact: true }).click();

    await expect(page).toHaveURL(/\/candidate\/profile$/, { timeout: 15_000 });
  });

  test('the employer door refuses a candidate account', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'fake-access',
          refreshToken: 'fake-refresh',
          user: { userId: 10, fullName: 'Priya Patel', roleId: 1, isOnboarded: true },
        }),
      }),
    );
    await page.route('**/api/auth/logout', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/login?as=employer');
    await expect(card(page).getByRole('heading', { name: 'Employer Login' })).toBeVisible({ timeout: 10_000 });

    await card(page).getByLabel('Username or Email').fill('priya@example.com');
    await card(page).getByLabel('Password', { exact: true }).fill('correct-password');
    await card(page).getByRole('button', { name: 'Login', exact: true }).click();

    await expect(page.getByText(/not a candidate account|not an employer account/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login\?as=employer$/);
  });

  test('the admin door hides both social sign-in and the register link', async ({ page }) => {
    await page.goto('/login?as=admin');

    await expect(card(page).getByRole('heading', { name: 'Admin Login' })).toBeVisible({ timeout: 10_000 });
    await expect(card(page).getByRole('button', { name: 'Continue with Google' })).toHaveCount(0);
    await expect(card(page).getByRole('link', { name: 'Register now' })).toHaveCount(0);
  });
});
