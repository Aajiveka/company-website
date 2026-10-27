/** Shapes returned by /api/admin/* — see apps/api/src/modules/admin/admin.service.ts. */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/** Mirrors PIPELINE_STAGES in admin.service.ts, in the order an application travels. */
export const PIPELINE_STAGES = [
  'Screening',
  'WithQ3',
  'CompanyReview',
  'Interview',
  'Selection',
  'Joined',
  'Closed',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABEL: Record<PipelineStage, string> = {
  Screening: 'Screening (Q1/Q2)',
  WithQ3: 'With Q3',
  CompanyReview: 'Company review',
  Interview: 'Interviews',
  Selection: 'Selection & offer',
  Joined: 'Joined',
  Closed: 'Closed',
};

export type JobStatus = 'Active' | 'Closed' | 'Archived' | 'Draft';
export type JobAction = 'close' | 'reopen';

export interface AuditEntryLite {
  id: number;
  action: string;
  entity: string | null;
  entityId: string | null;
  userId: number | null;
  actor: string;
  detail: unknown;
  ipAddress: string | null;
  at: string;
}
export type AdminAuditEntry = AuditEntryLite;

export interface AdminStats {
  users: { total: number; active: number; inactive: number; byRole: { roleId: number; count: number }[] };
  candidates: { total: number; last30Days: number };
  employers: { total: number; pendingRegistrations: number };
  jobs: { total: number; byStatus: Record<JobStatus, number> };
  applications: {
    total: number;
    byStage: Record<PipelineStage, number>;
    byStatus: { statusId: number | null; label: string; stage: PipelineStage; count: number }[];
  };
  payments: { successfulOrders: number; revenueInr: number };
  signups: { date: string; count: number }[];
  topDesignations: { label: string; count: number }[];
  topCities: { label: string; count: number }[];
  recentActivity: AdminAuditEntry[];
}

export interface AdminUser {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  mobile: string;
  roleId: number;
  isActive: boolean;
  subscriberId: number | null;
  clientId: number | null;
  createdAt: string | null;
}

export interface NextStep {
  owner: 'Q1' | 'Q2' | 'Q3' | 'Employer' | 'Candidate' | null;
  label: string;
  to: string | null;
}

export interface AdminApplication {
  mapId: number;
  statusId: number | null;
  status: string;
  stage: PipelineStage;
  nextStep: NextStep;
  appliedAt: string | null;
  updatedAt: string | null;
  candidate: { subscriberId: number | null; userId: number | null; name: string; email: string; mobile: string };
  job: { jobId: number | null; clientId: number | null; designation: string; company: string; city: string };
}

export interface ApplicationsPage extends Page<AdminApplication> {
  byStage: Record<PipelineStage, number>;
  statuses: { statusId: number; label: string; stage: PipelineStage }[];
}

export interface AdminUserDetail extends AdminUser {
  mustChangePassword: boolean;
  activeSessions: number;
  logins: { loginTime: string; logoutTime: string | null; ipAddress: string | null; ended: boolean }[];
  activity: AdminAuditEntry[];
  history: AdminAuditEntry[];
  candidate: {
    applications: AdminApplication[];
    screening: { status: string; priority: string; verifiedAt: string | null } | null;
  } | null;
  company: { clientId: number; clientName: string } | null;
}

export interface AdminJob {
  jobId: number;
  clientId: number;
  designation: string;
  company: string;
  city: string;
  minCtc: number;
  maxCtc: number;
  status: JobStatus | 'Unknown';
  postedOn: string | null;
  applications: number;
  allowedActions: JobAction[];
}

export interface JobsPage extends Page<AdminJob> {
  counts: Record<JobStatus, number>;
}

export interface AdminJobDetail extends AdminJob {
  workMode: string;
  employmentType: string;
  minExp: number | null;
  maxExp: number | null;
  openings: number | null;
  description: string;
  updatedAt: string | null;
  applicants: AdminApplication[];
  applicationsByStage: Record<PipelineStage, number>;
  history: AdminAuditEntry[];
}

export interface AdminApplicationDetail extends AdminApplication {
  timeline: { statusId: number | null; label: string; at: string | null; by: string; comments: string | null }[];
  matchReview: { status: string; decidedAt: string | null; decidedBy: string | null; note: string | null } | null;
  referrals: {
    id: number;
    status: string;
    companyReviewStatus: string;
    referredAt: string | null;
    referredBy: string;
    sentToCompanyAt: string | null;
    expiresAt: string | null;
    returnedAt: string | null;
    returnReason: string | null;
    returnNote: string | null;
  }[];
  rounds: {
    roundNumber: number;
    roundName: string;
    status: string;
    result: string;
    decision: string | null;
    scheduledAt: string | null;
    conductedAt: string | null;
  }[];
  hiring: Record<
    'selectedAt' | 'docsRequestedAt' | 'docsDueAt' | 'docsForwardedAt' | 'docsApprovedAt' | 'joinedAt' | 'onHoldAt',
    string | null
  > | null;
  offer: { status: string; generatedAt: string | null; sentAt: string | null; respondedAt: string | null; joiningDate: string | null } | null;
  audit: AdminAuditEntry[];
}

export interface AdminCompany {
  clientId: number;
  name: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  createdAt: string;
  login: { userId: number; userName: string; isActive: boolean } | null;
  jobs: number;
  activeJobs: number;
  applications: number;
}

export interface EmployerRegistration {
  id: number;
  companyName: string;
  emailCompany: string;
  emailHR: string | null;
  contactNumberCompany: string | null;
  contactNumberHR: string | null;
  location: string | null;
  industryType: string | null;
  website: string | null;
  aboutCompany: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /** The city the free-text location matched, for a Pending registration; null if none. */
  suggestedCityId: number | null;
}

export interface SetPasswordResult {
  emailedTo: string;
  /** False when the API has no mail transport — the link is then returned for hand-off. */
  delivered: boolean;
  setPasswordUrl?: string;
}
