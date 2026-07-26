import { test, expect } from '@playwright/test';

/**
 * Command Palette — tests the Ctrl+K / Cmd+K command palette overlay.
 *
 * The palette is rendered globally via CommandPalette component and supports
 * keyboard navigation (arrow keys, Enter, Escape) and text filtering.
 */

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('opens with Ctrl+K and shows dialog', async ({ page }) => {
    await page.keyboard.press('Control+k');

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
  });

  test('shows search input focused when opened', async ({ page }) => {
    await page.keyboard.press('Control+k');

    const input = page.locator('[role="dialog"] input[type="text"]');
    await expect(input).toBeVisible({ timeout: 5_000 });
    await expect(input).toBeFocused();
  });

  test('closes with Escape key', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('closes when clicking backdrop', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Click the backdrop (the dark overlay behind the dialog)
    await page.locator('.bg-black\\/40').click({ force: true });
    await expect(dialog).not.toBeVisible();
  });

  test('toggles open/closed with repeated Ctrl+K', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    // Open
    await page.keyboard.press('Control+k');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Close
    await page.keyboard.press('Control+k');
    await expect(dialog).not.toBeVisible();
  });

  test('filters results when typing', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const input = dialog.locator('input[type="text"]');

    // Type a filter term — "jobs" should narrow results
    await input.fill('jobs');

    // Items matching "jobs" should remain visible
    const listbox = dialog.locator('[role="listbox"]');
    const options = listbox.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows no results message for non-matching query', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const input = dialog.locator('input[type="text"]');
    await input.fill('zzzzzznonexistent');

    // Should show a "no results" message
    const noResults = dialog.getByText(/no results/i);
    await expect(noResults).toBeVisible();
  });

  test('navigates with arrow keys and highlights active item', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // First item should be active by default
    const firstItem = dialog.locator('[data-active="true"]');
    await expect(firstItem).toBeVisible();

    // Press ArrowDown to move to next item
    await page.keyboard.press('ArrowDown');

    // The active item should have changed
    const activeItems = dialog.locator('[data-active="true"]');
    await expect(activeItems).toHaveCount(1);
  });

  test('selects item with Enter and navigates to target page', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Filter to "jobs" to narrow the list
    const input = dialog.locator('input[type="text"]');
    await input.fill('jobs');

    // Wait for filtered results
    const options = dialog.locator('[role="option"]');
    await expect(options.first()).toBeVisible({ timeout: 3_000 });

    // Press Enter to select the first matching result
    await page.keyboard.press('Enter');

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Should have navigated (URL should change)
    await expect(page).toHaveURL(/\/(jobs|candidate)/, { timeout: 5_000 });
  });

  test('displays section headers for pages and actions', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Section headers should be visible
    await expect(dialog.getByText(/pages/i)).toBeVisible();
    await expect(dialog.getByText(/actions/i)).toBeVisible();
  });
});
