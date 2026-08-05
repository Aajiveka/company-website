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
  // QC staff share the admin door — they have no navbar entry of their own and the
  // reference app treated them as back-office users.
  admin: { roles: [Role.Admin, Role.QC1, Role.QC2], labelKey: 'nav.adminLogin' },
} as const satisfies Record<string, { roles: readonly RoleId[]; labelKey: string }>;

export type LoginPortal = keyof typeof LOGIN_PORTALS;

/** Order the portals appear in the navbar dropdown. */
export const LOGIN_PORTAL_ORDER: LoginPortal[] = ['candidate', 'employer', 'admin'];

/** Query param the navbar links carry, e.g. `/login?as=admin`. */
export const LOGIN_PORTAL_PARAM = 'as';

export function isLoginPortal(value: string | null): value is LoginPortal {
  return value !== null && value in LOGIN_PORTALS;
}

export function portalAllowsRole(portal: LoginPortal, roleId: RoleId): boolean {
  return (LOGIN_PORTALS[portal].roles as readonly RoleId[]).includes(roleId);
}
