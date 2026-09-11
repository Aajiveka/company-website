import { test, expect, type Page } from '@playwright/test';
import { mockCandidateSession, CV_MASTERS, json } from './support/mocks';

// page.route() only sees traffic when MSW's service worker is off.
test.use({ serviceWorkers: 'block' });

/**
 * The wizard's long dropdowns, in a real browser.
 *
 * The shared fixtures carry one city and one sub-function each, which keeps every field a
 * native <select> — so none of the other specs ever exercise the searchable path. These
 * specs stand up master lists the size of the real ones (1,566 sub-functions, 764 districts)
 * and drive the three fields the production data makes unusable without search.
 */

/** Masters at production scale, so `Select` renders its searchable shape rather than a <select>. */
const BIG_MASTERS = {
  ...CV_MASTERS,
  states: [
    { id: 1, label: 'Maharashtra' },
    { id: 5, label: 'Bihar' },
    { id: 29, label: 'Kerala' },
  ],
  cities: [
    { id: 1, label: 'Pune', stateId: 1 },
    { id: 2, label: 'Mumbai', stateId: 1 },
    { id: 3, label: 'Nagpur', stateId: 1 },
    { id: 4, label: 'Patna', stateId: 5 },
    { id: 5, label: 'Gaya', stateId: 5 },
    { id: 6, label: 'Punalur', stateId: 29 },
    { id: 7, label: 'Kochi', stateId: 29 },
    { id: 8, label: 'Kollam', stateId: 29 },
    { id: 9, label: 'Thrissur', stateId: 29 },
    { id: 10, label: 'Kannur', stateId: 29 },
    { id: 11, label: 'Alappuzha', stateId: 29 },
    { id: 12, label: 'Kozhikode', stateId: 29 },
  ],
  subFunctions: [
    { id: 1, label: 'Software Development' },
    { id: 2, label: 'Agency Manager' },
    { id: 3, label: 'Travel Agency Coordinator' },
    // Filler, so the list is unambiguously past the threshold.
    ...Array.from({ length: 30 }, (_, i) => ({ id: 100 + i, label: `Department ${i + 1}` })),
  ],
};

async function openWizard(page: Page) {
  await mockCandidateSession(page);
  // Registered after the session mock so it wins — Playwright runs the newest handler first.
  await page.route('**/api/candidates/me/cv-masters**', (route) => route.fulfill(json(BIG_MASTERS)));
  await page.goto('/candidate/onboarding');
  await page.waitForLoadState('networkidle');
}

test.describe('Searchable dropdowns', () => {
  test('Function / Department filters as you type instead of scrolling 1,500 rows', async ({ page }) => {
    await openWizard(page);

    const field = page.getByLabel('Function / Department');
    await field.click();

    const search = page.getByPlaceholder('Search...');
    await search.fill('agency');

    // Scoped to the open panel: the page's native <select>s own <option> elements too.
    const options = page.getByRole('listbox').getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toHaveText('Agency Manager');

    await options.first().click();
    await expect(field).toHaveText(/Agency Manager/);
    await expect(field).toHaveAttribute('data-value', '2');
  });

  // Opening and then typing has to just work — if focus stays on the trigger, the keystrokes
  // go nowhere and the search box may as well not be there.
  test('lands focus in the search box, so typing filters straight away', async ({ page }) => {
    await openWizard(page);

    await page.getByLabel('Function / Department').click();
    const search = page.getByPlaceholder('Search...');
    await expect(search).toBeFocused();

    await page.keyboard.type('agen');
    await expect(search).toHaveValue('agen');
    await expect(page.getByRole('listbox')).toBeVisible();
  });

  test('Current Location flattens the state tree to "city, state" matches', async ({ page }) => {
    await openWizard(page);

    // The picker names itself from its placeholder — the visible "Current Location" caption
    // is a Field label with no htmlFor, so it is not the control's accessible name.
    await page.getByRole('button', { name: 'Select your city' }).click();

    // Closed tree first: states are on offer, individual cities are not.
    await expect(page.getByRole('group', { name: 'Kerala' })).toBeVisible();
    await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(0);

    await page.getByPlaceholder('Search...').fill('pun');

    const options = page.getByRole('listbox').getByRole('option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Pune');
    await expect(options.first()).toContainText('Maharashtra');
    await expect(options.nth(1)).toContainText('Punalur');
    await expect(options.nth(1)).toContainText('Kerala');
  });

  test('a short list keeps the plain native select', async ({ page }) => {
    await openWizard(page);

    // Gender is three options — it must not have grown a search box.
    const gender = page.getByLabel('Gender');
    await expect(gender).toHaveJSProperty('tagName', 'SELECT');
  });
});
