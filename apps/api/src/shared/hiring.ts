/**
 * Q3's hiring-ops vocabulary (Figma "Q3" page).
 *
 * Q3 sits between Q2 and the hiring company: it forwards referred CVs, tracks the company's
 * 14-day review, coordinates interview slots, records each round's decision, collects
 * documents and closes the offer. Everything is keyed by JobSubscriberMapID — an application —
 * because the same candidate can be at different stages with different companies.
 *
 * Like Q1's and Q2's statuses these are plain strings, not ids in tblMstrJobMappingStatus (see
 * the note in matching.ts). The shared pipeline still moves: each Q3 step also writes the
 * JobMapStatus the rest of the app reads (SENT_TO_COMPANY, INTERVIEW_R1…, OFFER_SENT, JOINED).
 */

/** "Track the 14-day review window" — Day 1 is the day the CV is forwarded. */
export const REVIEW_WINDOW_DAYS = 14;

/** "Expiring ≤ 2 days". */
export const EXPIRING_WITHIN_DAYS = 2;

/**
 * How long the company has to report a round's result once it is conducted. Nothing in the
 * designs captures a promised date, so this is the default the "Result overdue 1 day" pill is
 * measured against.
 */
export const RESULT_DUE_HOURS = 24;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Day boundaries are India Standard Time, explicitly. The API container runs in UTC, and a
 * "today" or "Day 6 / 14" that rolled over at 05:30 would disagree with the screen the
 * coordinator is looking at. IST has no daylight saving, so a fixed offset is exact.
 */
export const IST_OFFSET_MS = 330 * 60 * 1000;

/** Midnight IST on the day `d` falls on. */
export function startOfDay(d: Date) {
  const t = d.getTime() + IST_OFFSET_MS;
  return new Date(Math.floor(t / DAY_MS) * DAY_MS - IST_OFFSET_MS);
}

/**
 * The IST calendar date `days` after the day `d` falls on, as a value for a `@db.Date`
 * column. Those keep only the UTC date part, so IST midnight (18:30 UTC the day before)
 * stored a due date one day early; this is UTC midnight of the intended date.
 */
export function istDateAfter(d: Date, days: number) {
  const istDay = Math.floor((d.getTime() + IST_OFFSET_MS) / DAY_MS);
  return new Date((istDay + days) * DAY_MS);
}

/** Monday 00:00 IST of the week `d` falls in — the Interviews screen's "This week". */
export function startOfWeek(d: Date) {
  const day = startOfDay(d);
  const weekday = new Date(day.getTime() + IST_OFFSET_MS).getUTCDay(); // 0 = Sunday
  return new Date(day.getTime() - ((weekday + 6) % 7) * DAY_MS);
}

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY_MS);

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function calendarDaysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/**
 * Which day of the review window a forwarded CV is on: "Day 6 / 14". Day 1 is the forwarding
 * day itself, and the value is clamped to the window so an expired CV reads "Day 14 / 14".
 */
export function reviewDay(sentAt: Date, now = new Date()) {
  const day = calendarDaysBetween(sentAt, now) + 1;
  return Math.max(1, Math.min(REVIEW_WINDOW_DAYS, day));
}

/** "3 days left" — days remaining after today, never negative. */
export function reviewDaysLeft(sentAt: Date, now = new Date()) {
  return Math.max(0, REVIEW_WINDOW_DAYS - reviewDay(sentAt, now));
}

// ──────────────────────────────────────────────────────────────────────────
// Returning CVs to Q2
// ──────────────────────────────────────────────────────────────────────────

/** The Return CVs to Q2 modal's REASON chips, plus the processor's own reason. */
export const ReturnReason = {
  CV_MISSING: 'CV missing',
  INCOMPLETE_PROFILE: 'Incomplete profile',
  ROLE_MISMATCH: 'Role mismatch',
  DUPLICATE: 'Duplicate referral',
  AUTO_EXPIRED: 'Auto-expired',
} as const;

export type ReturnReasonValue = (typeof ReturnReason)[keyof typeof ReturnReason];

/** The reasons Q3 can pick by hand. Auto-expired is only ever set by the expiry processor. */
export const MANUAL_RETURN_REASONS: ReturnReasonValue[] = [
  ReturnReason.CV_MISSING,
  ReturnReason.INCOMPLETE_PROFILE,
  ReturnReason.ROLE_MISMATCH,
  ReturnReason.DUPLICATE,
];

/** The "Q2" column on Returned to Q2. */
export type Q2ReturnState = 'Awaiting' | 'Acknowledged' | 'ReReferred';

export function q2ReturnState(r: { q2AcknowledgedAt: Date | null; reReferredAt: Date | null }): Q2ReturnState {
  if (r.reReferredAt) return 'ReReferred';
  if (r.q2AcknowledgedAt) return 'Acknowledged';
  return 'Awaiting';
}

// ──────────────────────────────────────────────────────────────────────────
// Interview rounds
// ──────────────────────────────────────────────────────────────────────────

export const RoundStatus = {
  /** Created; waiting for the company's slots or for the candidate to pick one. */
  PENDING: 'Pending',
  /** Slot confirmed and invites sent. */
  SCHEDULED: 'Scheduled',
  /** Conducted; waiting for (or holding) the company's result. */
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'NoShow',
  RESCHEDULE_REQUESTED: 'RescheduleRequested',
} as const;

export type RoundStatusValue = (typeof RoundStatus)[keyof typeof RoundStatus];

/** The four options in the Record company decision modal, plus Selected after a final round. */
export const RoundDecision = {
  NEXT_ROUND: 'NextRound',
  FINAL_ROUND: 'FinalRound',
  HOLD: 'Hold',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
} as const;

export type RoundDecisionValue = (typeof RoundDecision)[keyof typeof RoundDecision];

/** What tblInterviewRound.Result keeps meaning for the readers that predate Q3. */
export const RESULT_FOR_DECISION: Record<RoundDecisionValue, 'Passed' | 'Failed' | 'Hold'> = {
  NextRound: 'Passed',
  FinalRound: 'Passed',
  Selected: 'Passed',
  Hold: 'Hold',
  Rejected: 'Failed',
};

/** "R1", "R2", "R3", "Final" — the ROUND column and the Interview Rounds stepper. */
export function roundLabel(r: { roundNumber: number; isFinal: boolean }) {
  return r.isFinal ? 'Final' : `R${r.roundNumber}`;
}

/** "Round 3", "Final Round". */
export function roundTitle(r: { roundNumber: number; isFinal: boolean }) {
  return r.isFinal ? 'Final Round' : `Round ${r.roundNumber}`;
}

/**
 * The designs offer Virtual, Telephonic, Face-to-Face and Walk-in. tblMstrInterviewMode
 * holds the first three as Video (3), Telephonic (2) and In-person (1); Walk-in (4) was added
 * by the q3_hiring_ops migration. The ids are what the database stores; these labels are what
 * every Q3 screen prints.
 */
export const INTERVIEW_MODES = [
  { id: 3, label: 'Virtual' },
  { id: 2, label: 'Telephonic' },
  { id: 1, label: 'Face-to-Face' },
  { id: 4, label: 'Walk-in' },
] as const;

export type InterviewModeLabel = (typeof INTERVIEW_MODES)[number]['label'];

export const INTERVIEW_MODE_LABELS = INTERVIEW_MODES.map((m) => m.label) as InterviewModeLabel[];

export function modeLabel(id: number | null | undefined): InterviewModeLabel | null {
  return INTERVIEW_MODES.find((m) => m.id === id)?.label ?? null;
}

export function modeId(label: string): number | null {
  return INTERVIEW_MODES.find((m) => m.label === label)?.id ?? null;
}

/** Face-to-Face and Walk-in get the office address instead of a meeting link. */
export const isInPersonMode = (id: number | null | undefined) => id === 1 || id === 4;

export interface Interviewer {
  name: string;
  title?: string;
  email?: string;
}

/** tblInterviewRound.Interviewers, tolerant of rows written before the column existed. */
export function parseInterviewers(r: {
  interviewers: string | null;
  interviewerName: string | null;
  interviewerEmail: string | null;
}): Interviewer[] {
  if (r.interviewers) {
    try {
      const parsed = JSON.parse(r.interviewers) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((x): x is Interviewer => !!x && typeof (x as Interviewer).name === 'string')
          .map((x) => ({ name: x.name, title: x.title ?? undefined, email: x.email ?? undefined }));
      }
    } catch {
      // Fall through to the single legacy pair.
    }
  }
  return r.interviewerName
    ? [{ name: r.interviewerName, email: r.interviewerEmail ?? undefined }]
    : [];
}

/**
 * The interview row's STATUS pill on the Interviews screen, which is a function of the round's
 * status *and* the clock: a scheduled round reads "Starts in 45 min" inside the hour before
 * it, and a conducted one reads "Awaiting result" until the company decides.
 */
export type InterviewPill =
  | 'Confirmed'
  | 'StartingSoon'
  | 'InProgress'
  | 'AwaitingResult'
  | 'Decided'
  | 'NoShow'
  | 'RescheduleAsked';

export const STARTING_SOON_MINUTES = 60;

export function interviewPill(
  r: { status: string; scheduledAt: Date | null; durationMins: number; decision: string | null },
  now = new Date(),
): InterviewPill {
  if (r.status === RoundStatus.NO_SHOW) return 'NoShow';
  if (r.status === RoundStatus.RESCHEDULE_REQUESTED) return 'RescheduleAsked';
  if (r.status === RoundStatus.COMPLETED) return r.decision ? 'Decided' : 'AwaitingResult';
  if (r.scheduledAt) {
    const start = r.scheduledAt.getTime();
    const mins = (start - now.getTime()) / 60_000;
    if (mins <= 0 && now.getTime() < start + r.durationMins * 60_000) return 'InProgress';
    if (mins > 0 && mins <= STARTING_SOON_MINUTES) return 'StartingSoon';
  }
  return 'Confirmed';
}

// ──────────────────────────────────────────────────────────────────────────
// Documents
// ──────────────────────────────────────────────────────────────────────────

/**
 * tblCandidateDocumentUploaded.flgStatus. 0, 1 and 2 are what candidates/recruitment already
 * wrote (uploaded / verified / rejected); 3 is the employer portal's "needs correction". A
 * document with no upload row is Missing.
 */
export type DocumentState = 'Missing' | 'Uploaded' | 'Verified' | 'NeedsCorrection';

export function documentState(flgStatus: number | null | undefined, uploaded: boolean): DocumentState {
  if (!uploaded) return 'Missing';
  if (flgStatus === 1) return 'Verified';
  if (flgStatus === 2 || flgStatus === 3) return 'NeedsCorrection';
  return 'Uploaded';
}

/**
 * What a selected candidate is asked for by default — the seven rows of the Documents & Offer
 * screen, by tblMstrDocuments id: Aadhaar (3), PAN (2), marksheets (7), degree (8),
 * internship certificate (9), passport-size photo (10) and bank details (11).
 */
export const DEFAULT_HIRING_DOCUMENTS = [3, 2, 7, 8, 9, 10, 11];

/** How long a candidate gets to upload once asked. */
export const DOCS_DUE_DAYS = 3;

// ──────────────────────────────────────────────────────────────────────────
// Activity log
// ──────────────────────────────────────────────────────────────────────────

export const Q3ActivityKind = {
  CONTACT: 'Contact',
  NUDGE: 'Nudge',
  REMINDER: 'Reminder',
  SLOT_REQUEST: 'SlotRequest',
  INVITES: 'Invites',
  DECISION_MAIL: 'DecisionMail',
  DOC_REQUEST: 'DocRequest',
  DOC_VERIFIED: 'DocVerified',
  DOC_SENT_BACK: 'DocSentBack',
  DOCS_FORWARDED: 'DocsForwarded',
  Q2_MAIL: 'Q2Mail',
} as const;

export type Q3ActivityKindValue = (typeof Q3ActivityKind)[keyof typeof Q3ActivityKind];

export const CONTACT_CHANNELS = ['Call', 'Mail', 'WhatsApp'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

// ──────────────────────────────────────────────────────────────────────────
// Pipeline stage
// ──────────────────────────────────────────────────────────────────────────

/**
 * The Candidate Pipeline's STAGE column and tabs. Every application Q3 has ever seen is in
 * exactly one of these, derived from the rows that already record its progress rather than
 * stored — so a stage can never disagree with the referral, round or offer behind it.
 */
export type HiringStage =
  | 'Referred'
  | 'CompanyReview'
  | 'Scheduling'
  | 'Interview'
  | 'Decision'
  | 'Documents'
  | 'Offer'
  | 'Returned'
  | 'Closed';

export interface StageFacts {
  referralStatus: string | null;
  rejected: boolean;
  joinedAt: Date | null;
  selectedAt: Date | null;
  docsApprovedAt: Date | null;
  offerStatus: string | null;
  /** The highest-numbered round, if any. */
  latestRound: { status: string; decision: string | null } | null;
}

export function stageOf(f: StageFacts): HiringStage {
  if (f.referralStatus === 'Returned' || f.referralStatus === 'Expired') return 'Returned';
  if (f.referralStatus === 'Referred') return 'Referred';
  if (f.rejected || f.offerStatus === 'Rejected') return 'Closed';
  if (f.joinedAt) return 'Closed';
  if (f.offerStatus || f.docsApprovedAt) return 'Offer';
  if (f.selectedAt) return 'Documents';

  const r = f.latestRound;
  if (!r) return 'CompanyReview';
  if (r.decision === RoundDecision.REJECTED) return 'Closed';
  switch (r.status) {
    case RoundStatus.SCHEDULED:
      return 'Interview';
    case RoundStatus.COMPLETED:
      return 'Decision';
    case RoundStatus.CANCELLED:
      return 'Closed';
    default:
      // Pending, NoShow, RescheduleRequested: someone has to find a slot.
      return 'Scheduling';
  }
}

/**
 * Company Review's STATUS pill for a forwarded CV. Shortlisted CVs stay on the tracker until
 * their first round is confirmed, so the "Slots awaited" state is visible to Q3.
 */
export type CompanyReviewState = 'InReview' | 'Expiring' | 'Shortlisted' | 'SlotsAwaited' | 'AutoExpired';

export function companyReviewState(
  r: { status: string; companyShortlistedAt: Date | null; sentToCompanyAt: Date | null },
  hasSlots: boolean,
  now = new Date(),
): CompanyReviewState {
  if (r.status === 'Expired') return 'AutoExpired';
  if (r.companyShortlistedAt) return hasSlots ? 'Shortlisted' : 'SlotsAwaited';
  if (r.sentToCompanyAt && reviewDaysLeft(r.sentToCompanyAt, now) <= EXPIRING_WITHIN_DAYS) {
    return 'Expiring';
  }
  return 'InReview';
}
