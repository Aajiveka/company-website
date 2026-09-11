import { test, expect, type Page } from '@playwright/test';
import { json, recordRequest, type RequestLog } from './support/mocks';
import { mockQC1Session, mockQC2Session } from './support/auth-helpers';
import {
  Q1_ANALYTICS,
  Q1_NAV_COUNTS,
  Q1_PROFILE_COMPLETE,
  Q1_PROFILE_INCOMPLETE,
  Q1_ROW_INCOMPLETE,
  Q1_ROW_NEW,
  Q1_STATS,
} from './support/q1-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * The Q1 screening workspace ("Q1 Flow" Figma).
 * Routes: /q1/dashboard, /q1/candidates, /q1/candidates/:id, the four filtered screens,
 * /q1/analytics. API: /api/q1/*, all @Roles(QC1, Admin).
 */

const ROWS = [Q1_ROW_NEW, Q1_ROW_INCOMPLETE];

async function mockQ1(page: Page, log: RequestLog[] = [], overrides: Record<string, unknown> = {}) {
  await page.route('**/api/q1/stats', (route) => route.fulfill(json(Q1_STATS)));
  await page.route('**/api/q1/nav-counts', (route) => route.fulfill(json(Q1_NAV_COUNTS)));
  await page.route('**/api/q1/analytics', (route) => route.fulfill(json(Q1_ANALYTICS)));
  await page.route('**/api/q1/candidates?*', (route) => {
    recordRequest(log, route);
    const tab = new URL(route.request().url()).searchParams.get('tab') ?? 'all';
    const map: Record<string, string> = { new: 'New', incomplete: 'Incomplete' };
    const rows = tab === 'all' ? ROWS : ROWS.filter((r) => r.status === map[tab]);
    return route.fulfill(json({ rows, total: rows.length }));
  });
  await page.route('**/api/q1/candidates/1', (route) =>
    route.fulfill(json(overrides.profile ?? Q1_PROFILE_COMPLETE)),
  );
  await page.route('**/api/q1/candidates/3', (route) => route.fulfill(json(Q1_PROFILE_INCOMPLETE)));
  await page.route('**/api/q1/candidates/*/contact-log', (route) => route.fulfill(json([])));
  for (const path of ['checklist', 'checklist/all', 'verify', 'contact', 'request-update', 'request-cv', 'status']) {
    await page.route(`**/api/q1/candidates/*/${path}`, (route) => {
      recordRequest(log, route);
      return route.fulfill(json(Q1_PROFILE_COMPLETE.screening));
    });
  }
}

test.describe('Q1 dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC1Session(page);
  });

  test('shows the five pipeline cards from the design', async ({ page }) => {
    await mockQ1(page);
    await page.goto('/q1/dashboard');

    // Scoped to the card grid: "Verified" and "Not Interested" are also tab labels.
    const cards = page.getByRole('main').locator('div').first();
    for (const label of [
      'New Candidates',
      'Pending Screening',
      'Follow-ups Due',
      'Verified',
      'Not Interested / Closed',
    ]) {
      await expect(cards.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('renders the queue with the seven design columns', async ({ page }) => {
    await mockQ1(page);
    await page.goto('/q1/dashboard');

    for (const col of ['Candidate', 'Experience', 'Profile', 'CV', 'Received', 'Priority', 'Status']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true })).toBeVisible();
    }
    // Scoped to the table: the responsive card list renders the same facts in the DOM and is
    // hidden with `md:hidden` rather than unmounted.
    const table = page.getByRole('table');
    await expect(table.getByRole('link', { name: 'Jatinder Singh', exact: true })).toBeVisible();
    await expect(table.getByText('CV Missing')).toBeVisible();
  });

  test('a tab filters the queue through the API, not in the browser', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ1(page, log);
    await page.goto('/q1/dashboard');
    await expect(page.getByRole('link', { name: 'Anuranjan Kumar', exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Incomplete' }).click();

    await expect(page.getByRole('link', { name: 'Jatinder Singh', exact: true })).toBeHidden();
    expect(log.some((r) => r.url.includes('tab=incomplete'))).toBe(true);
  });

  test('the Filters popover sends priority, experience and CV-only', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ1(page, log);
    await page.goto('/q1/dashboard');

    await page.getByRole('button', { name: 'Filters' }).click();
    await page.getByRole('button', { name: 'high', exact: true }).click();
    await page.getByRole('button', { name: '8+ yrs' }).click();
    await page.getByLabel('CV available only').check();

    await expect
      .poll(() => log.some((r) => r.url.includes('priority=high') && r.url.includes('cvOnly=true')))
      .toBe(true);
  });

  test('a failed stats load offers a retry instead of pulsing forever', async ({ page }) => {
    await mockQ1(page);
    await page.route('**/api/q1/stats', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/q1/dashboard');

    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});

test.describe('Q1 candidate profile', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC1Session(page);
  });

  test('opens from the queue and shows the screening rail', async ({ page }) => {
    await mockQ1(page);
    await page.goto('/q1/candidates');

    await page.getByRole('link', { name: 'Jatinder Singh', exact: true }).click();

    await expect(page).toHaveURL(/\/q1\/candidates\/1/);
    await expect(page.getByText('Q1 Initial Screening')).toBeVisible();
    await expect(page.getByText('5/7 · 71%')).toBeVisible();
  });

  test('a complete profile offers Mark as Verified', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ1(page, log);
    await page.goto('/q1/candidates/1');

    await expect(page.getByText('Profile Complete', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Mark as Verified/ }).click();

    await expect.poll(() => log.some((r) => r.url.endsWith('/verify'))).toBe(true);
  });

  test('an incomplete profile lists what is missing and cannot be verified', async ({ page }) => {
    await mockQ1(page);
    await page.goto('/q1/candidates/3');

    await expect(page.getByText('Profile Incomplete', { exact: true })).toBeVisible();
    await expect(page.getByText('Missing CV')).toBeVisible();
    await expect(page.getByText('Notice period not provided')).toBeVisible();
    await expect(page.getByRole('button', { name: /Mark as Verified/ })).toBeHidden();
  });

  test('a missing CV shows the empty state with Request CV', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ1(page, log);
    await page.goto('/q1/candidates/3');

    await expect(page.getByText('CV not uploaded')).toBeVisible();
    await page.getByRole('button', { name: 'Request CV' }).click();

    await expect.poll(() => log.some((r) => r.url.endsWith('/request-cv'))).toBe(true);
  });

  test('toggling a checklist item posts the item key', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ1(page, log);
    await page.goto('/q1/candidates/1');

    await page.getByRole('checkbox', { name: 'Location verified' }).click();

    await expect
      .poll(() => log.find((r) => r.url.endsWith('/checklist'))?.body)
      .toMatchObject({ item: 'locationVerified', checked: true });
  });

  test('Contact Candidate logs the contact then hands over to the status modal', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ1(page, log);
    await page.goto('/q1/candidates/3');

    await page.getByRole('button', { name: 'Contact Candidate' }).first().click();
    await expect(page.getByText("What's missing")).toBeVisible();
    await page.getByRole('button', { name: 'WhatsApp' }).click();
    await page.getByRole('button', { name: /Update Status/ }).click();

    await expect
      .poll(() => log.find((r) => r.url.endsWith('/contact'))?.body)
      .toMatchObject({ channel: 'WhatsApp' });
    // The design's flow: contacting does not decide an outcome, so the status modal follows.
    await expect(page.getByText('Choose the screening outcome')).toBeVisible();
  });

  test('a failed profile load offers a retry', async ({ page }) => {
    await mockQ1(page);
    await page.route('**/api/q1/candidates/1', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/q1/candidates/1');

    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});

test.describe('Q1 filtered screens and analytics', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC1Session(page);
  });

  test('each sidebar screen pins the queue to its own tab', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ1(page, log);

    for (const [path, tab] of [
      ['/q1/follow-ups', 'follow-up'],
      ['/q1/no-response', 'no-response'],
      ['/q1/verified', 'verified'],
      ['/q1/not-interested', 'not-interested'],
    ]) {
      log.length = 0;
      await page.goto(path);
      await expect.poll(() => log.some((r) => r.url.includes(`tab=${tab}`))).toBe(true);
      // These four screens have no tab strip in the design.
      await expect(page.getByRole('tab', { name: 'All' })).toBeHidden();
    }
  });

  test('analytics renders the four KPIs and the funnel', async ({ page }) => {
    await mockQ1(page);
    await page.goto('/q1/analytics');

    await expect(page.getByText('Candidates screened')).toBeVisible();
    await expect(page.getByText('Verification rate')).toBeVisible();
    await expect(page.getByText('1h 24m')).toBeVisible();
    await expect(page.getByText('Screening funnel')).toBeVisible();
  });
});

test.describe('Q1 access control', () => {
  test('QC2 is redirected away — /api/q1/* is QC1 + Admin only', async ({ page }) => {
    await mockQC2Session(page);
    await mockQ1(page);

    await page.goto('/q1/dashboard');

    // The client guard matches the server's @Roles exactly, so QC2 never reaches a screen
    // the API would 403. It lands on its own home instead — now the Q2 matching workspace
    // rather than /recruitment/candidates, since ROLE_HOME[QC2] moved with the Q2 build.
    await expect(page).toHaveURL(/\/q2\/dashboard/);
  });

  test('QC1 lands on the Q1 dashboard after login', async ({ page }) => {
    await mockQC1Session(page);
    await mockQ1(page);

    await page.goto('/q1');

    await expect(page).toHaveURL(/\/q1\/dashboard/);
  });
});
