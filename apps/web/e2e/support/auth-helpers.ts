import type { Page } from '@playwright/test';
import { json } from './mocks';

/**
 * Per-role session helpers that follow the exact pattern from mockCandidateSession() in mocks.ts.
 * Each sets the refresh token in localStorage, then mocks /auth/refresh, /auth/me, and
 * /api/notifications/** to prevent SSE hangs.
 */

interface SessionUser {
  userId: number;
  fullName: string;
  roleId: number;
  isOnboarded?: boolean;
}

async function mockSession(page: Page, user: SessionUser) {
  await page.addInitScript(() => localStorage.setItem('aaj.refresh', 'fake-refresh-token'));

  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill(json({ accessToken: 'fake-access', refreshToken: 'fake-refresh-token' })),
  );
  await page.route('**/api/auth/me', (route) =>
    route.fulfill(json({ ...user, isOnboarded: user.isOnboarded ?? true })),
  );
  await page.route('**/api/notifications/**', (route) => route.fulfill(json([])));
}

export function mockAdminSession(page: Page) {
  return mockSession(page, { userId: 1, fullName: 'Admin User', roleId: 5 });
}

export function mockEmployerSession(page: Page) {
  return mockSession(page, { userId: 20, fullName: 'Test Employer', roleId: 4 });
}

export function mockQC1Session(page: Page) {
  return mockSession(page, { userId: 30, fullName: 'QC1 User', roleId: 2 });
}

export function mockQC2Session(page: Page) {
  return mockSession(page, { userId: 40, fullName: 'QC2 User', roleId: 3 });
}

export function mockQ3Session(page: Page) {
  return mockSession(page, { userId: 50, fullName: 'Q3 User', roleId: 7 });
}
