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
  /** Interview coordination — contacts candidates, sends round results,
   *  forwards documents to company. */
  Q3: 7,
} as const;

export type RoleId = (typeof Role)[keyof typeof Role];

export const ROLE_LABEL: Record<RoleId, string> = {
  [Role.Subscriber]: 'Candidate',
  [Role.QC1]: 'QC1',
  [Role.QC2]: 'QC2',
  [Role.Client]: 'Employer',
  [Role.Admin]: 'Admin',
  [Role.Subscription]: 'Subscription',
  [Role.Q3]: 'Q3',
};

/** Landing route per role, mirroring the reference `fnLogin_pass` redirects. */
export const ROLE_HOME: Record<RoleId, string> = {
  [Role.Subscriber]: '/candidate/profile',
  [Role.QC1]: '/q1/dashboard',
  [Role.QC2]: '/recruitment/candidates',
  [Role.Client]: '/company',
  [Role.Admin]: '/admin',
  [Role.Subscription]: '/pricing',
  [Role.Q3]: '/recruitment/q3',
};
