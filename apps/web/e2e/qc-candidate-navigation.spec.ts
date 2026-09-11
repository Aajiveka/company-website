import { test, expect, type Page } from '@playwright/test';
import { json, recordRequest, type RequestLog } from './support/mocks';
import { mockQC1Session, mockQC2Session } from './support/auth-helpers';
import { CANDIDATE_ROW, CANDIDATE_DETAIL } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Getting to a candidate, and referring one onward.
 *
 * `/recruitment/candidates/:id` is the richest screen in the QC area — six decision buttons,
 * assign job, assign documents, the score breakdown — and nothing linked to it. Every spec
 * reached it with `page.goto`, which is exactly why nobody noticed that a QC user could only
 * arrive by typing the URL. The first test here clicks through, so the orphan cannot come back.
 *
 * The refer tests cover the other half: `POST /recruitment/referrals` had no caller anywhere,
 * so the Q2 → Q3 → Company pipeline could never be entered and Q3's queue was always empty.
 */

async function setupMocks(page: Page, log?: RequestLog[]) {
  await page.route('**/api/recruitment/candidates?*', (route) =>
    route.fulfill(json({ rows: [CANDIDATE_ROW], total: 1 })),
  );
  await page.route('**/api/recruitment/candidates/100', (route) =>
    route.fulfill(json(CANDIDATE_DETAIL)),
  );
  await page.route('**/api/recruitment/referrals', (route) => {
    if (log) recordRequest(log, route);
    return route.fulfill(json({ referred: 1 }));
  });
  await page.route('**/api/recruitment/jobs*', (route) => route.fulfill(json([])));
  await page.route('**/api/recruitment/document-types*', (route) => route.fulfill(json([])));
}

test.describe('Reaching a candidate from the list', () => {
  test('the candidate name links through to the detail screen', async ({ page }) => {
    await mockQC1Session(page);
    await setupMocks(page);

    await page.goto('/recruitment/candidates');
    await page.getByRole('link', { name: 'Ravi Kumar' }).click();

    await expect(page).toHaveURL(/\/recruitment\/candidates\/100$/);
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Refer to Q3', () => {
  test('QC2 can refer, and the application id is what is sent', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQC2Session(page);
    await setupMocks(page, log);

    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: 'Refer to Q3' }).click();

    await expect(page.getByText('Referred to Q3.')).toBeVisible();
    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ jobSubscriberMapIds: [200] });
  });

  test('QC1 is not offered it — the endpoint is @Roles(QC2, Admin)', async ({ page }) => {
    await mockQC1Session(page);
    await setupMocks(page);

    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByRole('button', { name: 'Refer to Q3' })).toHaveCount(0);
  });

  test('QC1 is not offered Assign Documents either — same reason', async ({ page }) => {
    await mockQC1Session(page);
    await setupMocks(page);

    await page.goto('/recruitment/candidates/100');
    await expect(page.getByRole('heading', { name: 'Ravi Kumar' })).toBeVisible({
      timeout: 10_000,
    });

    // It used to render for everyone and 403 on press.
    await expect(page.getByRole('button', { name: 'Assign Documents' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assign Job' })).toBeVisible();
  });

  test('an already-referred application reports that rather than claiming success', async ({
    page,
  }) => {
    await mockQC2Session(page);
    await setupMocks(page);
    await page.route('**/api/recruitment/referrals', (route) =>
      route.fulfill(json({ referred: 0 })),
    );

    await page.goto('/recruitment/candidates/100');
    await page.getByRole('button', { name: 'Refer to Q3' }).click();

    await expect(page.getByText('This application was already referred.')).toBeVisible();
  });
});

test.describe('Scoring survives a reload', () => {
  test('the Score action is offered from the stored mapping, not only after assigning', async ({
    page,
  }) => {
    await mockQC1Session(page);
    await setupMocks(page);

    await page.goto('/recruitment/candidates/100');

    // Previously this only appeared after assigning a job in the same page session.
    await expect(page.getByRole('button', { name: 'Score Application' })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('an existing score shows its value without recomputing', async ({ page }) => {
    await mockQC1Session(page);
    await setupMocks(page);
    await page.route('**/api/recruitment/candidates/100', (route) =>
      route.fulfill(
        json({
          ...CANDIDATE_DETAIL,
          score: {
            totalScore: 78,
            skillScore: 80,
            experienceScore: 70,
            jobRoleScore: 90,
            educationScore: 60,
            locationScore: 100,
            salaryScore: 50,
            noticePeriodScore: 100,
          },
        }),
      ),
    );

    await page.goto('/recruitment/candidates/100');

    await expect(page.getByRole('button', { name: 'Score: 78%' })).toBeVisible({ timeout: 10_000 });
  });
});
