import { test, expect } from '@playwright/test';

test.describe('Public Pages', () => {
  test('about page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /our mission/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /our vision/i })).toBeVisible();
  });

  test('contact page loads with form', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByText(/get in touch/i)).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
  });

  test('pricing page loads with plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText(/pricing/i).first()).toBeVisible();
  });

  test('blogs page loads', async ({ page }) => {
    await page.goto('/blogs');
    await expect(page.getByText(/blog/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('career page loads', async ({ page }) => {
    await page.goto('/career');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByText(/privacy/i).first()).toBeVisible();
  });

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByText(/terms/i).first()).toBeVisible();
  });
});
