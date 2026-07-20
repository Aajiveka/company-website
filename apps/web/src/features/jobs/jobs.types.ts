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
  locations: string[];
}
