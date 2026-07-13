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

export interface QC1Stats {
  pending: number;
  approved: number;
  rejected: number;
  interview: number;
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
