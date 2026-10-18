import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockEmployerSession } from './support/auth-helpers';
import { APPLICANT_DETAIL } from './support/employer-fixtures';
import { INTERVIEW_ROUND } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Employer Applicant Profile — interview process view.
 * Route: /company/applicants/:id
 * APIs: GET /clients/me/applicants/:id, GET /clients/me/applicants/:id/interview-rounds
 */

test.describe('Employer Applicant Profile', () => {
  test.beforeEach(async ({ page }) => {
    await mockEmployerSession(page);
    await page.route('**/api/clients/me/applicants/1/notes', (route) =>
      route.fulfill(json({ notes: [] })),
    );
    await page.route('**/api/clients/me/applicants/1/interview-rounds', (route) =>
      route.fulfill(json([])),
    );
  });

  test('renders applicant profile with candidate info', async ({ page }) => {
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );

    await page.goto('/company/applicants/1');

    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Full-stack developer')).toBeVisible();
    await expect(page.getByText('ravi@example.com')).toBeVisible();
    await expect(page.getByText('9876543210')).toBeVisible();
  });

  test('shows interview rounds with results and feedback', async ({ page }) => {
    const contacts = {
      hrName: 'Priya HR',
      hrEmail: 'hr@example.com',
      interviewerEmail: 'sharma@example.com',
      guestName: null,
      guestEmail: null,
      interviewMode: 'Video',
      location: null,
      createdAt: '2026-08-25T10:00:00.000Z',
      updatedAt: null,
    };
    const rounds = [
      { ...INTERVIEW_ROUND, ...contacts, roundId: 1, roundNumber: 1, roundName: 'Round 1', status: 'Completed', result: 'Passed', companyFeedback: 'Strong communication skills' },
      { ...INTERVIEW_ROUND, ...contacts, roundId: 2, roundNumber: 2, roundName: 'Round 2', status: 'Pending', result: 'Pending', scheduledAt: null, companyFeedback: null },
    ];

    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/clients/me/applicants/1/interview-rounds', (route) =>
      route.fulfill(json(rounds)),
    );

    await page.goto('/company/applicants/1');

    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Interview process')).toBeVisible();
    await expect(page.getByText('Round 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Round 2', { exact: true })).toBeVisible();
    await expect(page.getByText('Selected', { exact: true })).toBeVisible();
    await expect(page.getByText('Awaiting Q3 scheduling', { exact: true })).toBeVisible();
    await expect(page.getByText('Feedback: Strong communication skills')).toBeVisible();
  });

  test('no interview rounds section when empty', async ({ page }) => {
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );

    await page.goto('/company/applicants/1');

    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });
    // The interview process section only appears once a round exists
    await expect(page.getByText('Interview process')).toHaveCount(0);
  });

  test('decision buttons are present', async ({ page }) => {
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );

    await page.goto('/company/applicants/1');
    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('button', { name: 'Shortlist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Interview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hire' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeVisible();
  });

  test('shortlist decision triggers API call', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );
    await page.route('**/api/clients/me/applicants/*/decision', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ success: true }));
    });

    await page.goto('/company/applicants/1');
    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Shortlist' }).click();

    // Confirm dialog should appear with "Shortlist" as the confirm label
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Shortlist candidate?' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Shortlist' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ decision: 'Shortlisted' });
  });

  test('resume download button present when resume exists', async ({ page }) => {
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );

    await page.goto('/company/applicants/1');
    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole('button', { name: /Download CV/i })).toBeVisible();
  });

  test('notes section allows adding a note', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );
    await page.route('**/api/clients/me/applicants/1/notes', (route) => {
      if (route.request().method() === 'PUT') {
        recordRequest(log, route);
        return route.fulfill(json({ notes: [{ noteId: 1, note: 'Good candidate', createdAt: new Date().toISOString() }] }));
      }
      return route.fulfill(json({ notes: [] }));
    });

    await page.goto('/company/applicants/1');
    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder('Add an internal note').fill('Good candidate');
    await page.getByRole('button', { name: 'Save note' }).click();

    const posted = log.find((r) => r.method === 'PUT');
    expect(posted).toBeTruthy();
  });
});
