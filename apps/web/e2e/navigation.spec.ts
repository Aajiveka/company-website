import { test, expect } from '@playwright/test';

test.describe('Public Navigation', () => {
  test('loads home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Aajiveka/i);
  });

  test('navigates to jobs page', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1, h2')).toBeVisible();
  });

  test('navigates to about page', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveURL(/about/);
  });

  test('navigates to contact page', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveURL(/contact/);
  });

  test('navigates to pricing page', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveURL(/pricing/);
  });

  test('shows 404 for unknown route', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('text=404')).toBeVisible();
  });
});
