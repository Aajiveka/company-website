import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test('login page renders with form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/login to your account/i)).toBeVisible();
    await expect(page.getByLabel(/username or email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByText(/don't have an account/i)).toBeVisible();
    await expect(page.getByText(/forgot password/i)).toBeVisible();
  });

  test('login form shows validation on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /login/i }).click();
    // After clicking login with empty fields, form should not navigate away
    await expect(page).toHaveURL(/\/login/);
  });

  test('register page renders with form fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByText(/create your account/i)).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel(/mobile number/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible();
  });

  test('register form shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /register/i }).click();
    // Should stay on register page (validation prevents submit)
    await expect(page).toHaveURL(/\/register/);
  });

  test('register form validates email format', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('register form validates mobile number', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel(/mobile number/i).fill('123');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await expect(page.getByText(/10-digit/i)).toBeVisible();
  });

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByText(/forgot password/i).first()).toBeVisible();
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('login links to register and vice versa', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /register now/i }).click();
    await expect(page).toHaveURL(/\/register/);

    await page.getByRole('link', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
