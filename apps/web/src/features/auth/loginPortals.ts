import { Role, type RoleId } from '@/types/roles';

/**
 * The navbar offers one login entry point per audience. They all post to the same
 * /auth/login, so the portal is purely a client-side gate: it picks the copy on the
 * login screen and decides which roles that screen is willing to sign in. Logging in
 * through the wrong door is rejected rather than silently redirected, which is what
 * makes "Admin Login" mean something.
 */
export const LOGIN_PORTALS = {
  candidate: { roles: [Role.Subscriber], labelKey: 'nav.candidateLogin' },
  employer: { roles: [Role.Client], labelKey: 'nav.employerLogin' },
  // One door per recruitment stage. These used to share the admin door; now that each has
  // its own, admin is narrowed to admins, which is the point of having separate doors.
  qc1: { roles: [Role.QC1], labelKey: 'nav.qc1Login' },
  qc2: { roles: [Role.QC2], labelKey: 'nav.qc2Login' },
  q3: { roles: [Role.Q3], labelKey: 'nav.q3Login' },
  admin: { roles: [Role.Admin], labelKey: 'nav.adminLogin' },
} as const satisfies Record<string, { roles: readonly RoleId[]; labelKey: string }>;

export type LoginPortal = keyof typeof LOGIN_PORTALS;

/** Order the portals appear in the navbar dropdown. */
export const LOGIN_PORTAL_ORDER: LoginPortal[] = [
  'candidate',
  'employer',
  'qc1',
  'qc2',
  'q3',
  'admin',
];

/** Query param the navbar links carry, e.g. `/login?as=admin`. */
export const LOGIN_PORTAL_PARAM = 'as';

export function isLoginPortal(value: string | null): value is LoginPortal {
  return value !== null && value in LOGIN_PORTALS;
}

export function portalAllowsRole(portal: LoginPortal, roleId: RoleId): boolean {
  return (LOGIN_PORTALS[portal].roles as readonly RoleId[]).includes(roleId);
}

/**
 * Back-office doors. These accounts are provisioned rather than self-registered, so those
 * screens drop the "register now" links and the OAuth buttons — OAuth returns its own
 * session and would slip past the portal's role check entirely.
 */
const STAFF_PORTALS = new Set<LoginPortal>(['qc1', 'qc2', 'q3', 'admin']);

export function isStaffPortal(portal: LoginPortal | null): boolean {
  return portal !== null && STAFF_PORTALS.has(portal);
}
