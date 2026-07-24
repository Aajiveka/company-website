import { test, expect } from '@playwright/test';

test.describe('Language Switching (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    // Reset language to English before every test.
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await page.goto('/');
  });

  test('default language is English', async ({ page }) => {
    // The navbar should show "Find Jobs" (English).
    await expect(page.getByRole('link', { name: /find jobs/i })).toBeVisible();

    // The HTML lang attribute should be "en".
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('switching to Hindi updates page content', async ({ page }) => {
    // The language switcher button shows the *next* language label.
    const switchBtn = page.getByRole('button', { name: /switch language/i });
    await expect(switchBtn).toBeVisible();

    await switchBtn.click();

    // Wait for Hindi content to appear in the navbar.
    await expect(
      page.getByRole('link', { name: /नौकरी खोजें/i }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('HTML lang attribute changes on language switch', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByRole('button', { name: /switch language/i }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  });

  test('switching back to English restores content', async ({ page }) => {
    // Switch to Hindi first.
    await page.getByRole('button', { name: /switch language/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');

    // Switch back to English.
    await page.getByRole('button', { name: /switch language/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await expect(page.getByRole('link', { name: /find jobs/i })).toBeVisible();
  });

  test('language preference persists after reload', async ({ page }) => {
    // Switch to Hindi.
    await page.getByRole('button', { name: /switch language/i }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');

    // Verify localStorage.
    const stored = await page.evaluate(() => localStorage.getItem('i18nextLng'));
    expect(stored).toBe('hi');

    // Reload and confirm Hindi is still active.
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(
      page.getByRole('link', { name: /नौकरी खोजें/i }),
    ).toBeVisible({ timeout: 5_000 });
  });
});
