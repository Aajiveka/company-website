import { test, expect, type Page } from '@playwright/test';
import { json, recordRequest, type RequestLog } from './support/mocks';
import { mockQC1Session, mockQC2Session } from './support/auth-helpers';
import {
  Q2_ANALYTICS,
  Q2_APPLICANT_ROWS,
  Q2_APPLICATION,
  Q2_JOB_APPLICANTS,
  Q2_JOB_ROWS,
  Q2_NAV_COUNTS,
  Q2_SLA,
  Q2_STATS,
} from './support/q2-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * The Q2 matching workspace ("Q2" Figma page).
 *
 * Routes: /q2/dashboard, /q2/jobs, /q2/jobs/:jobId, /q2/applicants,
 * /q2/applications/:mapId, /q2/forwarded, /q2/sent-back, /q2/analytics.
 * API: /api/q2/*, all @Roles(QC2, Admin).
 */

async function mockQ2(
  page: Page,
  log: RequestLog[] = [],
  overrides: { application?: unknown } = {},
) {
  await page.route('**/api/q2/stats', (route) => route.fulfill(json(Q2_STATS)));
  await page.route('**/api/q2/nav-counts', (route) => route.fulfill(json(Q2_NAV_COUNTS)));
  await page.route('**/api/q2/sla', (route) => route.fulfill(json(Q2_SLA)));
  await page.route('**/api/q2/analytics', (route) => route.fulfill(json(Q2_ANALYTICS)));

  await page.route('**/api/q2/jobs?*', (route) => {
    recordRequest(log, route);
    const search = (new URL(route.request().url()).searchParams.get('search') ?? '').toLowerCase();
    const rows = search
      ? Q2_JOB_ROWS.filter(
          (j) =>
            j.title.toLowerCase().includes(search) || j.company.toLowerCase().includes(search),
        )
      : Q2_JOB_ROWS;
    return route.fulfill(json({ total: rows.length, rows }));
  });
  // The unsearched Employer Jobs load sends no query string at all.
  await page.route('**/api/q2/jobs', (route) =>
    route.fulfill(json({ total: Q2_JOB_ROWS.length, rows: Q2_JOB_ROWS })),
  );

  await page.route('**/api/q2/jobs/1*', (route) => {
    recordRequest(log, route);
    const relevantOnly =
      new URL(route.request().url()).searchParams.get('relevantOnly') === 'true';
    const applicants = relevantOnly
      ? Q2_JOB_APPLICANTS.applicants.filter((a) => a.relevant)
      : Q2_JOB_APPLICANTS.applicants;
    return route.fulfill(json({ ...Q2_JOB_APPLICANTS, applicants }));
  });

  await page.route('**/api/q2/applicants*', (route) => {
    recordRequest(log, route);
    const params = new URL(route.request().url()).searchParams;
    const tab = params.get('tab') ?? 'all';
    const bucket = params.get('bucket') ?? 'queue';
    const search = (params.get('search') ?? '').toLowerCase();

    const status =
      bucket === 'forwarded' ? 'Forwarded' : bucket === 'sentBack' ? 'SentBackToQ1' : null;
    let rows = status
      ? Q2_APPLICANT_ROWS.filter((r) => r.status === status)
      : [...Q2_APPLICANT_ROWS];
    if (search) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.jobTitle.toLowerCase().includes(search) ||
          r.company.toLowerCase().includes(search),
      );
    }
    // Counts come from the bucket before the tab filter, as the API does.
    const counts = {
      all: rows.length,
      relevant: rows.filter((r) => r.relevant).length,
      notRelevant: rows.filter((r) => !r.relevant).length,
    };
    if (tab === 'relevant') rows = rows.filter((r) => r.relevant);
    if (tab === 'notRelevant') rows = rows.filter((r) => !r.relevant);

    return route.fulfill(json({ total: rows.length, page: 1, pageSize: 20, counts, rows }));
  });

  await page.route('**/api/q2/applications/102', (route) =>
    route.fulfill(json(overrides.application ?? Q2_APPLICATION)),
  );
  await page.route('**/api/q2/applications/*/criteria', async (route) => {
    recordRequest(log, route);
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      criterion: string;
      included: boolean;
    };
    const criteria = Q2_APPLICATION.scoring.criteria.map((c) =>
      c.key === body.criterion ? { ...c, included: body.included } : c,
    );
    const active = criteria.filter((c) => c.included);
    const used = active.length ? active : criteria;
    const weight = used.reduce((s, c) => s + c.weight, 0);
    const totalScore = Math.round(
      used.reduce((s, c) => s + c.score * c.weight, 0) / (weight || 1),
    );
    return route.fulfill(
      json({
        ...Q2_APPLICATION,
        scoring: { ...Q2_APPLICATION.scoring, criteria, totalScore, selectedCount: active.length },
      }),
    );
  });
  for (const action of ['forward', 'send-back', 'reject']) {
    await page.route(`**/api/q2/applications/*/${action}`, (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ mapId: 102, status: 'Forwarded' }));
    });
  }
}

/**
 * Whether the PAGE scrolls sideways.
 *
 * Deliberately not `documentElement.scrollWidth - clientWidth`: Chromium counts a wide
 * descendant towards the root's scrollWidth even when an inner `overflow-x: auto` container
 * clips it, so that measure reports ~471px of overflow on a phone for a table that in fact
 * scrolls correctly inside its own wrapper. `body.scrollWidth` and an actual scroll attempt
 * describe what the user experiences.
 */
async function pageScrollsSideways(page: Page) {
  return page.evaluate(() => {
    window.scrollTo(9999, 0);
    const moved = window.scrollX > 0;
    window.scrollTo(0, 0);
    return moved || document.body.scrollWidth > document.documentElement.clientWidth + 1;
  });
}

test.describe('Q2 dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
    await mockQ2(page);
  });

  test('shows the five matching cards with the Figma’s numbers', async ({ page }) => {
    await page.goto('/q2/dashboard');
    await expect(page.getByRole('heading', { name: 'Job Matching' })).toBeVisible();
    await expect(page.getByText('Applied candidates scored against each job')).toBeVisible();

    for (const [label, help] of [
      ['Active Jobs', 'Posted by employers'],
      ['Total Applicants', 'Across all jobs'],
      ['Relevant Matches', 'Match ≥ 60%'],
      ['Forwarded to Q3', 'Complete profiles'],
      ['Sent back to Q1', 'Incomplete profiles'],
    ]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(help, { exact: true })).toBeVisible();
    }
  });

  test('renders the sidebar, its badges and the Matching SLA card', async ({ page }) => {
    await page.goto('/q2/dashboard');
    const nav = page.locator('aside').first();
    for (const item of [
      'Dashboard',
      'Employer Jobs',
      'All Applicants',
      'Forwarded to Q3',
      'Sent back to Q1',
      'Match Analytics',
    ]) {
      await expect(nav.getByRole('link', { name: new RegExp(item) })).toBeVisible();
    }
    await expect(nav.getByText('Matching SLA')).toBeVisible();
    await expect(nav.getByText('7 of 10 applicants matched today. 3 awaiting review.')).toBeVisible();
  });

  test('shows the Employer Jobs table below the cards', async ({ page }) => {
    await page.goto('/q2/dashboard');
    await expect(page.getByText('4 jobs · applicants shown job-wise')).toBeVisible();
    for (const col of ['Job', 'Experience', 'Work Mode', 'Applicants', 'Relevant', 'Top Match']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Senior UI/UX Designer', exact: true })).toBeVisible();
    await expect(page.getByText('6 – 10 yrs').first()).toBeVisible();
    await expect(page.getByText('1 relevant').first()).toBeVisible();
    await expect(page.getByText('94%').first()).toBeVisible();
  });

  test('says so when the stats call fails, and retries', async ({ page }) => {
    await page.route('**/api/q2/stats', (route) => route.fulfill({ status: 500, body: '{}' }));
    await page.goto('/q2/dashboard');
    await expect(page.getByRole('button', { name: /try again|retry/i })).toBeVisible();
  });
});

test.describe('Employer Jobs', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
  });

  test('filters by job or company', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ2(page, log);
    await page.goto('/q2/jobs');
    await expect(page.getByRole('link', { name: 'DevOps Engineer', exact: true })).toBeVisible();

    await page.getByPlaceholder('Search job or company…').fill('Razorpay');
    await expect(page.getByRole('link', { name: 'Senior Product Manager', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'DevOps Engineer', exact: true })).toBeHidden();
    expect(log.some((r) => r.url.includes('search=Razorpay'))).toBe(true);
  });

  test('offers a way out of an empty search', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/jobs');
    await page.getByPlaceholder('Search job or company…').fill('zzzznothing');
    await expect(page.getByText('No jobs found')).toBeVisible();
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.getByRole('link', { name: 'DevOps Engineer', exact: true })).toBeVisible();
  });

  test('a job row opens its applicants', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/jobs');
    await page.getByRole('link', { name: 'Senior UI/UX Designer', exact: true }).click();
    await expect(page).toHaveURL(/\/q2\/jobs\/1$/);
    await expect(page.getByRole('heading', { name: 'Job Applicants' })).toBeVisible();
  });
});

test.describe('Job Applicants', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
    await mockQ2(page);
  });

  test('renders the job header, the ranking and the Job Information rail', async ({ page }) => {
    await page.goto('/q2/jobs/1');
    await expect(page.getByRole('heading', { name: 'Senior UI/UX Designer' })).toBeVisible();
    await expect(page.getByText('Secninjaz Technologies').first()).toBeVisible();
    await expect(page.getByText('total applicants')).toBeVisible();

    for (const chip of ['Full-time', 'Hybrid', '₹24 – 32 LPA']) {
      await expect(page.getByText(chip, { exact: true }).first()).toBeVisible();
    }

    await expect(page.getByText('Applicants — Match Ranking')).toBeVisible();
    await expect(page.getByText('Resume scored against this job description')).toBeVisible();
    await expect(page.getByText('Jatinder Singh')).toBeVisible();
    await expect(page.getByText('Relevant', { exact: true })).toBeVisible();
    await expect(page.getByText('Not Relevant', { exact: true })).toBeVisible();
    await expect(page.getByText('Profile 100%')).toBeVisible();

    await expect(page.getByText('Job Information')).toBeVisible();
    await expect(page.getByText('28 Aug 2026')).toBeVisible();
    await expect(page.getByText("Bachelor's in Design / HCI or related")).toBeVisible();
    await expect(page.getByText('Auto-flagged on intake')).toBeVisible();
    await expect(page.getByText('CV missing')).toBeVisible();
  });

  test('the Relevant only switch hides the sub-60% applicant', async ({ page }) => {
    await page.goto('/q2/jobs/1');
    await expect(page.getByText('Sana Kapoor')).toBeVisible();
    await page.getByRole('switch', { name: /relevant only/i }).click();
    await expect(page.getByText('Sana Kapoor')).toBeHidden();
    await expect(page.getByText('Jatinder Singh')).toBeVisible();
  });

  test('both back affordances return to the jobs list', async ({ page }) => {
    await page.goto('/q2/jobs/1');
    await page.getByRole('link', { name: 'Back to jobs' }).click();
    await expect(page).toHaveURL(/\/q2\/jobs$/);

    await page.goto('/q2/jobs/1');
    await page.getByRole('button', { name: 'Back to all jobs' }).click();
    await expect(page).toHaveURL(/\/q2\/jobs$/);
  });

  test('a ranked applicant opens the detail screen', async ({ page }) => {
    await page.goto('/q2/jobs/1');
    await page.getByRole('link', { name: /Jatinder Singh/ }).click();
    await expect(page).toHaveURL(/\/q2\/applications\/102$/);
  });
});

test.describe('All Applicants', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
  });

  test('lists the ten applications with the design’s columns', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/applicants');
    await expect(page.getByText('10 applications across all jobs')).toBeVisible();
    for (const col of ['Candidate', 'Applied For', 'Match', 'Profile', 'Status']) {
      await expect(page.getByRole('columnheader', { name: col, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('link', { name: 'Priya Nair', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meera Iyer', exact: true })).toBeVisible();
    // Nishu Kumar applied to two jobs, so the same name appears twice.
    await expect(page.getByRole('link', { name: 'Nishu Kumar', exact: true })).toHaveCount(2);
  });

  test('the three tabs filter on the ≥ 60% relevance cut', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/applicants');

    await page.getByRole('tab', { name: 'Relevant', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Priya Nair', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meera Iyer', exact: true })).toBeHidden();

    await page.getByRole('tab', { name: 'Not Relevant', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Meera Iyer', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Priya Nair', exact: true })).toBeHidden();

    await page.getByRole('tab', { name: 'All', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Priya Nair', exact: true })).toBeVisible();
  });

  test('searches by candidate, job or company', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/applicants');
    await page.getByPlaceholder('Search candidate or job…').fill('Razorpay');
    await expect(page.getByRole('link', { name: 'Priya Nair', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meera Iyer', exact: true })).toBeHidden();
  });

  test('seeds the field from ?search=, so the topbar search is visible in the box', async ({
    page,
  }) => {
    await mockQ2(page);
    await page.goto('/q2/applicants?search=Priya');
    await expect(page.getByPlaceholder('Search candidate or job…')).toHaveValue('Priya');
    await expect(page.getByRole('link', { name: 'Priya Nair', exact: true })).toBeVisible();
  });

  test('a row opens the applicant detail', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/applicants');
    await page.getByRole('link', { name: 'Jatinder Singh', exact: true }).click();
    await expect(page).toHaveURL(/\/q2\/applications\/102$/);
  });

  test('the two decision buckets have their own empty states', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/forwarded');
    await expect(page.getByText('Nothing forwarded yet')).toBeVisible();
    // No relevance tabs on a decided bucket.
    await expect(page.getByRole('tab')).toHaveCount(0);

    await page.goto('/q2/sent-back');
    await expect(page.getByText('Nothing sent back')).toBeVisible();
  });
});

test.describe('Applicant detail', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
  });

  test('renders the candidate panel, the JD panel and the coverage', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/applications/102');

    await expect(page.getByRole('heading', { name: 'Jatinder Singh' })).toBeVisible();
    await expect(page.getByText('Overall JD match')).toBeVisible();

    await expect(page.getByText('jatinder.singh@email.com')).toBeVisible();
    await expect(page.getByText('+91 98765 43210')).toBeVisible();
    await expect(page.getByText('B.Des (HCI)')).toBeVisible();
    await expect(page.getByText('30 days')).toBeVisible();
    await expect(page.getByText('Jatinder_Singh_Resume.pdf')).toBeVisible();
    // The design's full resume meta line, not just "Click to preview".
    await expect(page.getByText('Click to preview · 2 pages · 240 KB')).toBeVisible();

    await expect(page.getByText('Job Description')).toBeVisible();
    await expect(page.getByText('Resume × JD Coverage')).toBeVisible();
    await expect(page.getByText(/Matched \(5\)/)).toBeVisible();
    await expect(page.getByText(/Missing \(0\)/)).toBeVisible();
    await expect(page.getByText('None — full coverage')).toBeVisible();
    await expect(page.getByText('Why they match')).toBeVisible();
  });

  test('shows all seven criteria and the 1/7 state the design draws', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/applications/102');
    await expect(page.getByText('Tick the criteria to include in the match')).toBeVisible();
    await expect(page.getByRole('checkbox')).toHaveCount(7);
    await expect(page.getByRole('checkbox', { name: 'Job Role Match' })).toBeChecked();
    await expect(page.getByText('Total Match Score')).toBeVisible();
    await expect(page.getByText('1/7 criteria')).toBeVisible();
    await expect(page.getByText('w 30%')).toBeVisible();
  });

  test('ticking a criterion re-weights the total over the ticked subset', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ2(page, log);
    await page.goto('/q2/applications/102');

    // Skill 96 at w30 plus Job Role 98 at w20, renormalised: (96*.30 + 98*.20) / .50 = 96.8 -> 97
    await page.getByRole('checkbox', { name: 'Skill Match' }).click();
    await expect(page.getByText('2/7 criteria')).toBeVisible();
    await expect(page.getByText('97%').first()).toBeVisible();
    expect(log.some((r) => r.url.includes('/criteria'))).toBe(true);
  });

  test('forwards to Q3 and confirms it', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ2(page, log);
    await page.goto('/q2/applications/102');
    await page.getByRole('button', { name: 'Forward to Q3' }).click();
    await expect(page.getByText('Forwarded to Q3.')).toBeVisible();
    expect(log.some((r) => r.method === 'POST' && r.url.includes('/forward'))).toBe(true);
  });

  test('sends back to Q1', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ2(page, log);
    await page.goto('/q2/applications/102');
    await page.getByRole('button', { name: 'Send back to Q1' }).click();
    expect(log.some((r) => r.method === 'POST' && r.url.includes('/send-back'))).toBe(true);
  });

  test('rejects', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockQ2(page, log);
    await page.goto('/q2/applications/102');
    await page.getByRole('button', { name: 'Reject' }).click();
    expect(log.some((r) => r.method === 'POST' && r.url.includes('/reject'))).toBe(true);
  });

  test('hides the decisions on an application that already has one', async ({ page }) => {
    await mockQ2(page, [], {
      application: { ...Q2_APPLICATION, status: 'Forwarded' },
    });
    await page.goto('/q2/applications/102');
    await expect(page.getByRole('button', { name: 'Forward to Q3' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Reject' })).toBeHidden();
    await expect(page.getByText(/Already Forwarded to Q3/)).toBeVisible();
  });

  test('surfaces a failed decision', async ({ page }) => {
    await mockQ2(page);
    await page.route('**/api/q2/applications/*/forward', (route) =>
      route.fulfill({ status: 409, body: '{"message":"already Forwarded"}' }),
    );
    await page.goto('/q2/applications/102');
    await page.getByRole('button', { name: 'Forward to Q3' }).click();
    await expect(page.getByText(/Could not forward/)).toBeVisible();
  });

  test('back to applicants returns to the list', async ({ page }) => {
    await mockQ2(page);
    await page.goto('/q2/applications/102');
    await page.getByRole('link', { name: 'Back to applicants' }).click();
    await expect(page).toHaveURL(/\/q2\/applicants$/);
  });
});

test.describe('Match Analytics', () => {
  test('reports the bands, the decisions and the seven criteria', async ({ page }) => {
    await mockQC2Session(page);
    await mockQ2(page);
    await page.goto('/q2/analytics');
    await expect(page.getByRole('heading', { name: 'Match Analytics' })).toBeVisible();
    await expect(page.getByText('Match score distribution')).toBeVisible();
    await expect(page.getByText('Relevance cut is 60%')).toBeVisible();
    await expect(page.getByText('90–100')).toBeVisible();
    await expect(page.getByText('Average score by criterion')).toBeVisible();
    await expect(page.getByText('Awaiting review', { exact: true })).toBeVisible();
  });
});

test.describe('Q2 sidebar collapse', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
    await mockQ2(page);
  });

  test('the edge chevron collapses and restores the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/q2/dashboard');
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(sidebar).toBeHidden();

    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(sidebar).toBeVisible();
  });

  test('stays collapsed across navigation and a reload', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/q2/dashboard');
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(page.locator('aside').first()).toBeHidden();

    // Every Q2 page mounts its own shell, so an unpersisted toggle would reopen here.
    await page.goto('/q2/applicants');
    await expect(page.locator('aside').first()).toBeHidden();

    await page.reload();
    await expect(page.locator('aside').first()).toBeHidden();
  });
});

test.describe('Q2 access control', () => {
  /**
   * `/api/q2/*` is @Roles(QC2, Admin) and the client guard is the same pair. QC1 landing on a
   * Q2 screen would otherwise render the chrome and then 403 on every request — the shape of
   * the bug fixed in 2eb4db7.
   */
  test('QC1 cannot reach the Q2 workspace', async ({ page }) => {
    await mockQC1Session(page);
    await mockQ2(page);
    await page.goto('/q2/dashboard');
    await expect(page).not.toHaveURL(/\/q2\/dashboard/);
  });

  test('QC2 lands on the Q2 dashboard and /q2 redirects there', async ({ page }) => {
    await mockQC2Session(page);
    await mockQ2(page);
    await page.goto('/q2');
    await expect(page).toHaveURL(/\/q2\/dashboard$/);
  });
});

test.describe('Q2 responsive', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
    await mockQ2(page);
  });

  test('mobile hides the sidebar behind a drawer and does not scroll sideways', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/q2/dashboard');

    await expect(page.locator('aside').first()).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('link', { name: /All Applicants/ })).toBeVisible();

    expect(await pageScrollsSideways(page)).toBe(false);
  });

  test('the wide tables scroll inside their own container, not the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/q2/applicants');
    await expect(page.getByRole('link', { name: 'Priya Nair', exact: true })).toBeVisible();

    // The table is deliberately wider than a phone; it must scroll in its wrapper.
    const scroller = page.locator('div.overflow-x-auto').first();
    const canScroll = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    expect(canScroll).toBe(true);
    expect(await pageScrollsSideways(page)).toBe(false);
  });

  test('tablet keeps the applicant detail readable without sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto('/q2/applications/102');
    await expect(page.getByRole('heading', { name: 'Jatinder Singh' })).toBeVisible();
    expect(await pageScrollsSideways(page)).toBe(false);
  });

  test('desktop shows the sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/q2/dashboard');
    await expect(page.locator('aside').first()).toBeVisible();
  });
});
