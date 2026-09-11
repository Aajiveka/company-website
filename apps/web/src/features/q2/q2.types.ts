/**
 * Q2 job-matching workspace types (Figma "Q2" page).
 *
 * Mirrors the `/q2/*` responses one-for-one. Q2's unit of work is an *application*
 * (`mapId` = JobSubscriberMapID), not a candidate — the same person appears twice in the
 * Figma's All Applicants table because they applied to two jobs.
 */

export type MatchReviewStatus = 'New' | 'Forwarded' | 'SentBackToQ1' | 'Rejected';

/** The seven weighted criteria on the Candidate Scoring panel. */
export type MatchCriterionKey =
  | 'skill'
  | 'experience'
  | 'jobRole'
  | 'education'
  | 'location'
  | 'salary'
  | 'noticePeriod';

/** "All / Relevant / Not Relevant" on All Applicants. */
export type ApplicantTab = 'all' | 'relevant' | 'notRelevant';

/** Which sidebar screen is asking. */
export type ApplicantBucket = 'queue' | 'forwarded' | 'sentBack' | 'rejected';

export interface Q2Stats {
  activeJobs: number;
  totalApplicants: number;
  relevantMatches: number;
  forwardedToQ3: number;
  sentBackToQ1: number;
}

export interface Q2NavCounts {
  employerJobs: number;
  allApplicants: number;
}

/** The "Matching SLA" card pinned to the bottom of the sidebar. */
export interface Q2Sla {
  total: number;
  matched: number;
  awaiting: number;
}

export interface Q2JobRow {
  jobId: number;
  title: string;
  company: string;
  location: string;
  minExp: number | null;
  maxExp: number | null;
  workMode: string;
  applicants: number;
  relevant: number;
  topMatch: number;
}

export interface Q2JobsPage {
  total: number;
  rows: Q2JobRow[];
}

/** The Job Information rail on the Job Applicants screen. */
export interface Q2JobInfo {
  jobId: number;
  title: string;
  company: string;
  location: string;
  description: string;
  jobType: string;
  workMode: string;
  minExp: number | null;
  maxExp: number | null;
  minCTC: number;
  maxCTC: number;
  qualification: string;
  postedOn: string | null;
  requiredSkills: string[];
}

export interface Q2RankedApplicant {
  mapId: number;
  subscriberId: number;
  name: string;
  designation: string;
  totalExp: number | null;
  totalScore: number;
  relevant: boolean;
  profileCompleteness: number;
  hasCv: boolean;
  rank: number;
}

export interface Q2JobApplicants {
  job: Q2JobInfo;
  totalApplicants: number;
  applicants: Q2RankedApplicant[];
}

export interface Q2ApplicantRow {
  mapId: number;
  subscriberId: number;
  jobId: number;
  name: string;
  currentDesignation: string;
  jobTitle: string;
  company: string;
  totalScore: number;
  relevant: boolean;
  profileCompleteness: number;
  status: MatchReviewStatus;
}

export interface Q2ApplicantsPage {
  total: number;
  page: number;
  pageSize: number;
  counts: { all: number; relevant: number; notRelevant: number };
  rows: Q2ApplicantRow[];
}

export interface Q2Criterion {
  key: MatchCriterionKey;
  label: string;
  weight: number;
  score: number;
  included: boolean;
}

export interface Q2Application {
  mapId: number;
  subscriberId: number;
  status: MatchReviewStatus;
  /** The header's "Overall JD match" — always the full seven-criteria total. */
  overallScore: number;
  candidate: {
    name: string;
    designation: string;
    email: string;
    phone: string;
    location: string;
    totalExp: number | null;
    education: string;
    noticePeriod: number | null;
    profileCompleteness: number;
    skills: string[];
    resume: {
      name: string;
      path: string;
      /** Both null for a CV stored before the columns existed and not yet backfilled. */
      sizeBytes: number | null;
      pageCount: number | null;
    } | null;
  };
  job: Omit<Q2JobInfo, 'postedOn'>;
  scoring: {
    criteria: Q2Criterion[];
    /** Recomputed over the ticked subset — the "Total Match Score / n/7 criteria" row. */
    totalScore: number;
    selectedCount: number;
    criteriaCount: number;
  };
  coverage: {
    matched: string[];
    missing: string[];
    requiredSkills: string[];
    /** "Why they match" — derived from the sub-scores, so it cannot contradict them. */
    reasons: string[];
  };
}

export interface Q2Analytics {
  activeJobs: number;
  totalApplications: number;
  scoredApplications: number;
  relevantMatches: number;
  relevantThreshold: number;
  averageMatch: number;
  distribution: { band: string; count: number }[];
  decisions: {
    awaiting: number;
    forwardedToQ3: number;
    sentBackToQ1: number;
    rejected: number;
  };
  criteria: { key: MatchCriterionKey; label: string; weight: number; average: number }[];
}
