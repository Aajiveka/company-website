import { test, expect } from '@playwright/test';
import { json, mockCandidateSession, mockJobsApi } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Candidate Slot Selection — Gap 4, part 3 (candidate picks time slot).
 * Route: /candidate/interviews
 *
 * The candidate interviews page shows upcoming/past interviews derived from applied jobs.
 * When a recruiter schedules an interview, it shows in the candidate's applied job data
 * with interview details (mode, scheduledOn, location).
 */

test.describe('Candidate Interviews', () => {
  test('shows upcoming interview from applied jobs', async ({ page }) => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await mockCandidateSession(page, {
      appliedJobs: [
        {
          jobId: 1,
          designation: 'Senior React Developer',
          company: 'TechCorp',
          industry: 'IT Services',
          city: 'Pune',
          workMode: 'Remote',
          employmentType: 'Full-time',
          minExp: 3,
          minCtc: 1800000,
          maxCtc: 2800000,
          appliedOn: '2026-08-01T09:00:00.000Z',
          status: 'Interview',
          statusHistory: [
            { status: 'Application Received', timestamp: '2026-08-01T09:00:00.000Z', comments: null },
            { status: 'Interview', timestamp: '2026-08-20T09:00:00.000Z', comments: null },
          ],
          interview: {
            scheduledOn: futureDate,
            mode: 'Video',
            location: null,
          },
        },
      ],
    });

    await page.goto('/candidate/interviews');

    await expect(page.getByText('Interviews')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Senior React Developer')).toBeVisible();
    await expect(page.getByText('TechCorp')).toBeVisible();
    await expect(page.getByText('Video')).toBeVisible();
  });

  test('shows empty state when no interviews', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: [] });

    await page.goto('/candidate/interviews');

    await expect(page.getByText('Interviews')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('No interviews scheduled')).toBeVisible();
  });

  test('past interviews appear in past tab', async ({ page }) => {
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await mockCandidateSession(page, {
      appliedJobs: [
        {
          jobId: 1,
          designation: 'Senior React Developer',
          company: 'TechCorp',
          industry: 'IT Services',
          city: 'Pune',
          workMode: 'Remote',
          employmentType: 'Full-time',
          minExp: 3,
          minCtc: 1800000,
          maxCtc: 2800000,
          appliedOn: '2026-07-01T09:00:00.000Z',
          status: 'Interview',
          statusHistory: [],
          interview: {
            scheduledOn: pastDate,
            mode: 'Telephonic',
            location: 'Mumbai Office',
          },
        },
      ],
    });

    await page.goto('/candidate/interviews?tab=past');

    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('TechCorp')).toBeVisible();
  });

  test('calendar tab renders without errors', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: [] });

    await page.goto('/candidate/interviews?tab=calendar');

    await expect(page.getByText('Interviews')).toBeVisible({ timeout: 10_000 });
    // Calendar should render day names
    await expect(page.getByText('Sun')).toBeVisible();
    await expect(page.getByText('Mon')).toBeVisible();
  });
});
