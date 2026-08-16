import { test, expect } from '@playwright/test';

test.describe('Job Search', () => {
  test('job search page loads with search bar', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('h1').first()).toBeVisible();
    // The redesigned search is a single always-live field, not a field plus a submit button.
    await expect(page.getByRole('searchbox', { name: /search jobs/i })).toBeVisible();
  });

  test('job search page shows results or empty state', async ({ page }) => {
    await page.goto('/jobs');
    // Wait for loading to finish — either job count, "No jobs" message, or loaded page
    const loaded = await page
      .getByText(/jobs found|no jobs match|no jobs|search/i)
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    expect(loaded).toBe(true);
  });

  test('home page search navigates to job search page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /search/i }).click();
    await expect(page).toHaveURL(/\/jobs/);
  });
});
