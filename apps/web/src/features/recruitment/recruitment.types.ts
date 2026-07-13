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
  candidate: string;
  designation: string;
  company: string;
  mode: 'In-person' | 'Telephonic' | 'Video';
  scheduledAt: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface CandidateDocReview {
  documentId: number;
  candidate: string;
  document: string;
  status: 'Pending' | 'Verified' | 'Rejected';
}
