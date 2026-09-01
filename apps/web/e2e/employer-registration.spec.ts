import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Employer Self-Registration — Gap 1 (public page, no auth).
 * Route: /register/employer
 * API: POST /auth/register-employer
 */

test.describe('Employer Registration', () => {
  test('renders the registration form with all fields', async ({ page }) => {
    await page.goto('/register/employer');

    await expect(page.getByLabel('Company Name *')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Company Email *')).toBeVisible();
    await expect(page.getByLabel('HR Email')).toBeVisible();
    await expect(page.getByLabel('Company Phone')).toBeVisible();
    await expect(page.getByLabel('HR Phone')).toBeVisible();
    await expect(page.getByLabel('Location')).toBeVisible();
    await expect(page.getByLabel('Industry Type')).toBeVisible();
    await expect(page.getByLabel('Website')).toBeVisible();
    await expect(page.getByText('About Company')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Registration' })).toBeVisible();
  });

  test('empty submit triggers validation — no API call', async ({ page }) => {
    let called = false;
    await page.route('**/api/auth/register-employer', (route) => {
      called = true;
      route.fulfill(json({ id: 1, status: 'Pending' }, 201));
    });

    await page.goto('/register/employer');
    await expect(page.getByLabel('Company Name *')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Submit Registration' }).click();

    // Required field errors should show
    await expect(page.getByText('Company name is required').first()).toBeVisible();
    await expect(page.getByText('Company email is required').first()).toBeVisible();
    expect(called).toBe(false);
  });

  test('invalid email is rejected', async ({ page }) => {
    await page.goto('/register/employer');
    await expect(page.getByLabel('Company Name *')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Company Name *').fill('Test Corp');
    await page.getByLabel('Company Email *').fill('bad@');
    await page.getByRole('button', { name: 'Submit Registration' }).click();

    await expect(page.getByText('Enter a valid email').first()).toBeVisible();
  });

  test('successful submission shows confirmation', async ({ page }) => {
    await page.route('**/api/auth/register-employer', (route) =>
      route.fulfill(json({ id: 1, status: 'Pending' }, 201)),
    );

    await page.goto('/register/employer');
    await expect(page.getByLabel('Company Name *')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Company Name *').fill('NewCorp');
    await page.getByLabel('Company Email *').fill('info@newcorp.com');
    await page.getByRole('button', { name: 'Submit Registration' }).click();

    await expect(page.getByText('Registration Submitted').first()).toBeVisible();
    await expect(page.getByText('under review')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to Login' })).toHaveAttribute('href', '/login');
  });

  test('API error surfaces message', async ({ page }) => {
    await page.route('**/api/auth/register-employer', (route) =>
      route.fulfill(json({ message: 'Company already registered' }, 400)),
    );

    await page.goto('/register/employer');
    await expect(page.getByLabel('Company Name *')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Company Name *').fill('Duplicate Corp');
    await page.getByLabel('Company Email *').fill('info@dup.com');
    await page.getByRole('button', { name: 'Submit Registration' }).click();

    await expect(page.getByText('Company already registered')).toBeVisible();
  });

  test('already-have-account link navigates to login', async ({ page }) => {
    await page.goto('/register/employer');
    await expect(page.getByLabel('Company Name *')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
