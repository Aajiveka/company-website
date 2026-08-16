import { test, expect } from '@playwright/test';
import { appliedJob, mockCandidateSession } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Applications — Figma node 28:5178.
 *
 * Statuses are free text from a master table, so the page buckets them by substring. These
 * specs use the wordings the reference data actually contains, since that mapping is the part
 * most likely to drift.
 */

const APPLICATIONS = [
  appliedJob({ jobId: 1, designation: 'Senior React Developer', company: 'TechCorp', status: 'Application Received' }),
  appliedJob({
    jobId: 2,
    designation: 'Data Engineer',
    company: 'DataWorks',
    city: 'Bengaluru',
    status: 'Interview Scheduled',
    statusHistory: [{ status: 'Interview Scheduled', timestamp: '2026-08-09T09:00:00.000Z', comments: null }],
  }),
  appliedJob({
    jobId: 3,
    designation: 'Platform Engineer',
    company: 'CloudNine',
    status: 'Offer Released',
    statusHistory: [{ status: 'Offer Released', timestamp: '2026-08-10T09:00:00.000Z', comments: null }],
  }),
  appliedJob({
    jobId: 4,
    designation: 'QA Lead',
    company: 'Testify',
    status: 'Rejected',
    statusHistory: [{ status: 'Rejected', timestamp: '2026-08-05T09:00:00.000Z', comments: null }],
  }),
  appliedJob({
    jobId: 5,
    designation: 'Backend Developer',
    company: 'ServerWorks',
    status: 'Documents Pending',
    statusHistory: [{ status: 'Documents Pending', timestamp: '2026-08-11T09:00:00.000Z', comments: null }],
  }),
];

test.describe('Applications page', () => {
  test('counts active, interviewing and offered applications in the tiles', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    await page.goto('/candidate/applications');

    await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible({ timeout: 10_000 });
    // Active = everything not closed, so the rejected one is excluded.
    await expect(page.locator('div').filter({ hasText: /^4Active$/ }).first()).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^1Interviewing$/ }).first()).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^1Offers$/ }).first()).toBeVisible();
  });

  test('labels each row with the status bucket its wording maps to', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    await page.goto('/candidate/applications');

    await expect(page.getByRole('link').filter({ hasText: 'Senior React Developer' })).toContainText('In progress', {
      timeout: 10_000,
    });
    await expect(page.getByRole('link').filter({ hasText: 'Platform Engineer' })).toContainText('Offer');
    await expect(page.getByRole('link').filter({ hasText: 'QA Lead' })).toContainText('Not selected');
    await expect(page.getByRole('link').filter({ hasText: 'Backend Developer' })).toContainText('Needs action');
  });

  test('each row links through to the job it belongs to', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    await page.goto('/candidate/applications');

    await expect(page.getByRole('link').filter({ hasText: 'Data Engineer' })).toHaveAttribute('href', '/jobs/2', {
      timeout: 10_000,
    });
  });

  test('the Offers filter narrows the list to offers only', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    await page.goto('/candidate/applications');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Offers' }).click();

    await expect(page.getByRole('button', { name: 'Offers' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Platform Engineer')).toBeVisible();
    await expect(page.getByText('Senior React Developer')).toHaveCount(0);
    await expect(page.getByText('QA Lead')).toHaveCount(0);
  });

  test('the Needs action filter picks up the document-pending application', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    await page.goto('/candidate/applications');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Needs action' }).click();

    await expect(page.getByText('Backend Developer')).toBeVisible();
    await expect(page.getByText('Platform Engineer')).toHaveCount(0);
  });

  test('searching matches on both the role and the company', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    await page.goto('/candidate/applications');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    const search = page.getByLabel('Search applications');
    await search.fill('DataWorks');
    await expect(page.getByText('Data Engineer')).toBeVisible();
    await expect(page.getByText('Senior React Developer')).toHaveCount(0);

    await search.fill('QA');
    await expect(page.getByText('QA Lead')).toBeVisible();
    await expect(page.getByText('Data Engineer')).toHaveCount(0);
  });

  test('a filter that matches nothing says so without offering "browse jobs"', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    await page.goto('/candidate/applications');
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Search applications').fill('nothing matches this');

    await expect(page.getByText('Nothing matches those filters')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse jobs' })).toHaveCount(0);
  });

  test('a candidate who has applied to nothing is pointed at the job list', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: [] });
    await page.goto('/candidate/applications');

    await expect(page.getByText('No applications yet')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Browse jobs' })).toHaveAttribute('href', '/jobs');
  });

  test('a failed load offers a retry that recovers', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: APPLICATIONS });
    // Registered after the session handler, so this one wins for applied-jobs only.
    let fail = true;
    await page.route('**/api/candidates/me/applied-jobs**', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
        : route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(APPLICATIONS) }),
    );

    await page.goto('/candidate/applications');
    await expect(page.getByText('We could not load your applications.')).toBeVisible({ timeout: 15_000 });

    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
  });
});
