import { test, expect } from '@playwright/test';
import { jobDetail, mockCandidateSession, mockJobsApi, type RequestLog } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Job detail — Figma node 27:4404.
 *
 * The long-form columns are free text the employer typed, so the page decides per job whether
 * to draw the design's bulleted list or a paragraph. Both branches are covered here, because
 * the wrong one shows either a wall of text or a one-item bullet list.
 */

test.describe('Job detail — anonymous visitor', () => {
  test('renders the header, meta line and apply action', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1');

    await expect(page.getByRole('heading', { name: 'Senior React Developer', level: 1 })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('TechCorp').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apply Now' })).toHaveAttribute('href', '/jobs/1/apply');
    await expect(page.getByRole('link', { name: 'Back to jobs' })).toHaveAttribute('href', '/jobs');
  });

  test('fills the job overview rail from the row', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1');

    const overview = page.locator('aside').filter({ hasText: 'Job overview' });
    await expect(overview).toBeVisible({ timeout: 10_000 });
    await expect(overview.getByText('3–6 yrs')).toBeVisible();
    await expect(overview.getByText('Full-time')).toBeVisible();
    await expect(overview.getByText('Remote')).toBeVisible();
    await expect(overview.getByText('Pune')).toBeVisible();
    await expect(overview.getByText('₹18–28 LPA')).toBeVisible();
    await expect(overview.getByText('B.Tech in Computer Science')).toBeVisible();
    await expect(overview.getByText('Engineering', { exact: true })).toBeVisible();
    await expect(overview.getByText('Web Platform')).toBeVisible();
    await expect(overview.getByText('Engineering Manager')).toBeVisible();
    await expect(overview.getByText('8', { exact: true })).toBeVisible();
  });

  test('omits overview rows the employer left blank', async ({ page }) => {
    await mockJobsApi(page, {
      detail: jobDetail({ department: null, subDepartment: null, reportTo: null, teamSize: null }),
    });
    await page.goto('/jobs/1');

    const overview = page.locator('aside').filter({ hasText: 'Job overview' });
    await expect(overview).toBeVisible({ timeout: 10_000 });
    await expect(overview.getByText('Department', { exact: true })).toHaveCount(0);
    await expect(overview.getByText('Reports to')).toHaveCount(0);
    await expect(overview.getByText('Team size')).toHaveCount(0);
  });

  test('renders a multi-line description as the design bulleted list', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1');

    const about = page.locator('section').filter({ hasText: 'About the role' });
    await expect(about.getByRole('listitem')).toHaveCount(3, { timeout: 10_000 });
    await expect(about.getByText('Own the front end end to end.')).toBeVisible();
    await expect(about.getByText('Mentor two juniors.')).toBeVisible();
  });

  test('renders a single-paragraph description as prose, not a one-item list', async ({ page }) => {
    await mockJobsApi(page, { detail: jobDetail({ description: 'One paragraph, written as prose.' }) });
    await page.goto('/jobs/1');

    const about = page.locator('section').filter({ hasText: 'About the role' });
    await expect(about.getByText('One paragraph, written as prose.')).toBeVisible({ timeout: 10_000 });
    await expect(about.getByRole('listitem')).toHaveCount(0);
  });

  test('lists skills and the interview rounds in order', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1');

    const skills = page.locator('section').filter({ hasText: 'Skills' });
    await expect(skills.getByText('TypeScript')).toBeVisible({ timeout: 10_000 });

    const rounds = page.locator('section').filter({ hasText: 'Interview process' }).getByRole('listitem');
    await expect(rounds).toHaveCount(3);
    await expect(rounds.nth(0)).toContainText('Screening call');
    await expect(rounds.nth(2)).toContainText('Culture fit');
    await expect(page.getByText('3 interview rounds')).toBeVisible();
  });

  test('hides the sections a bare job posting has nothing for', async ({ page }) => {
    await mockJobsApi(page, {
      detail: jobDetail({ description: null, candidateProfile: null, skills: [], interviewRounds: [] }),
    });
    await page.goto('/jobs/1');

    await expect(page.getByRole('heading', { name: 'Senior React Developer', level: 1 })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('heading', { name: 'About the role' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Requirements' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Interview process' })).toHaveCount(0);
  });

  test('a job that fails to load offers a retry', async ({ page }) => {
    let fail = true;
    await page.route('**/api/jobs/**', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
        : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(jobDetail()) }),
    );

    await page.goto('/jobs/1');
    await expect(page.getByText('We could not load this job.')).toBeVisible({ timeout: 15_000 });

    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Senior React Developer', level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('an anonymous visitor gets no save button and no match badge', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1');

    await expect(page.getByRole('link', { name: 'Apply Now' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /^Save$/ })).toHaveCount(0);
    await expect(page.getByText(/% match/)).toHaveCount(0);
  });
});

test.describe('Job detail — signed-in candidate', () => {
  test('shows the match badge and a working save toggle', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { log });
    await mockJobsApi(page);
    await page.goto('/jobs/1');

    await expect(page.getByText('100% match')).toBeVisible({ timeout: 10_000 });

    const save = page.getByRole('button', { name: 'Save' });
    await expect(save).toHaveAttribute('aria-pressed', 'false');
    await save.click();

    await expect(page.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true');
    expect(log.some((r) => r.method === 'POST' && r.url.endsWith('/saved-jobs/1'))).toBe(true);
  });

  test('a job already bookmarked opens in the saved state', async ({ page }) => {
    await mockCandidateSession(page, { savedJobIds: [1] });
    await mockJobsApi(page);
    await page.goto('/jobs/1');

    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible({ timeout: 10_000 });
  });
});
