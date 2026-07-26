import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test('manifest link exists in HTML head', async ({ page }) => {
    await page.goto('/');
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', /.+/);
  });

  test('manifest has required fields', async ({ page }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const res = await page.goto(href!);
    expect(res?.ok()).toBe(true);
    const json = await res?.json();
    expect(json.name).toBeTruthy();
    expect(json.short_name).toBeTruthy();
    expect(json.start_url).toBeTruthy();
    expect(json.icons).toBeTruthy();
    expect(json.icons.length).toBeGreaterThan(0);
  });

  test('service worker registration API available', async ({ page }) => {
    await page.goto('/');
    const hasSwApi = await page.evaluate(() => 'serviceWorker' in navigator);
    expect(hasSwApi).toBe(true);
  });
});
