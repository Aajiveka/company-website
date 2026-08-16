import { test, expect } from '@playwright/test';
import { mockCandidateSession, mockJobsApi, type RequestLog } from './support/mocks';

test.use({ serviceWorkers: 'block' });

/**
 * Apply flow — Figma nodes 28:4658 / 28:4794 / 28:4935 / 28:5072.
 *
 * Three stages on one route (form → review → submitted), so the specs walk the whole path
 * rather than visiting each stage directly: the form is unsaved state, and landing on the
 * review stage from a cold start is exactly the case the design does not have.
 */

test.describe('Apply to a job', () => {
  test.beforeEach(async ({ page }) => {
    await mockCandidateSession(page);
  });

  test('pre-fills the form from the candidate profile and says so', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');

    await expect(page.getByRole('heading', { name: 'Apply — Senior React Developer' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/pre-filled details from your profile/i)).toBeVisible();

    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel');
    await expect(page.getByLabel('Email')).toHaveValue('priya@example.com');
    await expect(page.getByLabel('Phone number')).toHaveValue('9876543210');
    await expect(page.getByLabel('Total experience')).toHaveValue('5');
    await expect(page.getByLabel('Current location')).toHaveValue('Pune');
    await expect(page.getByLabel('Expected salary')).toHaveValue('2500000');
    await expect(page.getByLabel('Notice period')).toHaveValue('30 Days');
    await expect(page.getByLabel('LinkedIn profile')).toHaveValue('https://linkedin.com/in/priya-patel');
    // The resume comes from the profile rather than an upload on this screen.
    await expect(page.getByText('priya-patel-cv.pdf')).toBeVisible();
  });

  test('blocks the review step until the three required fields are filled', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByLabel('Full name').fill('');
    await page.getByLabel('Email').fill('');
    await page.getByLabel('Phone number').fill('');
    await page.getByRole('button', { name: 'Review application' }).click();

    await expect(page.getByText('This field is required.')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Review your application' })).toHaveCount(0);
  });

  test('rejects a malformed email address', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Email')).toHaveValue('priya@example.com', { timeout: 10_000 });

    await page.getByLabel('Email').fill('priya@');
    await page.getByRole('button', { name: 'Review application' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review your application' })).toHaveCount(0);
  });

  test('review shows what was typed, and Edit returns with it intact', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByLabel('Full name').fill('Priya P Patel');
    await page.getByLabel('Cover letter / additional information').fill('I have shipped this exact stack for five years.');
    await page.getByRole('button', { name: 'Review application' }).click();

    await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible();
    await expect(page.getByText('Priya P Patel')).toBeVisible();
    await expect(page.getByText('I have shipped this exact stack for five years.')).toBeVisible();
    await expect(page.getByText('priya-patel-cv.pdf')).toBeVisible();

    await page.getByRole('button', { name: 'Back to form' }).click();

    await expect(page.getByLabel('Full name')).toHaveValue('Priya P Patel');
    await expect(page.getByLabel('Cover letter / additional information')).toHaveValue(
      'I have shipped this exact stack for five years.',
    );
  });

  test('leaves empty optional fields out of the review summary', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Review application' }).click();

    await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible();
    // Portfolio was never filled in, so its row is dropped rather than shown blank.
    await expect(page.getByText('Portfolio', { exact: true })).toHaveCount(0);
  });

  test('submits the application and confirms it with a reference', async ({ page }) => {
    const log: RequestLog[] = [];
    await mockJobsApi(page, { log });
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Review application' }).click();
    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page.getByRole('heading', { name: 'Application submitted successfully' })).toBeVisible();
    await expect(page.getByText('APP-2026-0077')).toBeVisible();
    await expect(page.getByText('Senior React Developer').first()).toBeVisible();

    const submitted = log.find((r) => r.method === 'POST' && r.url.endsWith('/jobs/1/apply'));
    expect(submitted).toBeTruthy();
    expect(submitted?.body).toMatchObject({
      fullName: 'Priya Patel',
      email: 'priya@example.com',
      phone: '9876543210',
      resumeFileName: 'priya-patel-cv.pdf',
    });
  });

  test('the confirmation links on to the applications list and back to search', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Review application' }).click();
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('heading', { name: 'Application submitted successfully' })).toBeVisible();

    await expect(page.getByRole('link', { name: 'Browse More Jobs' })).toHaveAttribute('href', '/jobs');
    await page.getByRole('link', { name: 'View My Applications' }).click();

    await expect(page).toHaveURL(/\/candidate\/applications$/);
    await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible({ timeout: 10_000 });
  });

  test('a duplicate application is reported as already applied, not as a generic failure', async ({ page }) => {
    await mockJobsApi(page, { applyStatus: 400 });
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Review application' }).click();
    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page.getByText('You have already applied to this job.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible();
  });

  test('a server error keeps the review stage so nothing typed is lost', async ({ page }) => {
    await mockJobsApi(page, { applyStatus: 500 });
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Review application' }).click();
    await page.getByRole('button', { name: 'Submit application' }).click();

    await expect(page.getByText('We could not submit your application. Please try again.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Review your application' })).toBeVisible();
  });

  test('Cancel goes back to the job rather than out of the flow', async ({ page }) => {
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');
    await expect(page.getByLabel('Full name')).toHaveValue('Priya Patel', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/jobs\/1$/);
    await expect(page.getByRole('heading', { name: 'Senior React Developer', level: 1 })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('a job that will not load shows an error instead of an empty form', async ({ page }) => {
    await mockJobsApi(page, { detail: null });
    await page.goto('/jobs/1/apply');

    await expect(page.getByText('We could not load this job.')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Apply to a job — candidate with an empty profile', () => {
  test('renders a blank form with no pre-fill promise', async ({ page }) => {
    await mockCandidateSession(page, {
      // The API sends null, not '', for a candidate who has uploaded nothing.
      profile: { fullName: '', email: '', mobile: '', totalExperience: '', city: '', resumeFileName: null },
    });
    await mockJobsApi(page);
    await page.goto('/jobs/1/apply');

    await expect(page.getByRole('heading', { name: 'Apply — Senior React Developer' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/pre-filled details from your profile/i)).toHaveCount(0);
    await expect(page.getByLabel('Full name')).toHaveValue('');
    await expect(page.getByText('No file selected')).toBeVisible();
  });
});
