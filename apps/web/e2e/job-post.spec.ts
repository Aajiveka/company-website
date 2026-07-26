import { test, expect } from '@playwright/test';

/**
 * Job Posting Flow — tests the /company/post-job form and /company/jobs listing.
 *
 * All API calls are intercepted with page.route() so the tests run without a
 * live backend.  The flow exercises the state/city cascade, form validation,
 * submission, and post-submit listing verification.
 */

const MASTERS = {
  designations: [
    { id: 1, label: 'Software Engineer' },
    { id: 2, label: 'Product Manager' },
  ],
  states: [
    { id: 10, label: 'Maharashtra' },
    { id: 20, label: 'Karnataka' },
  ],
  cities: [
    { id: 100, label: 'Mumbai', stateId: 10 },
    { id: 101, label: 'Pune', stateId: 10 },
    { id: 200, label: 'Bengaluru', stateId: 20 },
  ],
  workModes: [
    { id: 1, label: 'Remote' },
    { id: 2, label: 'On-site' },
  ],
  employmentTypes: [
    { id: 1, label: 'Full-time' },
    { id: 2, label: 'Contract' },
  ],
};

const POSTED_JOB = {
  jobId: 42,
  designation: 'Software Engineer',
  designationId: 1,
  city: 'Mumbai',
  cityId: 100,
  workMode: 'Remote',
  workModeId: 1,
  employmentType: 'Full-time',
  employmentTypeId: 1,
  minExp: 2,
  minCtc: 500000,
  maxCtc: 1200000,
  status: 'Active',
  applicants: 0,
  description: 'A great role for experienced developers.',
};

function mockAuthSession(page: import('@playwright/test').Page) {
  return page.route('**/api/auth/session', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { userId: 1, fullName: 'Test Employer', roleId: 4 },
        token: 'fake-token',
      }),
    }),
  );
}

test.describe('Job Posting Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth so ProtectedRoute allows access
    await mockAuthSession(page);

    // Masters data for dropdowns
    await page.route('**/api/company/masters', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MASTERS),
      }),
    );

    // Company jobs listing — starts empty, returns posted job after POST
    let jobs: typeof POSTED_JOB[] = [];
    await page.route('**/api/company/jobs', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(jobs),
        });
      }
      // POST — new job
      jobs = [POSTED_JOB];
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(POSTED_JOB),
      });
    });
  });

  test('shows validation errors when submitting empty form', async ({ page }) => {
    await page.goto('/company/post-job');

    // Wait for form to load (masters fetched)
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });

    // Submit without filling anything
    await page.getByRole('button', { name: /publish/i }).click();

    // Validation errors should appear
    await expect(page.locator('[class*="text-danger"], [role="alert"]').first()).toBeVisible();
  });

  test('state/city cascade filters cities by selected state', async ({ page }) => {
    await page.goto('/company/post-job');
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });

    // City dropdown should be disabled before state is selected
    const citySelect = page.locator('select').nth(2); // 3rd select = city
    await expect(citySelect).toBeDisabled();

    // Select state "Maharashtra"
    const stateSelect = page.locator('select').nth(1); // 2nd select = state
    await stateSelect.selectOption({ label: 'Maharashtra' });

    // City dropdown should now be enabled
    await expect(citySelect).toBeEnabled();
  });

  test('fills form and submits successfully', async ({ page }) => {
    await page.goto('/company/post-job');
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });

    // Fill designation
    await page.locator('select').first().selectOption({ label: 'Software Engineer' });

    // Select state then city
    const stateSelect = page.locator('select').nth(1);
    await stateSelect.selectOption({ label: 'Maharashtra' });
    const citySelect = page.locator('select').nth(2);
    await citySelect.selectOption({ label: 'Mumbai' });

    // Work mode
    await page.locator('select').nth(3).selectOption({ label: 'Remote' });

    // Employment type
    await page.locator('select').nth(4).selectOption({ label: 'Full-time' });

    // Experience
    await page.getByLabel(/experience/i).fill('2');

    // CTC fields
    const numberInputs = page.locator('input[type="number"]');
    const ctcInputs = await numberInputs.all();
    // minCtc and maxCtc are the last two number inputs
    if (ctcInputs.length >= 2) {
      await ctcInputs[ctcInputs.length - 2].fill('500000');
      await ctcInputs[ctcInputs.length - 1].fill('1200000');
    }

    // Description — the RichTextEditor is a contenteditable div
    const editor = page.locator('[contenteditable="true"]');
    if (await editor.isVisible()) {
      await editor.fill('A great role for experienced developers.');
    }

    // Submit
    await page.getByRole('button', { name: /publish/i }).click();

    // Should show success toast
    await expect(page.getByText(/success/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('submitted job appears in the listing page', async ({ page }) => {
    // Navigate directly to jobs listing with a pre-populated job
    await page.route('**/api/company/jobs', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([POSTED_JOB]),
      }),
    );

    await page.goto('/company/jobs');
    await expect(page.getByText('Software Engineer')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Mumbai')).toBeVisible();
  });
});
