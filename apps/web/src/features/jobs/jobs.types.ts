/** Public job-search shapes (tblClientJobs joined to its lookups). */
export interface PublicJob {
  jobId: number;
  designation: string;
  company: string;
  industry: string;
  city: string;
  workMode: string;
  employmentType: string;
  minExp: number;
  minCtc: number;
  maxCtc: number;
  postedOn: string;
}

export interface JobsQuery {
  /** Role / designation — the hero's first dropdown. */
  designation?: string;
  industry?: string;
  /** City. */
  location?: string;
  /** Work mode filter (e.g. Remote, Hybrid, On-site). */
  workMode?: string;
  /** Employment type filter (e.g. Full Time, Part Time). */
  employmentType?: string;
  /** Minimum experience in years. */
  minExp?: number;
  /** Maximum experience in years. */
  maxExp?: number;
  /** Minimum CTC floor (rupees) — filters jobs whose maxCTC >= this value. */
  minCtc?: number;
  /** Sort order. */
  sortBy?: 'newest' | 'salary_high' | 'salary_low';
  page: number;
  pageSize: number;
}

export interface JobsPage {
  rows: PublicJob[];
  total: number;
}

/**
 * Master lists that populate the search dropdowns.
 *
 * These are the axes a job actually has. The hero originally offered "Function / keyword",
 * but a job has NO function in this schema: tblMstrDesignation is only
 * (DesignationID, Descr), and the SubFunction -> Function chain hangs off
 * tblSubscriberCVDetails — the candidate side. Nothing links a job to tblMstrFunctions.
 */
export interface JobFilters {
  designations: string[];
  industries: string[];
  states: string[];
  locations: string[];
  cityByState: Record<string, string[]>;
  workModes: string[];
  employmentTypes: string[];
}
