/** Employer company + job listing shapes (tblClientMstr / tblClientJobs). */
export type InterviewMode = 'Telephonic' | 'Face to face' | 'Video call';

export const INTERVIEW_MODE_OPTIONS: { id: InterviewMode; label: string }[] = [
  { id: 'Telephonic', label: 'Telephonic' },
  { id: 'Face to face', label: 'Face to face' },
  { id: 'Video call', label: 'Video call' },
];

export interface InterviewRound {
  round: number;
  process: string;
  /** How the round is conducted (telephonic / in-person / video). */
  mode?: InterviewMode | string;
}

export interface CompanyProfile {
  clientId: number;
  clientName: string;
  industry: string;
  industryTypeId?: number | null;
  email: string;
  contactNo: string;
  hrEmail?: string;
  hrContactNo?: string;
  hrContactName?: string;
  website: string;
  city: string;
  cityId?: number;
  address: string;
  logoUrl: string | null;
  companyLogo?: string;
  description: string;
}

export type ApplicantPipelineStatus =
  | 'New'
  | 'Shortlisted'
  | 'Interview'
  | 'Hired'
  | 'Rejected'
  | 'SentToCompany'
  | 'Referred'
  | 'Expired'
  | 'Offer'
  | 'Joined'
  | 'OnHold';
/** Plain status changes; an interview goes through `InterviewScheduleInput` instead. */
export type ApplicantDecision = 'Shortlisted' | 'Hired' | 'Rejected';
export type ApplicantAction = ApplicantDecision | 'Interview';

export interface InterviewScheduleInput {
  hrName: string;
  hrEmail: string;
  interviewerName: string;
  interviewerEmail: string;
  guestName?: string;
  guestEmail?: string;
  mode: InterviewMode;
  meetingLink?: string;
  location?: string;
  /** Exactly 3 ISO datetimes. */
  slots: string[];
}

export type NextInterviewStep = 'Round2' | 'Round3' | 'Final' | 'Hire';

export interface EmployerInterviewRound {
  roundId: number;
  roundNumber: number;
  roundName: string;
  interviewerName: string | null;
  interviewerEmail: string | null;
  hrName: string | null;
  hrEmail: string | null;
  guestName: string | null;
  guestEmail: string | null;
  interviewModeId: number | null;
  interviewMode: string | null;
  meetingLink: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string | null;
  scheduledAt: string | null;
  /** Pending (Q3 has not booked a slot) | Scheduled | Completed | Cancelled */
  status: string;
  /** Pending | Passed | Failed | Hold */
  result: string;
  companyFeedback: string | null;
  slots: Array<{ slotId: number; slotDateTime: string; isSelected: boolean }>;
}

export interface EmployerApplicant {
  jobSubscriberMapId: number;
  subscriberId: number;
  jobId?: number;
  fullName: string;
  designation: string;
  jobCity?: string;
  city: string;
  experience: string;
  totalExp?: number | null;
  jobStatus: string;
  status: ApplicantPipelineStatus;
  /** e.g. "Rejected at screening", "Round 2 · awaiting Q3 scheduling", "Selected after Final round". */
  stage?: string;
  /** Interview rounds so far; once non-zero, decisions happen on the rounds. */
  roundCount?: number;
  /** When the latest round is booked by Q3. */
  interviewAt?: string | null;
  skills: string[];
  company: string;
  notice: string;
  noticePeriodDays?: number | null;
  appliedOn: string;
  email?: string;
  mobile?: string;
}

export interface ApplicantListParams {
  status?: ApplicantPipelineStatus;
  q?: string;
  jobId?: number;
  city?: string;
  minExp?: number;
  maxNotice?: number;
  page?: number;
  pageSize?: number;
}

export interface ApplicantListResponse {
  items: EmployerApplicant[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface EmployerApplicantDetail extends EmployerApplicant {
  email: string;
  mobile: string;
  gender: string;
  dateOfBirth: string | null;
  address: string;
  jobCity: string;
  currentCity: string;
  currentDesignation: string;
  totalExp: number | null;
  currentCtc: number | null;
  noticePeriodDays: number | null;
  readyToRelocate: boolean;
  industry: string;
  hasResume: boolean;
  resumeFileName: string | null;
  resumeUploadedAt: string | null;
  resumeUrl: string | null;
  cvPath: string | null;
  photoUrl: string | null;
  resumeHeadline: string;
  profileSummary: string;
  department: string;
  roleCategory: string;
  jobRole: string;
  desiredJobType: string;
  desiredEmploymentType: string;
  preferredShift: string;
  preferredWorkModes: string;
  preferredSalary: number | null;
  preferredJobRoles: string;
  maritalStatus: string;
  preferredLocations: string[];
  itSkills: Array<{
    name: string;
    version: string;
    lastUsedYear: number | null;
    expYears: number | null;
    expMonths: number | null;
  }>;
  certificates: Array<{
    name: string;
    url: string;
    certificationId: string;
    validFrom: string;
    validTill: string;
  }>;
  projects: Array<{
    title: string;
    clientName: string;
    status: string;
    from: string;
    to: string;
    role: string;
    skillsUsed: string;
    details: string;
    teamSize: number | null;
  }>;
  accomplishments: Array<{
    kind: string;
    title: string;
    url: string;
    description: string;
    when: string;
  }>;
  employment: Array<{
    employer: string;
    designation: string;
    from: string;
    to: string;
    salary: number | null;
    description: string;
    current: boolean;
  }>;
  education: Array<{
    degree: string;
    course: string;
    institute: string;
    year: number | null;
    mode: string;
    marks: string;
  }>;
  timeline: Array<{ status: string; at: string; comments: string }>;
  referralId?: number | null;
  referralStatus?: string | null;
  companyReviewStatus?: string | null;
}

export interface ApplicantDocumentRow {
  /** Null while the document is requested but not uploaded yet. */
  docUploadId: number | null;
  documentType: string;
  documentPath: string | null;
  /** Requested | Pending | Verified | Rejected */
  status: string;
  uploadedAt: string | null;
}

export interface CompanyInvoice {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  description: string;
  amount: number;
  tax: number;
  total: number;
  /** Unpaid | Paid | Cancelled */
  status: string;
  paidAt: string | null;
}

/** Only invoices the admin has raised — nothing is billed automatically. */
export interface CompanyBilling {
  currency: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  invoices: CompanyInvoice[];
}

export interface CompanyAnalytics {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  draftJobs: number;
  archivedJobs: number;
  totalApplications: number;
  /** Current stage counts — they add up to totalApplications. */
  mapped: number;
  inReview: number;
  shortlisted: number;
  interviewScheduled: number;
  onHold: number;
  selected: number;
  rejected: number;
  rejectedAtScreening: number;
  rejectedAfterInterview: number;
  closedOther: number;
  /** How far applications got (cumulative). */
  funnel: {
    applied: number;
    passedScreening: number;
    interviewed: number;
    hired: number;
  };
  rates: {
    shortlistRate: number;
    interviewRate: number;
    hireRate: number;
    rejectRate: number;
    interviewFromShortlist: number;
    hireFromInterview: number;
  };
  applicationsByMonth: Array<{ month: string; label: string; count: number }>;
  jobPerformance: Array<{
    jobId: number;
    designation: string;
    city: string;
    status: string;
    applications: number;
    mapped: number;
    shortlisted: number;
    interviewScheduled: number;
    selected: number;
    rejected: number;
    shortlistRate: number;
    hireRate: number;
  }>;
}

export interface UpdateCompanyProfileInput {
  clientName?: string;
  email?: string;
  contactNo?: string;
  hrEmail?: string;
  hrContactNo?: string;
  hrContactName?: string;
  website?: string;
  address?: string;
  description?: string;
  cityId?: number;
  industryTypeId?: number;
  companyLogo?: string;
}

export interface JobListing {
  jobId: number;
  designation: string;
  designationId: number;
  city: string;
  cityId: number;
  workMode: string;
  workModeId: number;
  employmentType: string;
  employmentTypeId: number;
  industryTypeId: number | null;
  description: string;
  candidateProfile: string;
  /** The remaining two of the job page's four headed sections, one item per line. */
  keyResponsibilities: string;
  preferredQualifications: string;
  openings: number | null;
  skillIds: number[];
  skills?: string[];
  minExp: number;
  maxExp: number | null;
  minCtc: number;
  maxCtc: number;
  educationDetail: string;
  reportTo: string;
  teamSize: number | null;
  department: string;
  subDepartment: string;
  interviewProcess: InterviewRound[];
  status: string;
  applicants: number;
  postedOn: string;
}

/** id-backed lookup lists for the job post/edit form. */
export interface MasterOption {
  id: number;
  label: string;
}

export interface CityOption extends MasterOption {
  stateId: number;
}

export interface CompanyMasters {
  designations: MasterOption[];
  states: MasterOption[];
  cities: CityOption[];
  workModes: MasterOption[];
  employmentTypes: MasterOption[];
  industryTypes: MasterOption[];
  skills: MasterOption[];
}

export interface JobPostInput {
  designationId: number;
  cityId: number;
  workModeId: number;
  employmentTypeId: number;
  industryTypeId?: number;
  minExp?: number;
  maxExp?: number;
  minCtc: number;
  maxCtc: number;
  openings?: number;
  description: string;
  candidateProfile?: string;
  /** One item per line — the public job page numbers whatever lines it finds. */
  keyResponsibilities?: string;
  preferredQualifications?: string;
  skillIds?: number[];
  /** Skill labels — matched or created server-side, then linked to the job. */
  skills?: string[];
  educationDetail?: string;
  reportTo?: string;
  teamSize?: number;
  department?: string;
  subDepartment?: string;
  interviewProcess?: InterviewRound[];
}

export interface JobListParams {
  q?: string;
  city?: string;
  status?: 'Active' | 'Closed' | 'Draft' | 'Archived';
  page?: number;
  pageSize?: number;
}

export interface JobListResponse {
  items: JobListing[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: {
    all: number;
    active: number;
    closed: number;
    draft: number;
    archived: number;
  };
  cities: string[];
}

export interface BulkUploadResult {
  imported: number;
  valid?: number;
  skipped: number;
  errors: { row: number; reason: string }[];
  preview: Array<{
    row: number;
    position?: string;
    employmentType?: string;
    experience?: string;
    workMode?: string;
    ctcMin?: number;
    ctcMax?: number;
    department?: string;
    location?: string;
    skills?: string;
    status: 'Valid' | 'Error' | string;
    error?: string;
  }>;
}
