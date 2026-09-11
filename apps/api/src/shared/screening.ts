/**
 * Q1's screening vocabulary (Figma "Q1 Flow").
 *
 * These are plain strings stored in tblSubscriberScreening.Status, not ids in
 * tblMstrJobMappingStatus. That master's ids 10 and 11 are seeded as "Interview passed to
 * candidate/Client" in db/seed but inserted as "On Hold"/"Need More Info" by the
 * figma_flow_gap_models migration — both ON CONFLICT DO NOTHING, so a restored production
 * database and a fresh dev one disagree about what those two ids mean. Keeping the screening
 * pipeline in its own string space means it cannot inherit that.
 */
export const ScreeningStatus = {
  NEW: 'New',
  SCREENING: 'Screening',
  INCOMPLETE: 'Incomplete',
  FOLLOW_UP: 'FollowUp',
  NO_RESPONSE: 'NoResponse',
  VERIFIED: 'Verified',
  NOT_INTERESTED: 'NotInterested',
} as const;

export type ScreeningStatusValue = (typeof ScreeningStatus)[keyof typeof ScreeningStatus];

export const SCREENING_STATUSES = Object.values(ScreeningStatus) as ScreeningStatusValue[];

/** The statuses the Figma's "Not Interested / Closed" card counts, and that leave the queue. */
export const CLOSED_STATUSES: ScreeningStatusValue[] = [ScreeningStatus.NOT_INTERESTED];

/** Statuses hidden from the daily queue: closed, parked, or already done. */
export const OFF_QUEUE_STATUSES: ScreeningStatusValue[] = [
  ScreeningStatus.FOLLOW_UP,
  ScreeningStatus.NO_RESPONSE,
  ScreeningStatus.VERIFIED,
  ScreeningStatus.NOT_INTERESTED,
];

export const ScreeningPriority = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' } as const;
export type ScreeningPriorityValue = (typeof ScreeningPriority)[keyof typeof ScreeningPriority];

/** Sort weight for "sorted by priority" — High first. */
export const PRIORITY_RANK: Record<ScreeningPriorityValue, number> = { High: 0, Medium: 1, Low: 2 };

export const CONTACT_CHANNELS = ['Call', 'WhatsApp', 'Email', 'Message'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const CONTACT_KINDS = ['Contact', 'ProfileUpdateRequest', 'CvRequest'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const FOLLOW_UP_TIMES = ['Morning (10–12)', 'Afternoon (12–4)', 'Evening (4–7)'] as const;

/**
 * The seven checklist items on the Q1 Initial Screening rail, in the order the design lists
 * them. The key is the column suffix on tblSubscriberScreening.
 */
export const CHECKLIST_ITEMS = [
  'nameVerified',
  'cvAvailable',
  'designationVerified',
  'experienceChecked',
  'educationChecked',
  'skillsReviewed',
  'locationVerified',
] as const;

export type ChecklistKey = (typeof CHECKLIST_ITEMS)[number];

/** `nameVerified` -> `chkNameVerified`, the Prisma field. */
export const checklistColumn = (k: ChecklistKey) => `chk${k[0].toUpperCase()}${k.slice(1)}` as const;

/**
 * Priority as the designs show it: anything already closed or parked is Low, an active
 * candidate with a strong profile is High, everyone else Medium. Derived rather than typed in
 * — there is no priority input anywhere in the Q1 screens — but stored, so the queue can sort
 * on it in SQL.
 */
export function derivePriority(
  completeness: number,
  status: ScreeningStatusValue,
): ScreeningPriorityValue {
  if (OFF_QUEUE_STATUSES.includes(status)) return ScreeningPriority.LOW;
  return completeness >= 80 ? ScreeningPriority.HIGH : ScreeningPriority.MEDIUM;
}
