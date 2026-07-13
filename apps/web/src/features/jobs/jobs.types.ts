/** Public job-search shapes (tblClientJobs joined to tblClientMstr). */
export interface PublicJob {
  jobId: number;
  designation: string;
  company: string;
  jobFunction: string;
  city: string;
  workMode: string;
  employmentType: string;
  minExp: number;
  minCtc: number;
  maxCtc: number;
  postedOn: string;
}

export interface JobsQuery {
  /** Job function / industry — the hero's "Function / keyword" dropdown. */
  jobFunction?: string;
  /** City — the hero's "Location" dropdown. */
  location?: string;
  page: number;
  pageSize: number;
}

export interface JobsPage {
  rows: PublicJob[];
  total: number;
}

/** Master lists that populate the search dropdowns. */
export interface JobFilters {
  functions: string[];
  locations: string[];
}
