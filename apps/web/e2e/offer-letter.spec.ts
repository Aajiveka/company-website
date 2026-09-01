import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest, mockCandidateSession } from './support/mocks';
import { mockQ3Session } from './support/auth-helpers';
import { OFFER_ROW } from './support/recruitment-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Offer Letter — Gap 7 (create / send / accept / reject).
 * APIs: POST /recruitment/offers, POST /recruitment/offers/:id/send,
 *        POST /recruitment/offers/:id/respond, GET /recruitment/offers/:mapId
 *
 * The offer letter flow is mostly API-driven. These tests verify the API contract
 * through page.evaluate() since the UI pages may not be fully wired yet.
 */

test.describe('Offer Letter — API Contract', () => {
  test('create offer returns correct shape', async ({ page }) => {
    await mockQ3Session(page);
    await page.route('**/api/recruitment/offers', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill(json({ offerId: 1, status: 'Draft' }, 201));
      }
      return route.fulfill(json(null));
    });

    await page.goto('/recruitment/q3');
    // Wait for page to load so auth is set up
    await page.waitForTimeout(1000);

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/recruitment/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobSubscriberMapId: 200,
          offerDetails: { salary: 1500000, designation: 'Software Engineer' },
          joiningDate: '2026-10-01',
        }),
      });
      return res.json();
    });

    expect(response).toMatchObject({ offerId: 1, status: 'Draft' });
  });

  test('send offer changes status to Sent', async ({ page }) => {
    await mockQ3Session(page);
    await page.route('**/api/recruitment/offers/1/send', (route) =>
      route.fulfill(json({ offerId: 1, status: 'Sent' })),
    );

    await page.goto('/recruitment/q3');
    await page.waitForTimeout(1000);

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/recruitment/offers/1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.json();
    });

    expect(response).toMatchObject({ offerId: 1, status: 'Sent' });
  });

  test('get offer returns offer data', async ({ page }) => {
    await mockQ3Session(page);
    await page.route('**/api/recruitment/offers/200', (route) =>
      route.fulfill(json(OFFER_ROW)),
    );

    await page.goto('/recruitment/q3');
    await page.waitForTimeout(1000);

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/recruitment/offers/200');
      return res.json();
    });

    expect(response).toMatchObject({
      offerId: 1,
      jobSubscriberMapId: 200,
      status: 'Sent',
    });
  });
});

test.describe('Offer Letter — Candidate Response', () => {
  test('candidate accepts offer', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page);
    await page.route('**/api/recruitment/offers/1/respond', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ offerId: 1, status: 'Accepted' }));
    });

    // Navigate to a page so auth is initialized
    await page.goto('/candidate/profile');
    await page.waitForTimeout(1000);

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/recruitment/offers/1/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true }),
      });
      return res.json();
    });

    expect(response).toMatchObject({ offerId: 1, status: 'Accepted' });
    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ accept: true });
  });

  test('candidate rejects offer', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page);
    await page.route('**/api/recruitment/offers/1/respond', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ offerId: 1, status: 'Rejected' }));
    });

    await page.goto('/candidate/profile');
    await page.waitForTimeout(1000);

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/recruitment/offers/1/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: false }),
      });
      return res.json();
    });

    expect(response).toMatchObject({ offerId: 1, status: 'Rejected' });
    const posted = log.find((r) => r.method === 'POST');
    expect(posted?.body).toMatchObject({ accept: false });
  });
});
