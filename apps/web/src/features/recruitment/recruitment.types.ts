/** Recruitment/QC shapes (spSubscriberGetSubscriberForListing, spQC1GetDashboardData). */
export interface CandidateRow {
  subscriberId: number;
  fullName: string;
  designation: string;
  city: string;
  experience: string;
  jobStatus: string;
  appliedOn: string;
}

export interface CandidatesQuery {
  search?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface CandidatesPage {
  rows: CandidateRow[];
  total: number;
}

/**
 * spQC1GetDashboardData is a COMPLETENESS dashboard — it reports, per registration, what is
 * still MISSING (CV / education / employment). It is not a pending/approved/rejected funnel;
 * that was invented by the mocks and the cards rendered blank against the real API.
 */
export interface QC1Stats {
  total: number;
  cvMissing: number;
  educationMissing: number;
  employmentMissing: number;
}

export interface InterviewRow {
  interviewId: number;
  interviewStatusId: number;
  jobSubscriberMapId: number | null;
  candidate: string;
  designation: string;
  company: string;
  mode: 'In-person' | 'Telephonic' | 'Video';
  scheduledAt: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

/** A Mapped application with no interview yet — the schedule-interview candidate picker. */
export interface EligibleApplication {
  jobSubscriberMapId: number;
  candidate: string;
  designation: string;
  company: string;
}

export interface InterviewMode {
  id: number;
  label: string;
}

/** A candidate-uploadable document type (tblMstrDocuments), for the assign-documents checklist. */
export interface DocumentTypeOption {
  documentTypeId: number;
  name: string;
}

export interface CandidateDocReview {
  documentId: number;
  candidate: string;
  document: string;
  status: 'Pending' | 'Verified' | 'Rejected';
}

/** tblSubscriberRegistration.flgstatus, surfaced by the QC candidate-detail read. */
export type RegistrationStatus = 'Pending' | 'Approved' | 'Rejected';

/** An active job, for the assign-job picker (assign-job.aspx). */
export interface JobOption {
  jobId: number;
  designation: string;
  company: string;
}
