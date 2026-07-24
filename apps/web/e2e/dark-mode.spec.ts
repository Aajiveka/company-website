import { test, expect } from '@playwright/test';

test.describe('Dark Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored theme preference so each test starts fresh.
    await page.addInitScript(() => localStorage.removeItem('theme'));
    await page.goto('/');
  });

  test('toggle adds "dark" class to <html> element', async ({ page }) => {
    const themeBtn = page.getByRole('button', { name: /switch to dark mode/i });
    await expect(themeBtn).toBeVisible();

    await themeBtn.click();

    const htmlEl = page.locator('html');
    await expect(htmlEl).toHaveClass(/dark/);
  });

  test('toggle back to light mode removes "dark" class', async ({ page }) => {
    const htmlEl = page.locator('html');

    // Switch to dark
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(htmlEl).toHaveClass(/dark/);

    // Switch back to light
    await page.getByRole('button', { name: /switch to light mode/i }).click();
    await expect(htmlEl).not.toHaveClass(/dark/);
  });

  test('background color changes in dark mode', async ({ page }) => {
    // Capture light-mode background color of the body.
    const lightBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    // Switch to dark mode.
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    // Background should differ from light mode.
    const darkBg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );

    expect(darkBg).not.toBe(lightBg);
  });

  test('theme preference persists after page reload', async ({ page }) => {
    // Activate dark mode.
    await page.getByRole('button', { name: /switch to dark mode/i }).click();

    // Verify localStorage was written.
    const stored = await page.evaluate(() => localStorage.getItem('theme'));
    expect(stored).toBe('dark');

    // Reload and assert the class is still applied.
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // The button should now offer to switch to light mode.
    await expect(
      page.getByRole('button', { name: /switch to light mode/i }),
    ).toBeVisible();
  });
});
