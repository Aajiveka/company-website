import { test, expect } from '@playwright/test';
import { mockCandidateSession, type RequestLog } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Email Preferences — Figma node 7:7981.
 *
 * The screen has two independent axes: topic switches (what we contact the candidate about)
 * and channel switches (how it reaches them). The specs cover both, plus the case that makes
 * the two axes visible — every channel off, which silences the topics regardless.
 */

test.describe('Email preferences', () => {
  test('renders the design three topic groups and the delivery channels', async ({ page }) => {
    await mockCandidateSession(page);
    await page.goto('/candidate/notifications');

    await expect(page.getByRole('heading', { name: 'Email Preferences' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Job Recommendations')).toBeVisible();
    await expect(page.getByText('Applications & Interviews')).toBeVisible();
    await expect(page.getByText('Platform', { exact: true })).toBeVisible();
    await expect(page.getByText('Delivery')).toBeVisible();

    await expect(page.getByRole('switch')).toHaveCount(11);
  });

  test('reflects the stored preferences on each switch', async ({ page }) => {
    await mockCandidateSession(page);
    await page.goto('/candidate/notifications');

    await expect(page.getByRole('switch', { name: 'New Job Alerts' })).toHaveAttribute('aria-checked', 'true', {
      timeout: 10_000,
    });
    await expect(page.getByRole('switch', { name: 'Weekly Job Digest' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Interview Reminders' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Email' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('switch', { name: 'SMS' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Save stays disabled until something actually changes', async ({ page }) => {
    await mockCandidateSession(page);
    await page.goto('/candidate/notifications');

    const save = page.getByRole('button', { name: 'Save Preferences' });
    await expect(save).toBeDisabled({ timeout: 10_000 });

    await page.getByRole('switch', { name: 'Weekly Job Digest' }).click();
    await expect(save).toBeEnabled();

    // Toggling back restores the stored state, so there is nothing left to save.
    await page.getByRole('switch', { name: 'Weekly Job Digest' }).click();
    await expect(save).toBeDisabled();
  });

  test('saving sends the whole preference set and confirms it', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { log });
    await page.goto('/candidate/notifications');
    await expect(page.getByRole('switch', { name: 'Weekly Job Digest' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('switch', { name: 'Weekly Job Digest' }).click();
    await page.getByRole('switch', { name: 'Interview Reminders' }).click();
    await page.getByRole('button', { name: 'Save Preferences' }).click();

    await expect(page.getByText('Preferences saved.')).toBeVisible();

    const put = log.find((r) => r.method === 'PUT' && r.url.includes('/notification-prefs'));
    expect(put).toBeTruthy();
    expect(put?.body).toMatchObject({
      weeklyJobDigest: true,
      interviewReminders: true,
      newJobAlerts: true,
      jobAlertFrequency: 'Daily',
    });
  });

  test('changing the digest frequency is a saveable change', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { log });
    await page.goto('/candidate/notifications');
    await expect(page.getByRole('button', { name: 'Daily' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Weekly' }).click();

    await expect(page.getByRole('button', { name: 'Weekly' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-pressed', 'false');

    await page.getByRole('button', { name: 'Save Preferences' }).click();
    await expect(page.getByText('Preferences saved.')).toBeVisible();
    expect(log.find((r) => r.method === 'PUT')?.body).toMatchObject({ jobAlertFrequency: 'Weekly' });
  });

  test('warns when every delivery channel is switched off', async ({ page }) => {
    await mockCandidateSession(page);
    await page.goto('/candidate/notifications');
    await expect(page.getByRole('switch', { name: 'Email' })).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/none of the topics above will reach you/i)).toHaveCount(0);

    await page.getByRole('switch', { name: 'Email' }).click();
    await page.getByRole('switch', { name: 'Push notifications' }).click();

    // SMS was already off, so this is now the silent case.
    await expect(page.getByText(/none of the topics above will reach you/i)).toBeVisible();

    await page.getByRole('switch', { name: 'Email' }).click();
    await expect(page.getByText(/none of the topics above will reach you/i)).toHaveCount(0);
  });

  test('a save failure is reported and does not claim success', async ({ page }) => {
    await mockCandidateSession(page);
    await page.route('**/api/candidates/me/notification-prefs', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
        : route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              emailAlerts: true,
              pushAlerts: true,
              smsAlerts: false,
              jobAlertFrequency: 'Daily',
              newJobAlerts: true,
              weeklyJobDigest: false,
              profileViewAlerts: true,
              applicationStatusUpdates: true,
              recruiterMessages: true,
              interviewReminders: false,
              productUpdates: false,
              marketingOffers: false,
            }),
          }),
    );

    await page.goto('/candidate/notifications');
    await expect(page.getByRole('switch', { name: 'Weekly Job Digest' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('switch', { name: 'Weekly Job Digest' }).click();
    await page.getByRole('button', { name: 'Save Preferences' }).click();

    await expect(page.getByText('Could not save your preferences.')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Preferences saved.')).toHaveCount(0);
  });

  test('a failed load offers a retry instead of an empty form', async ({ page }) => {
    await mockCandidateSession(page);
    let fail = true;
    await page.route('**/api/candidates/me/notification-prefs', (route) =>
      fail
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
        : route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              emailAlerts: true,
              pushAlerts: true,
              smsAlerts: false,
              jobAlertFrequency: 'Daily',
              newJobAlerts: true,
              weeklyJobDigest: false,
              profileViewAlerts: true,
              applicationStatusUpdates: true,
              recruiterMessages: true,
              interviewReminders: false,
              productUpdates: false,
              marketingOffers: false,
            }),
          }),
    );

    await page.goto('/candidate/notifications');
    await expect(page.getByText('We could not load your preferences.')).toBeVisible({ timeout: 15_000 });

    fail = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('switch', { name: 'New Job Alerts' })).toBeVisible({ timeout: 10_000 });
  });

  test('Cancel returns to the profile without saving', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockCandidateSession(page, { log });
    await page.goto('/candidate/notifications');
    await expect(page.getByRole('switch', { name: 'Weekly Job Digest' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('switch', { name: 'Weekly Job Digest' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/candidate\/profile$/);
    expect(log.some((r) => r.method === 'PUT')).toBe(false);
  });
});
