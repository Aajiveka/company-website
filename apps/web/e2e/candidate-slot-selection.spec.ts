import { test, expect } from '@playwright/test';
import { json, mockCandidateSession, recordRequest, type RequestLog } from './support/mocks';
import { INTERVIEW_ROUND, OFFER_ROW } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Candidate Slot Selection — Gap 4, part 3 (candidate picks a time slot).
 * Route: /candidate/applications
 *
 * This file used to be named for slot selection while asserting a read-only interview list,
 * an empty state, a past tab and that the calendar printed "Sun"/"Mon" — nothing here ever
 * selected a slot, and `POST /interview-rounds/:roundId/select-slot` had no caller in the
 * app at all. These tests drive the real thing: the offered times render as choices, and
 * picking one sends that slot id.
 *
 * The picker lives on Applications rather than Interviews because rounds hang off an
 * application (`jobSubscriberMapId`), and the Interviews page only lists applications that
 * already have a legacy scheduled interview — a round still awaiting a choice has none.
 */

const APPLIED = {
  jobId: 1,
  jobSubscriberMapId: 200,
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
  statusHistory: [],
  interview: null,
};

/** Rounds + offer for map 200; anything else answers empty so other rows stay quiet. */
async function mockRoundsAndOffer(
  page: import('@playwright/test').Page,
  opts: { rounds?: unknown[]; offer?: unknown; log?: RequestLog[] } = {},
) {
  await page.route('**/api/recruitment/interview-rounds/**', (route) => {
    if (opts.log) recordRequest(opts.log, route);
    if (route.request().method() === 'POST') return route.fulfill(json({ success: true }));
    return route.fulfill(json(opts.rounds ?? []));
  });
  await page.route('**/api/recruitment/offers/**', (route) => {
    if (opts.log) recordRequest(opts.log, route);
    if (route.request().method() === 'POST') return route.fulfill(json({ success: true }));
    return route.fulfill(json(opts.offer ?? null));
  });
}

test.describe('Candidate slot selection', () => {
  test('offered times render as choices', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: [APPLIED] });
    await mockRoundsAndOffer(page, { rounds: [INTERVIEW_ROUND] });

    await page.goto('/candidate/applications');

    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Choose a time for Screening/)).toBeVisible();
    // INTERVIEW_ROUND offers three slots.
    await expect(page.getByRole('button', { name: /2026|Sep/ })).toHaveCount(3);
  });

  test('picking a time posts that slot id', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { appliedJobs: [APPLIED] });
    await mockRoundsAndOffer(page, { rounds: [INTERVIEW_ROUND], log });

    await page.goto('/candidate/applications');
    await expect(page.getByText(/Choose a time for Screening/)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /2026|Sep/ }).first().click();

    await expect(page.getByText('Interview time confirmed.')).toBeVisible();
    const posted = log.find((r) => r.method === 'POST' && r.url.includes('select-slot'));
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ slotId: 1 });
  });

  test('a round already answered shows the confirmed time, not a chooser', async ({ page }) => {
    const answered = {
      ...INTERVIEW_ROUND,
      slots: [{ slotId: 2, slotDateTime: '2026-09-01T14:00:00.000Z', isSelected: true }],
      meetingLink: 'https://meet.example.com/abc',
    };
    await mockCandidateSession(page, { appliedJobs: [APPLIED] });
    await mockRoundsAndOffer(page, { rounds: [answered] });

    await page.goto('/candidate/applications');

    await expect(page.getByText('Screening')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Choose a time/)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Join link' })).toBeVisible();
  });

  test('no rounds means no picker at all', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: [APPLIED] });
    await mockRoundsAndOffer(page, { rounds: [] });

    await page.goto('/candidate/applications');

    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Choose a time/)).toHaveCount(0);
  });
});

test.describe('Candidate offer response', () => {
  test('a sent offer can be accepted', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { appliedJobs: [APPLIED] });
    await mockRoundsAndOffer(page, { offer: OFFER_ROW, log });

    await page.goto('/candidate/applications');

    await expect(page.getByText('Offer letter')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Accept offer' }).click();

    await expect(page.getByText('Offer accepted. Congratulations!')).toBeVisible();
    const posted = log.find((r) => r.method === 'POST' && r.url.includes('/respond'));
    expect(posted?.body).toMatchObject({ accept: true });
  });

  test('declining sends accept:false', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { appliedJobs: [APPLIED] });
    await mockRoundsAndOffer(page, { offer: OFFER_ROW, log });

    await page.goto('/candidate/applications');
    await expect(page.getByText('Offer letter')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Decline' }).click();

    const posted = log.find((r) => r.method === 'POST' && r.url.includes('/respond'));
    expect(posted?.body).toMatchObject({ accept: false });
  });

  test('a draft offer is never shown to the candidate', async ({ page }) => {
    await mockCandidateSession(page, { appliedJobs: [APPLIED] });
    await mockRoundsAndOffer(page, { offer: { ...OFFER_ROW, status: 'Draft' } });

    await page.goto('/candidate/applications');

    await expect(page.getByText('Senior React Developer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Offer letter')).toHaveCount(0);
  });
});
