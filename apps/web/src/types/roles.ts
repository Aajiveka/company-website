/**
 * Role ids mirror the reference `spSecUserLogin` / `fnLogin_pass` mapping.
 */
export const Role = {
  Subscriber: 1, // candidate
  QC1: 2,
  QC2: 3,
  Client: 4, // company
  Admin: 5,
  Subscription: 6,
} as const;

export type RoleId = (typeof Role)[keyof typeof Role];

export const ROLE_LABEL: Record<RoleId, string> = {
  [Role.Subscriber]: 'Candidate',
  [Role.QC1]: 'QC1',
  [Role.QC2]: 'QC2',
  [Role.Client]: 'Employer',
  [Role.Admin]: 'Admin',
  [Role.Subscription]: 'Subscription',
};

/** Landing route per role, mirroring the reference `fnLogin_pass` redirects. */
export const ROLE_HOME: Record<RoleId, string> = {
  [Role.Subscriber]: '/candidate/profile',
  [Role.QC1]: '/recruitment/candidates',
  [Role.QC2]: '/recruitment/candidates',
  [Role.Client]: '/company/profile',
  [Role.Admin]: '/company/profile',
  [Role.Subscription]: '/pricing',
};
