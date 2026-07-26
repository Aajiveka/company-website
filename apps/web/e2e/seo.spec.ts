import { test, expect } from '@playwright/test';

test.describe('SEO', () => {
  test('home page has meta description', async ({ page }) => {
    await page.goto('/');
    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveAttribute('content', /.+/);
  });

  test('home page has Open Graph tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', /.+/);
  });

  test('job search page has proper title', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page).toHaveTitle(/jobs|Aajiveka/i);
  });

  test('home page has JSON-LD structured data', async ({ page }) => {
    await page.goto('/');
    // Wait for React to fully render the home page (JSON-LD is inside a lazy component)
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached({ timeout: 5_000 });
  });

  test('public pages are indexable', async ({ page }) => {
    await page.goto('/');
    const robots = page.locator('meta[name="robots"]');
    const count = await robots.count();
    if (count > 0) {
      const content = await robots.getAttribute('content');
      expect(content).not.toContain('noindex');
    }
  });
});
