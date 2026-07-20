/** Role ids — identical mapping to the web app and spSecUserLogin. */
export const Role = {
  Subscriber: 1,
  QC1: 2,
  QC2: 3,
  Client: 4,
  Admin: 5,
  Subscription: 6,
} as const;

export type RoleId = (typeof Role)[keyof typeof Role];
