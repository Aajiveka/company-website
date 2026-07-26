import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-does-not-exist-at-all');
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  });

  test('404 page has back to home link', async ({ page }) => {
    await page.goto('/unknown-route-xyz');
    const homeLink = page.getByRole('link', { name: /back to home/i });
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await expect(page).toHaveURL('/');
  });

  test('404 page has browse jobs link', async ({ page }) => {
    await page.goto('/nonexistent-page');
    const jobsLink = page.getByRole('link', { name: /browse.*jobs/i });
    await expect(jobsLink).toBeVisible();
    await jobsLink.click();
    await expect(page).toHaveURL(/\/jobs/);
  });
});
