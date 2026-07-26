import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('button', { name: /submit/i }).click();
    // Should show validation errors
    await expect(page.getByText(/enter your name/i)).toBeVisible();
    await expect(page.getByText(/enter a subject/i)).toBeVisible();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('validates phone number format', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel(/contact number/i).fill('abc');
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByText(/10-digit/i)).toBeVisible();
  });

  test('successful submission shows success message', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/subject/i).fill('Test Subject');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/contact number/i).fill('9876543210');
    await page.getByLabel(/feedback/i).fill('This is a test message');
    await page.getByRole('button', { name: /submit/i }).click();
    // Should show success toast
    await expect(page.getByText(/thank you/i)).toBeVisible({ timeout: 5_000 });
  });
});
