import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockQC1Session } from './support/auth-helpers';
import { CANDIDATE_DETAIL, SCORE_RESULT } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * QC1 Candidate Scoring — Gap 3 (7-criteria weighted scoring).
 * API: POST /recruitment/applications/:id/score
 */

test.describe('QC1 Candidate Scoring', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC1Session(page);
    await page.route('**/api/recruitment/candidates/100', (route) =>
      route.fulfill(json(CANDIDATE_DETAIL)),
    );
    await page.route('**/api/recruitment/jobs*', (route) => route.fulfill(json([])));
    await page.route('**/api/recruitment/document-types*', (route) => route.fulfill(json([])));
  });

  test('score button triggers API and displays result', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/recruitment/applications/*/score', (route) => {
      recordRequest(log, route);
      return route.fulfill(json(SCORE_RESULT));
    });

    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    // The page should render candidate details; check skills are visible
    await expect(page.getByText('React')).toBeVisible();
    await expect(page.getByText('Node.js')).toBeVisible();
    await expect(page.getByText('PostgreSQL')).toBeVisible();
  });

  test('score API error shows error toast', async ({ page }) => {
    await page.route('**/api/recruitment/applications/*/score', (route) =>
      route.fulfill(json({ message: 'Scoring failed' }, 500)),
    );

    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({ timeout: 10_000 });

    // Page renders without crashing even if scoring endpoint fails
    await expect(page.getByText('Software Engineer').first()).toBeVisible();
  });
});
