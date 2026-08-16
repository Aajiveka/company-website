import { test, expect } from '@playwright/test';
import { mockCandidateSession, mockJobsApi, publicJob, searchQueries, type RequestLog } from './support/mocks';

// page.route() fixtures only apply when MSW's worker is not installed.
test.use({ serviceWorkers: 'block' });

/**
 * Job search — the redesigned results screen (Figma 25:3635 / 25:4143).
 *
 * Every filter lives in the query string, so these specs assert on three surfaces at once:
 * what the URL says, what the API was asked for, and what the list renders. A filter that
 * updates the chips but never reaches the request would pass a render-only test.
 */

const REACT_JOB = publicJob();
const DATA_JOB = publicJob({
  jobId: 2,
  designation: 'Data Engineer',
  company: 'DataWorks',
  city: 'Bengaluru',
  workMode: 'Hybrid',
  employmentType: 'Contract',
  minExp: 1,
  maxExp: 3,
  minCtc: 900000,
  maxCtc: 1400000,
  skills: ['Python', 'Airflow'],
});

test.describe('Job search — anonymous visitor', () => {
  test('renders a result card with salary, experience, type and skills', async ({ page }) => {
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs');

    const card = page.locator('article').filter({ hasText: 'Senior React Developer' });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('1 job found')).toBeVisible();
    // 1800000 / 100000 = 18, 2800000 / 100000 = 28.
    await expect(card.getByText('18–28 LPA')).toBeVisible();
    await expect(card.getByText('3–6 yrs')).toBeVisible();
    await expect(card.getByText('Full-time')).toBeVisible();
    await expect(card.getByText('React', { exact: true })).toBeVisible();
    await expect(card.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/jobs/1');
    await expect(card.getByRole('link', { name: 'Apply now' })).toHaveAttribute('href', '/jobs/1/apply');
  });

  test('an anonymous visitor gets no match badge and no bookmark control', async ({ page }) => {
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs');

    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/% match/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /save senior react developer/i })).toHaveCount(0);
  });

  test('typing a term writes q to the URL and searches on it', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1, log });
    await page.goto('/jobs');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('searchbox', { name: /search jobs/i }).fill('react');

    await expect(page).toHaveURL(/[?&]q=react/);
    // The field is debounced by 350ms, so the request trails the URL.
    await expect
      .poll(() => searchQueries(log).some((q) => q.includes('designation=react')), { timeout: 5_000 })
      .toBe(true);
  });

  test('an experience band adds a chip, a URL param and min/max to the request', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1, log });
    await page.goto('/jobs');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    // click() rather than check(): the boxes are driven by the query string, so the router
    // navigation lands a frame after the click and check()'s immediate re-read of `checked`
    // races it. toBeChecked() retries, so it asserts the same thing without the flake.
    await page.getByRole('checkbox', { name: '2–5 yrs' }).click();
    await expect(page.getByRole('checkbox', { name: '2–5 yrs' })).toBeChecked();

    await expect(page).toHaveURL(/[?&]exp=2-5/);
    await expect(page.getByRole('button', { name: 'Remove 2–5 yrs filter' })).toBeVisible();
    await expect
      .poll(() => searchQueries(log).some((q) => q.includes('minExp=2') && q.includes('maxExp=5')), { timeout: 5_000 })
      .toBe(true);
  });

  test('several bands collapse to their outer edges, because the API takes one pair', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1, log });
    await page.goto('/jobs');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('checkbox', { name: '2–5 yrs' }).click();
    await expect(page.getByRole('checkbox', { name: '2–5 yrs' })).toBeChecked();
    await page.getByRole('checkbox', { name: '5–8 yrs' }).click();
    await expect(page.getByRole('checkbox', { name: '5–8 yrs' })).toBeChecked();

    await expect
      .poll(() => searchQueries(log).some((q) => q.includes('minExp=2') && q.includes('maxExp=8')), { timeout: 5_000 })
      .toBe(true);
  });

  test('job type and work mode reach the request as arrays', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1, log });
    await page.goto('/jobs');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('checkbox', { name: 'Contract' }).click();
    await expect(page.getByRole('checkbox', { name: 'Contract' })).toBeChecked();
    await page.getByRole('checkbox', { name: 'Remote' }).click();
    await expect(page.getByRole('checkbox', { name: 'Remote' })).toBeChecked();

    await expect(page).toHaveURL(/type=Contract/);
    await expect(page).toHaveURL(/mode=Remote/);
    await expect
      .poll(() => searchQueries(log).some((q) => q.includes('employmentTypes') && q.includes('Contract')), {
        timeout: 5_000,
      })
      .toBe(true);
    await expect
      .poll(() => searchQueries(log).some((q) => q.includes('workModes') && q.includes('Remote')), { timeout: 5_000 })
      .toBe(true);
  });

  test('a location filter is sent as a single-entry locations list', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1, log });
    await page.goto('/jobs');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Location').fill('Pune');

    await expect(page).toHaveURL(/location=Pune/);
    await expect
      .poll(() => searchQueries(log).some((q) => q.includes('locations') && q.includes('Pune')), { timeout: 5_000 })
      .toBe(true);
  });

  test('removing a chip clears just that filter', async ({ page }) => {
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs?exp=2-5&type=Contract');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Remove Contract filter' }).click();

    await expect(page).not.toHaveURL(/type=Contract/);
    await expect(page).toHaveURL(/exp=2-5/);
    await expect(page.getByRole('button', { name: 'Remove 2–5 yrs filter' })).toBeVisible();
  });

  test('"Clear all" drops every filter and unchecks the boxes', async ({ page }) => {
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs?exp=2-5&type=Contract&mode=Remote&location=Pune');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Remove /})).toHaveCount(4);

    await page.getByRole('button', { name: 'Clear all' }).first().click();

    await expect(page.getByRole('button', { name: /^Remove /})).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: '2–5 yrs' })).not.toBeChecked();
    await expect(page.getByLabel('Location')).toHaveValue('');
  });

  test('filters survive a reload, because they live in the query string', async ({ page }) => {
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs?exp=5-8&mode=Remote');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.reload();

    await expect(page.getByRole('checkbox', { name: '5–8 yrs' })).toBeChecked({ timeout: 10_000 });
    await expect(page.getByRole('checkbox', { name: 'Remote' })).toBeChecked();
  });

  test('sorting writes sort to the URL and sortBy to the request', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockJobsApi(page, { rows: [REACT_JOB, DATA_JOB], total: 2, log });
    await page.goto('/jobs');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Sort').selectOption('newest');

    await expect(page).toHaveURL(/sort=newest/);
    await expect
      .poll(() => searchQueries(log).some((q) => q.includes('sortBy=newest')), { timeout: 5_000 })
      .toBe(true);
  });

  test('an empty result set offers to clear the filters that caused it', async ({ page }) => {
    await mockJobsApi(page, { rows: [], total: 0 });
    await page.goto('/jobs?exp=8plus');

    await expect(page.getByText('No jobs match those filters')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('0 jobs found')).toBeVisible();

    await page.getByRole('button', { name: 'Clear all filters' }).click();
    await expect(page).not.toHaveURL(/exp=/);
  });

  test('"Load more jobs" appends the next page and then disappears', async ({ page }) => {
    const firstPage = Array.from({ length: 10 }, (_, i) =>
      publicJob({ jobId: i + 1, designation: `Engineer ${i + 1}` }),
    );
    await mockJobsApi(page, {
      rows: (url) => (url.searchParams.get('page') === '2' ? [publicJob({ jobId: 11, designation: 'Engineer 11' })] : firstPage),
      total: 11,
    });
    await page.goto('/jobs');

    await expect(page.getByText('Engineer 1', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Engineer 11')).toHaveCount(0);

    await page.getByRole('button', { name: 'Load more jobs' }).click();

    await expect(page.getByText('Engineer 11')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load more jobs' })).toHaveCount(0);
  });

  test('a failing search offers a retry that re-requests', async ({ page }) => {
    let fail = true;
    await page.route('**/api/jobs**', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
        : route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ rows: [REACT_JOB], total: 1 }),
          }),
    );

    await page.goto('/jobs');
    await expect(page.getByText('We could not load jobs right now.')).toBeVisible({ timeout: 15_000 });

    fail = false;
    await page.getByRole('button', { name: /try again|retry/i }).click();
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Job search — signed-in candidate', () => {
  test('shows a match badge computed from the candidate CV', async ({ page }) => {
    await mockCandidateSession(page);
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs');

    // Every listed skill is on the CV, 5 yrs sits inside the 3–6 band, the city and the
    // preferred work mode both match — so nothing is deducted.
    await expect(page.getByText('100% match')).toBeVisible({ timeout: 10_000 });
  });

  test('scores a poorly matched job lower than a well matched one', async ({ page }) => {
    await mockCandidateSession(page);
    await mockJobsApi(page, { rows: [REACT_JOB, DATA_JOB], total: 2 });
    await page.goto('/jobs');

    const weak = page.locator('article').filter({ hasText: 'Data Engineer' });
    await expect(weak.getByText(/% match/)).toBeVisible({ timeout: 10_000 });
    const percent = Number((await weak.getByText(/% match/).innerText()).replace(/\D/g, ''));
    expect(percent).toBeLessThan(100);
  });

  test('bookmarking a job posts it and flips the control to saved', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { log });
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs');

    const save = page.getByRole('button', { name: 'Save Senior React Developer' });
    await expect(save).toBeVisible({ timeout: 10_000 });
    await expect(save).toHaveAttribute('aria-pressed', 'false');

    await save.click();

    const remove = page.getByRole('button', { name: 'Remove Senior React Developer from saved jobs' });
    await expect(remove).toBeVisible();
    await expect(remove).toHaveAttribute('aria-pressed', 'true');
    expect(log.some((r) => r.method === 'POST' && r.url.endsWith('/saved-jobs/1'))).toBe(true);
  });

  test('un-bookmarking an already saved job deletes it', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { savedJobIds: [1], log });
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs');

    const remove = page.getByRole('button', { name: 'Remove Senior React Developer from saved jobs' });
    await expect(remove).toBeVisible({ timeout: 10_000 });

    await remove.click();

    await expect(page.getByRole('button', { name: 'Save Senior React Developer' })).toBeVisible();
    expect(log.some((r) => r.method === 'DELETE' && r.url.endsWith('/saved-jobs/1'))).toBe(true);
  });

  test('the candidate header replaces the marketing chrome on the jobs page', async ({ page }) => {
    await mockCandidateSession(page);
    await mockJobsApi(page, { rows: [REACT_JOB], total: 1 });
    await page.goto('/jobs');

    const nav = page.getByRole('navigation', { name: 'Portal' });
    await expect(nav.getByRole('link', { name: 'Applications' })).toBeVisible({ timeout: 10_000 });
    await expect(nav.getByRole('link', { name: 'Saved Jobs' })).toBeVisible();
  });
});
