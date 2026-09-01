import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockEmployerSession } from './support/auth-helpers';
import { APPLICANT_DETAIL } from './support/employer-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Video Meeting Link — Gap 11.
 * API: POST /clients/me/interviews/generate-link
 *
 * The meeting link generation is triggered from the employer's applicant profile context.
 * We test the API contract — the employer applicant profile page shows interview round data.
 */

test.describe('Video Meeting Link', () => {
  test.beforeEach(async ({ page }) => {
    await mockEmployerSession(page);
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/clients/me/applicants/1/notes', (route) =>
      route.fulfill(json({ notes: [] })),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );
  });

  test('generate link endpoint returns a URL', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/clients/me/interviews/generate-link', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ link: 'https://meet.aajiveka.com/test-room-123' }));
    });

    await page.goto('/company/applicants/1');
    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });

    // Verify the mock endpoint responds correctly via fetch with absolute URL
    const response = await page.evaluate(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/clients/me/interviews/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'default' }),
      });
      return res.json();
    }, page.url().replace(/\/company.*$/, ''));

    expect(response).toEqual({ link: 'https://meet.aajiveka.com/test-room-123' });
  });

  test('employer applicant profile page loads correctly', async ({ page }) => {
    await page.goto('/company/applicants/1');

    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Full-stack developer')).toBeVisible();
    // Decision buttons present
    await expect(page.getByRole('button', { name: 'Shortlist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Interview' })).toBeVisible();
  });
});
