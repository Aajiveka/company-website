import { test, expect } from '@playwright/test';
import { json, type RequestLog, recordRequest } from './support/mocks';
import { mockQC2Session, mockEmployerSession } from './support/auth-helpers';
import { DOCUMENT_ROW } from './support/recruitment-fixtures';
import { APPLICANT_DETAIL } from './support/employer-fixtures';

test.use({ serviceWorkers: 'block' });

/**
 * Document Verification — Gap 8.
 * QC route: /recruitment/documents
 * Employer route: /company/applicants/:id (documents section)
 */

test.describe('QC Document Review', () => {
  test.beforeEach(async ({ page }) => {
    await mockQC2Session(page);
  });

  test('renders document review table with status badges', async ({ page }) => {
    const docs = [
      { ...DOCUMENT_ROW, documentId: 1, status: 'Pending' as const },
      { ...DOCUMENT_ROW, documentId: 2, document: 'PAN Card', status: 'Verified' as const },
      { ...DOCUMENT_ROW, documentId: 3, document: 'Marksheet', status: 'Rejected' as const },
    ];
    await page.route('**/api/recruitment/documents*', (route) => route.fulfill(json(docs)));

    await page.goto('/recruitment/documents');

    await expect(page.getByRole('heading', { name: 'Document Verification' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Aadhaar Card')).toBeVisible();
    await expect(page.getByText('PAN Card')).toBeVisible();
    await expect(page.getByText('Marksheet')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
    await expect(page.getByText('Verified')).toBeVisible();
    await expect(page.getByText('Rejected').first()).toBeVisible();
  });

  test('empty state shows message', async ({ page }) => {
    await page.route('**/api/recruitment/documents*', (route) => route.fulfill(json([])));

    await page.goto('/recruitment/documents');

    await expect(page.getByText('No documents to review.')).toBeVisible({ timeout: 10_000 });
  });

  test('verify button sends correct payload', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/recruitment/documents/review', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ success: true }));
    });
    await page.route('**/api/recruitment/documents', (route) =>
      route.fulfill(json([{ ...DOCUMENT_ROW, documentId: 1, status: 'Pending' }])),
    );

    await page.goto('/recruitment/documents');
    await expect(page.getByText('Aadhaar Card')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Verify' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ documentId: 1, status: 'Verified' });
  });

  test('reject button sends correct payload', async ({ page }) => {
    const log: RequestLog[] = [];
    await page.route('**/api/recruitment/documents/review', (route) => {
      recordRequest(log, route);
      return route.fulfill(json({ success: true }));
    });
    await page.route('**/api/recruitment/documents', (route) =>
      route.fulfill(json([{ ...DOCUMENT_ROW, documentId: 1, status: 'Pending' }])),
    );

    await page.goto('/recruitment/documents');
    await expect(page.getByText('Aadhaar Card')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Reject' }).click();

    const posted = log.find((r) => r.method === 'POST');
    expect(posted).toBeTruthy();
    expect(posted?.body).toMatchObject({ documentId: 1, status: 'Rejected' });
  });

  test('a failed review says so instead of silently doing nothing', async ({ page }) => {
    await page.route('**/api/recruitment/documents/review', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/api/recruitment/documents', (route) =>
      route.fulfill(json([{ ...DOCUMENT_ROW, documentId: 1, status: 'Pending' }])),
    );

    await page.goto('/recruitment/documents');
    await expect(page.getByText('Aadhaar Card')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Verify' }).click();

    // It used to have no onError at all: the row stayed Pending and nothing was said.
    await expect(page.getByText('Something went wrong')).toBeVisible();
  });

  test('a failed list offers a retry rather than reading as an empty queue', async ({ page }) => {
    await page.route('**/api/recruitment/documents', (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/recruitment/documents');

    await expect(page.getByText('Could not load this list')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByText('No documents to review.')).toHaveCount(0);
  });

  test('action buttons hidden for already-reviewed documents', async ({ page }) => {
    await page.route('**/api/recruitment/documents*', (route) =>
      route.fulfill(json([{ ...DOCUMENT_ROW, documentId: 2, status: 'Verified' }])),
    );

    await page.goto('/recruitment/documents');
    await expect(page.getByText('Aadhaar Card')).toBeVisible({ timeout: 10_000 });

    // No Verify/Reject buttons for already-reviewed docs
    await expect(page.getByRole('button', { name: 'Verify' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);
    await expect(page.getByText('Reviewed')).toBeVisible();
  });
});

test.describe('Employer Document Review', () => {
  test.beforeEach(async ({ page }) => {
    await mockEmployerSession(page);
  });

  test('employer sees applicant documents', async ({ page }) => {
    await page.route('**/api/clients/me/applicants/1', (route) =>
      route.fulfill(json(APPLICANT_DETAIL)),
    );
    await page.route('**/api/clients/me/applicants/1/notes', (route) =>
      route.fulfill(json({ notes: [] })),
    );
    await page.route('**/api/clients/me/applicants/1/documents', (route) =>
      route.fulfill(json([
        { docUploadId: 1, documentName: 'Aadhaar Card', status: 'Uploaded', uploadedAt: '2026-08-20T10:00:00.000Z' },
      ])),
    );
    await page.route('**/api/recruitment/interview-rounds/**', (route) =>
      route.fulfill(json([])),
    );

    await page.goto('/company/applicants/1');

    await expect(page.getByText('Ravi Kumar')).toBeVisible({ timeout: 10_000 });
  });
});
