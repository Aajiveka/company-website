/**
 * Shapes of the `/q3/*` API (Figma "Q3" page). Mirrors apps/api/src/modules/q3 and
 * apps/api/src/shared/hiring.ts — every application is keyed by `mapId`
 * (JobSubscriberMapID), because the same candidate can be at different stages with
 * different companies.
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

export type PipelineTab =
  | 'all'
  | 'Referred'
  | 'CompanyReview'
  | 'Scheduling'
  | 'Interview'
  | 'Decision'
  | 'Documents'
  | 'Offer';

export type InterviewMode = 'Virtual' | 'Telephonic' | 'Face-to-Face' | 'Walk-in';
export type ContactChannel = 'Call' | 'Mail' | 'WhatsApp';
export type ReturnReason = 'CV missing' | 'Incomplete profile' | 'Role mismatch' | 'Duplicate referral';
export type RoundDecision = 'NextRound' | 'FinalRound' | 'Hold' | 'Rejected' | 'Selected';
export type RoundStatus = 'Pending' | 'Scheduled' | 'Completed' | 'Cancelled' | 'NoShow' | 'RescheduleRequested';
export type InterviewPill =
  | 'Confirmed'
  | 'StartingSoon'
  | 'InProgress'
  | 'AwaitingResult'
  | 'Decided'
  | 'NoShow'
  | 'RescheduleAsked';
export type DocumentState = 'Missing' | 'Uploaded' | 'Verified' | 'NeedsCorrection';
export type CompanyReviewState = 'InReview' | 'Expiring' | 'Shortlisted' | 'SlotsAwaited' | 'AutoExpired';
export type CompanyReviewTab = 'all' | 'inReview' | 'shortlisted' | 'expiring' | 'expired';
export type ReturnedTab = 'all' | 'awaiting' | 'expired' | 'returned';
export type Q2ReturnState = 'Awaiting' | 'Acknowledged' | 'ReReferred';

export interface Q3Candidate {
  subscriberId: number;
  name: string;
  designation: string;
  totalExp: number | null;
  currentEmployer: string;
  location: string;
  email: string;
  phone: string;
  hasCv: boolean;
  contactVerified: boolean;
}

export interface Interviewer {
  name: string;
  title?: string;
  email?: string;
}

export interface Q3Slot {
  slotId: number;
  at: string;
  isSelected: boolean;
  isUnavailable: boolean;
}

export interface Q3Round {
  roundId: number;
  roundNumber: number;
  isFinal: boolean;
  /** "R1", "R2", "R3", "Final" */
  label: string;
  roundName: string | null;
  status: RoundStatus;
  pill: InterviewPill;
  mode: InterviewMode | null;
  meetingLink: string | null;
  durationMins: number;
  scheduledAt: string | null;
  conductedAt: string | null;
  resultDueAt: string | null;
  decision: RoundDecision | null;
  decidedAt: string | null;
  decisionMailSentAt: string | null;
  companyFeedback: string | null;
  slotsSharedAt: string | null;
  slotsRequestedAt: string | null;
  invitesSentAt: string | null;
  reminderSentAt: string | null;
  candidateConfirmedAt: string | null;
  candidateJoinedAt: string | null;
  interviewers: Interviewer[];
  hr: { name: string; title: string | null; email: string | null } | null;
  slots: Q3Slot[];
}

export interface Q3NavCounts {
  referred: number;
  companyReview: number;
  scheduling: number;
  interviews: number;
  decisions: number;
  documents: number;
  offers: number;
  returned: number;
}

/** The NEXT DUE column — rendered by `nextDueLines` in q3.format.ts. */
export type NextDue =
  | { kind: 'awaitingValidation'; at: string }
  | { kind: 'reviewDay'; day: number; daysLeft: number; expiresAt: string | null }
  | { kind: 'slotsAwaited'; since: string | null }
  | { kind: 'slotPending'; attempts: number }
  | { kind: 'noShow' }
  | { kind: 'rescheduleAsked' }
  | { kind: 'interviewAt'; at: string; mode: string | null; link: string | null }
  | { kind: 'resultOverdue'; days: number }
  | { kind: 'resultDue'; at: string | null }
  | { kind: 'onHold'; since: string | null }
  | { kind: 'docsMissing'; count: number; requestedAt: string | null }
  | { kind: 'docsToVerify'; count: number }
  | { kind: 'docsWithCompany'; at: string | null }
  | { kind: 'generateOffer' }
  | { kind: 'offerSent'; at: string | null }
  | { kind: 'joins'; at: string | null }
  | { kind: 'joined'; at: string | null }
  | { kind: 'expired' }
  | { kind: 'returned'; reason: string | null; at: string | null }
  | { kind: 'rejected' };

export interface PipelineRow {
  mapId: number;
  referralId: number;
  subscriberId: number;
  name: string;
  designation: string;
  company: string;
  jobTitle: string;
  stage: HiringStage;
  round: string | null;
  stageDetail: 'AwaitingResult' | 'OnHold' | 'OfferAccepted' | 'Joined' | 'Rejected' | null;
  next: NextDue;
  dueAt: number;
}

export interface PipelinePage {
  total: number;
  companies: string[];
  rows: PipelineRow[];
}

export type DashboardAction =
  | { kind: 'contactForSlot'; mapId: number; roundId: number; name: string; phone: string; company: string; slots: number; attempts: number }
  | { kind: 'sendDecisionMail'; mapId: number; roundId: number; name: string; company: string; round: string; decision: RoundDecision }
  | { kind: 'decisionOverdue'; mapId: number; roundId: number; name: string; company: string; round: string; daysLate: number }
  | { kind: 'verifyDocs'; mapId: number; name: string; count: number; documents: string[] }
  | { kind: 'autoExpired'; count: number };

export interface Q3Dashboard {
  kpis: {
    referred: { value: number };
    companyReview: { value: number; expiring: number };
    interviewsWeek: { value: number; today: number };
    docsPending: { value: number; reRequested: number };
  };
  actions: DashboardAction[];
}

export interface QueueItem {
  mapId: number;
  name: string;
  company: string;
  round: string | null;
  stage: HiringStage;
}

// ── 02 · Referred CVs ──

export interface ReferredRow {
  referralId: number;
  mapId: number;
  name: string;
  designation: string;
  totalExp: number | null;
  hasCv: boolean;
  contactVerified: boolean;
  profileCompleteness: number;
}

export interface ReferralBatch {
  batchId: string;
  jobId: number;
  company: string;
  jobTitle: string;
  referredBy: string;
  referredAt: string;
  rows: ReferredRow[];
}

// ── 03 · Company Review ──

export interface CompanyReviewRow {
  mapId: number;
  referralId: number;
  name: string;
  designation: string;
  company: string;
  forwardedAt: string | null;
  day: number;
  daysLeft: number;
  state: CompanyReviewState;
}

export interface CompanyReviewPage {
  counts: Record<CompanyReviewTab, number>;
  rows: CompanyReviewRow[];
}

export interface Shortlist {
  mapId: number;
  referralStatus: string;
  shortlistedAt: string | null;
  forwardedAt: string | null;
  day: number | null;
  company: string;
  candidate: { name: string; designation: string; totalExp: number | null };
  round: Q3Round | null;
}

export interface RoundSetupInput {
  roundId?: number;
  roundName?: string;
  interviewers: Interviewer[];
  hrName?: string;
  hrTitle?: string;
  hrEmail?: string;
  slots: string[];
  mode: InterviewMode;
  durationMins?: number;
}

// ── 04 · Slot Scheduling ──

export interface Scheduling {
  mapId: number;
  stage: HiringStage;
  candidate: Q3Candidate;
  company: string;
  jobTitle: string;
  officeAddress: string;
  shortlisted: boolean;
  round: Q3Round | null;
  steps: { companyShared: boolean; contacted: boolean; confirmed: boolean; invitesSent: boolean };
  contactLog: Array<{ id: number; channel: ContactChannel | null; note: string; at: string }>;
  recipients: { candidate: string; interviewers: string[]; hr: string | null; q3: string };
}

export interface Recipients {
  candidate: boolean;
  interviewers: boolean;
  hr: boolean;
  q3: boolean;
}

// ── 04b · Interviews ──

export interface InterviewRow {
  mapId: number;
  name: string;
  designation: string;
  company: string;
  jobTitle: string;
  isLatest: boolean;
  round: Q3Round;
}

export interface InterviewsWeek {
  weekStart: string;
  weekEnd: string;
  kpis: {
    today: { value: number; nextAt: string | null; who: string[] };
    week: { value: number; range: string | null; companies: number };
    awaiting: { value: number; overdue: number };
    needsReschedule: { value: number; noShow: number };
  };
  rows: InterviewRow[];
  upNext: (InterviewRow & { phone: string; email: string; officeAddress: string }) | null;
  companies: string[];
}

// ── 05 · Interview Rounds ──

export interface RoundsDetail {
  mapId: number;
  stage: HiringStage;
  candidate: Q3Candidate & { maskedEmail: string | null };
  company: string;
  jobTitle: string;
  overdueDays: number;
  canRecord: boolean;
  latestRoundId: number | null;
  hasFinal: boolean;
  selected: boolean;
  rounds: Array<Q3Round & { lastNudgeAt: string | null }>;
}

// ── 06 · Documents & Offer ──

export interface Q3Document {
  documentTypeId: number;
  name: string;
  state: DocumentState;
  docUploadId: number | null;
  fileName: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  comment: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  canPreview: boolean;
}

export interface DocumentsDetail {
  mapId: number;
  stage: HiringStage;
  candidate: Q3Candidate;
  company: string;
  jobTitle: string;
  roundLabel: string | null;
  selectedAt: string | null;
  docsRequestedAt: string | null;
  docsDueAt: string | null;
  docsForwardedAt: string | null;
  docsApprovedAt: string | null;
  joinedAt: string | null;
  /** 1 Uploaded … 8 Joining */
  step: number;
  counts: { total: number; verified: number };
  documents: Q3Document[];
  offer: {
    offerId: number;
    status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
    generatedAt: string;
    sentAt: string | null;
    respondedAt: string | null;
    joiningDate: string | null;
    designation: string;
    ctc: string | null;
  } | null;
}

// ── 07 · Returned to Q2 ──

export interface ReturnedRow {
  referralId: number;
  mapId: number;
  name: string;
  designation: string;
  company: string;
  jobTitle: string;
  returnedAt: string;
  expired: boolean;
  reason: string;
  note: string | null;
  mailSentAt: string | null;
  q2: Q2ReturnState;
}

export interface ReturnedPage {
  kpis: {
    awaiting: { value: number; today: number };
    expired: { value: number };
    returnedAtValidation: { value: number };
  };
  counts: Record<ReturnedTab, number>;
  rows: ReturnedRow[];
}

export interface ReturnMail {
  referralId: number;
  to: { name: string; email: string | null };
  sentAt: string | null;
  candidate: string;
  company: string;
  jobTitle: string;
  reason: string;
  note: string | null;
  q2: Q2ReturnState;
}
