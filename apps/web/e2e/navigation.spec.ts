import { test, expect } from '@playwright/test';

test.describe('Public Navigation', () => {
  test('home page loads with hero and search bar', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Aajiveka/);
    await expect(page.locator('h1')).toContainText('Career Partner');
    await expect(page.getByRole('button', { name: /search/i })).toBeVisible();
  });

  test('navbar links navigate to correct pages', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /about/i }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator('h1')).toBeVisible();

    await page.getByRole('link', { name: /find jobs/i }).first().click();
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('footer links are visible', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByRole('link', { name: /about/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /contact/i })).toBeVisible();
    await expect(footer.getByRole('link', { name: /privacy/i })).toBeVisible();
  });

  test('404 page shown for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  });
});
