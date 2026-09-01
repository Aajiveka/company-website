import { test, expect } from '@playwright/test';
import { mockCandidateSession, mockJobsApi } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Subscription Gating — Gap 2.
 * Route: /jobs/:id/apply
 *
 * The apply page checks for HTTP 403 and redirects to /candidate/subscription.
 * A successful apply (201) shows the confirmation page.
 */

test.describe('Subscription Gating on Job Apply', () => {
  test('403 response redirects to subscription page', async ({ page }) => {
    await mockCandidateSession(page);
    await mockJobsApi(page, {
      applyStatus: 403,
      applyBody: { message: 'Active subscription required' },
    });

    // Mock the subscription page so it doesn't fail loading
    await page.route('**/api/payments/**', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ plans: [] }),
    }));

    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Review application' }).click();
    await page.getByRole('button', { name: 'Submit application' }).click();

    // Should navigate to subscription page with returnTo param
    await expect(page).toHaveURL(/\/candidate\/subscription/, { timeout: 10_000 });
  });

  test('active subscriber applies successfully (201)', async ({ page }) => {
    await mockCandidateSession(page);
    await mockJobsApi(page, { applyStatus: 201 });

    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Review application' }).click();
    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page.getByRole('heading', { name: 'Application submitted successfully' })).toBeVisible();
  });
});
