/** Shapes returned by /api/q1 — the Figma "Q1 Flow" workspace. */

export const SCREENING_STATUSES = [
  'New',
  'Screening',
  'Incomplete',
  'FollowUp',
  'NoResponse',
  'Verified',
  'NotInterested',
] as const;
export type ScreeningStatus = (typeof SCREENING_STATUSES)[number];

export type ScreeningPriority = 'High' | 'Medium' | 'Low';

/** The eight pill tabs, in the order the design lists them. */
export const QUEUE_TABS = [
  'all',
  'new',
  'screening',
  'incomplete',
  'follow-up',
  'no-response',
  'verified',
  'not-interested',
] as const;
export type QueueTab = (typeof QUEUE_TABS)[number];

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

export const CONTACT_CHANNELS = ['Call', 'WhatsApp', 'Email', 'Message'] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const FOLLOW_UP_TIMES = ['Morning (10–12)', 'Afternoon (12–4)', 'Evening (4–7)'] as const;

export const PRIORITY_FILTERS = ['all', 'high', 'medium', 'low'] as const;
export const EXPERIENCE_BANDS = ['all', 'fresher', '1-3', '4-7', '8+'] as const;

export interface Q1Stats {
  newCandidates: number;
  newToday: number;
  pendingScreening: number;
  followUpsDue: number;
  followUpsDueToday: number;
  verified: number;
  verifiedToday: number;
  notInterested: number;
}

export interface Q1NavCounts {
  candidates: number;
  followUps: number;
}

export interface QueueRow {
  subscriberId: number;
  fullName: string;
  designation: string;
  city: string;
  totalExperience: number | null;
  currentCompany: string;
  profileCompleteness: number;
  cvAvailable: boolean;
  receivedAt: string | null;
  priority: ScreeningPriority;
  status: ScreeningStatus;
}

export interface QueuePage {
  rows: QueueRow[];
  total: number;
}

export interface ScreeningState {
  status: ScreeningStatus;
  priority: ScreeningPriority;
  checklist: Record<ChecklistKey, boolean>;
  checklistDone: number;
  checklistTotal: number;
  checklistPercent: number;
  followUpDate: string | null;
  followUpTime: string | null;
  contactAttempts: number;
  nextAttemptAt: string | null;
  notInterestedReason: string | null;
  verifiedAt: string | null;
}

export interface Q1Profile {
  subscriberId: number;
  fullName: string;
  email: string;
  mobile: string;
  gender: string;
  city: string;
  designation: string;
  totalExperience: string;
  photoUrl: string | null;
  currentCompany: string;
  currentDesignation: string;
  noticePeriod: number | null;
  resumeFileName: string | null;
  resumeUploadedAt: string | null;
  skills: string[];
  education: { degree: string; institute: string; year: string }[];
  experience: { company: string; designation: string; from: string; to: string }[];
  dateOfBirth: string | null;
  linkedInUrl: string | null;
  profileSummary: string;
  professionalTitle: string;
  expectedSalary: number | null;
  previousCompanies: string[];
  relevantExpMonths: number | null;
  profileCompleteness: number;
  missingItems: string[];
  screening: ScreeningState;
}

export interface ContactLogEntry {
  id: number;
  kind: 'Contact' | 'ProfileUpdateRequest' | 'CvRequest';
  channel: ContactChannel;
  reason: string | null;
  missingItems: string[];
  internalNote: string | null;
  contactedAt: string;
}

export interface Q1Analytics {
  kpis: {
    candidatesScreened: number;
    screenedThisWeek: number;
    verificationRate: number;
    avgScreeningMinutes: number;
    cvAvailability: number;
  };
  screeningsThisWeek: { labels: string[]; values: number[]; total: number };
  profileCompletion: { label: string; percent: number }[];
  byStatus: { label: string; count: number }[];
  funnel: { label: string; count: number; percent: number }[];
}

export interface QueueFilters {
  priority: (typeof PRIORITY_FILTERS)[number];
  experience: (typeof EXPERIENCE_BANDS)[number];
  cvOnly: boolean;
}

export const DEFAULT_FILTERS: QueueFilters = {
  priority: 'all',
  experience: 'all',
  cvOnly: false,
};
