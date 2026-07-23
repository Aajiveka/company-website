import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('pages have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
  });

  test('images have alt attributes', async ({ page }) => {
    await page.goto('/');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      const ariaHidden = await images.nth(i).getAttribute('aria-hidden');
      // Every image should have alt OR be aria-hidden
      expect(alt !== null || ariaHidden === 'true').toBeTruthy();
    }
  });

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/login');
    // All inputs should be associated with labels
    await expect(page.getByLabel(/username or email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('navbar links are accessible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /find jobs/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();
  });
});
