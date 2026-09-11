import { test, expect, type Page } from '@playwright/test';
import { json, recordRequest, type RequestLog } from './support/mocks';
import { mockQ3Session } from './support/auth-helpers';
import { INTERVIEW_ROUND, INTERVIEW_MODE, referralRow } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Multi-round interviews — Gap 4, part 2, the half that had no UI.
 * Route: /recruitment/q3 → a referral's "Interview rounds"
 * APIs: GET/POST /recruitment/interview-rounds, POST /interview-rounds/:roundId/result
 *
 * The file that used to carry this name drove `/recruitment/interviews` — the legacy flat
 * schedule — and never touched a round; it now lives in `interview-schedule.spec.ts`.
 *
 * Q3 rather than Q1: create and record-result are `@Roles(Q3, Client, Admin)`, and QC1 is on
 * none of the round endpoints, so a rounds UI on Q1's screen would 403 for every QC1 user.
 */

const referrals = [referralRow({ referralId: 1, jobSubscriberMapId: 200, status: 'Referred' })];

async function setupMocks(page: Page, opts: { rounds?: unknown[]; log?: RequestLog[] } = {}) {
  const log = opts.log;
  await page.route('**/api/recruitment/referrals*', (route) => route.fulfill(json(referrals)));
  await page.route('**/api/recruitment/interview-modes*', (route) =>
    route.fulfill(json([INTERVIEW_MODE])),
  );
  await page.route('**/api/recruitment/interview-rounds/**', (route) => {
    if (log) recordRequest(log, route);
    return route.fulfill(json(opts.rounds ?? []));
  });
  // The create endpoint has no trailing path segment, so it needs its own handler.
  await page.route('**/api/recruitment/interview-rounds', (route) => {
    if (log) recordRequest(log, route);
    return route.fulfill(json({ roundId: 99 }));
  });
}

test.describe('Interview rounds (Q3)', () => {
  test.beforeEach(async ({ page }) => {
    await mockQ3Session(page);
  });

  test('opening a referral shows its rounds', async ({ page }) => {
    await setupMocks(page, { rounds: [INTERVIEW_ROUND] });

    await page.goto('/recruitment/q3');
    await page.getByRole('button', { name: 'Interview rounds' }).first().click();

    await expect(page.getByText('R1: Screening')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Mr. Sharma')).toBeVisible();
    await expect(page.getByText('Offered times')).toBeVisible();
  });

  test('an application with no rounds says so', async ({ page }) => {
    await setupMocks(page, { rounds: [] });

    await page.goto('/recruitment/q3');
    await page.getByRole('button', { name: 'Interview rounds' }).first().click();

    await expect(page.getByText('No rounds yet for this application.')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('creating a round posts the application, number, name and mode', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, { rounds: [], log });

    await page.goto('/recruitment/q3');
    await page.getByRole('button', { name: 'Interview rounds' }).first().click();
    await expect(page.getByText('Add round 1')).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder('Round name (e.g. Technical)').fill('Technical');
    await page.getByPlaceholder('Interviewer name').fill('Ms. Rao');
    await page.selectOption('select', String(INTERVIEW_MODE.id));
    await page.getByRole('button', { name: 'Create round' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({
      jobSubscriberMapId: 200,
      roundNumber: 1,
      roundName: 'Technical',
      interviewerName: 'Ms. Rao',
      interviewMode: String(INTERVIEW_MODE.id),
    });
  });

  test('the next round number follows the highest existing round', async ({ page }) => {
    await setupMocks(page, {
      rounds: [INTERVIEW_ROUND, { ...INTERVIEW_ROUND, roundId: 2, roundNumber: 2 }],
    });

    await page.goto('/recruitment/q3');
    await page.getByRole('button', { name: 'Interview rounds' }).first().click();

    await expect(page.getByText('Add round 3')).toBeVisible({ timeout: 10_000 });
  });

  test('recording a result sends the verdict and the feedback', async ({ page }) => {
    const log: RequestLog[] = [];
    await setupMocks(page, { rounds: [INTERVIEW_ROUND], log });

    await page.goto('/recruitment/q3');
    await page.getByRole('button', { name: 'Interview rounds' }).first().click();
    await expect(page.getByText('R1: Screening')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Record result' }).click();
    await page.getByPlaceholder('Feedback (optional)').fill('Strong fundamentals');
    await page.getByRole('button', { name: 'Passed', exact: true }).click();

    const posted = log.find((r) => r.method === 'POST' && r.url.includes('/result'));
    expect(posted?.body).toMatchObject({ result: 'Passed', feedback: 'Strong fundamentals' });
  });

  test('a decided round offers no result buttons', async ({ page }) => {
    await setupMocks(page, {
      rounds: [{ ...INTERVIEW_ROUND, result: 'Passed', companyFeedback: 'Clears the bar' }],
    });

    await page.goto('/recruitment/q3');
    await page.getByRole('button', { name: 'Interview rounds' }).first().click();

    await expect(page.getByText('R1: Screening')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Record result' })).toHaveCount(0);
    await expect(page.getByText('Clears the bar')).toBeVisible();
  });

  test('a meeting link is offered when the round has one', async ({ page }) => {
    await setupMocks(page, {
      rounds: [{ ...INTERVIEW_ROUND, meetingLink: 'https://meet.example.com/xyz' }],
    });

    await page.goto('/recruitment/q3');
    await page.getByRole('button', { name: 'Interview rounds' }).first().click();

    const link = page.getByRole('link', { name: 'Join link' });
    await expect(link).toBeVisible({ timeout: 10_000 });
    await expect(link).toHaveAttribute('href', 'https://meet.example.com/xyz');
  });
});
