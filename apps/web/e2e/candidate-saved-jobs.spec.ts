import { test, expect } from '@playwright/test';
import { mockCandidateSession, savedJob, type RequestLog } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Saved Jobs — the destination behind the header's bookmark item.
 *
 * It reuses the search result card, so the specs check that the card's full affordances
 * survive the reuse (apply link, details link) and that the bookmark here *removes* rather
 * than adds.
 */

const SAVED = [
  savedJob({ jobId: 1, designation: 'Senior React Developer', company: 'TechCorp' }),
  savedJob({ jobId: 2, designation: 'Data Engineer', company: 'DataWorks', city: 'Bengaluru', workMode: 'Hybrid' }),
];

test.describe('Saved jobs page', () => {
  test('lists saved roles with a count and the card actions', async ({ page }) => {
    await mockCandidateSession(page, { savedJobIds: [1, 2], savedJobs: SAVED });
    await page.goto('/candidate/saved-jobs');

    await expect(page.getByRole('heading', { name: 'Saved Jobs' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('2 jobs saved')).toBeVisible();

    const card = page.locator('article').filter({ hasText: 'Senior React Developer' });
    await expect(card.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/jobs/1');
    await expect(card.getByRole('link', { name: 'Apply now' })).toHaveAttribute('href', '/jobs/1/apply');
  });

  test('every row is already in the saved state', async ({ page }) => {
    await mockCandidateSession(page, { savedJobIds: [1, 2], savedJobs: SAVED });
    await page.goto('/candidate/saved-jobs');

    const bookmark = page.getByRole('button', { name: 'Remove Senior React Developer from saved jobs' });
    await expect(bookmark).toBeVisible({ timeout: 10_000 });
    await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  });

  test('unsaving deletes the bookmark and drops the row', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { savedJobIds: [1, 2], savedJobs: SAVED, log });
    await page.goto('/candidate/saved-jobs');
    await expect(page.getByText('2 jobs saved')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Remove Data Engineer from saved jobs' }).click();

    await expect(page.getByText('1 job saved')).toBeVisible();
    await expect(page.getByText('Data Engineer')).toHaveCount(0);
    await expect(page.getByText('Senior React Developer')).toBeVisible();
    expect(log.some((r) => r.method === 'DELETE' && r.url.endsWith('/saved-jobs/2'))).toBe(true);
  });

  test('the count follows the search box, not the saved total', async ({ page }) => {
    await mockCandidateSession(page, { savedJobIds: [1, 2], savedJobs: SAVED });
    await page.goto('/candidate/saved-jobs');
    await expect(page.getByText('2 jobs saved')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Search saved jobs').fill('TechCorp');

    await expect(page.getByText('1 job saved')).toBeVisible();
    await expect(page.getByText('Data Engineer')).toHaveCount(0);
  });

  test('removing the last bookmark falls back to the empty state', async ({ page }) => {
    await mockCandidateSession(page, {
      savedJobIds: [1],
      savedJobs: [savedJob({ jobId: 1, designation: 'Senior React Developer', company: 'TechCorp' })],
    });
    await page.goto('/candidate/saved-jobs');
    await expect(page.getByText('1 job saved')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Remove Senior React Developer from saved jobs' }).click();

    await expect(page.getByText('No saved jobs yet')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse jobs' })).toHaveAttribute('href', '/jobs');
  });

  test('a candidate with no bookmarks is pointed at the job list', async ({ page }) => {
    await mockCandidateSession(page, { savedJobs: [] });
    await page.goto('/candidate/saved-jobs');

    await expect(page.getByText('No saved jobs yet')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel('Search saved jobs')).toHaveCount(0);
  });

  test('a failed load offers a retry that recovers', async ({ page }) => {
    await mockCandidateSession(page, { savedJobIds: [1, 2], savedJobs: SAVED });
    let fail = true;
    await page.route('**/api/candidates/me/saved-jobs', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
        : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAVED) }),
    );

    await page.goto('/candidate/saved-jobs');
    await expect(page.getByText('We could not load your saved jobs.')).toBeVisible({ timeout: 15_000 });

    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('2 jobs saved')).toBeVisible({ timeout: 10_000 });
  });

  test('the header bookmark item reaches this page', async ({ page }) => {
    await mockCandidateSession(page, { savedJobIds: [1], savedJobs: [savedJob()] });
    await page.goto('/jobs');

    await page.getByRole('navigation', { name: 'Portal' }).getByRole('link', { name: 'Saved Jobs' }).click();

    await expect(page).toHaveURL(/\/candidate\/saved-jobs$/);
    await expect(page.getByRole('heading', { name: 'Saved Jobs' })).toBeVisible({ timeout: 10_000 });
  });
});
