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
  /** Relevance rank from full-text search (only present when using /jobs/search). */
  rank?: number;
}

/** Extended detail returned by GET /jobs/:id. */
export interface JobDetail extends PublicJob {
  description: string | null;
  candidateProfile: string | null;
  maxExp: number | null;
  skills: string[];
  educationTypes: string[];
  companyLogo: string | null;
}

export interface JobsQuery {
  /** Role / designation -- the hero's first dropdown. */
  designation?: string;
  industry?: string;
  /** City. */
  location?: string;
  /** Work mode filter (e.g. Remote, Hybrid, On-site). */
  workMode?: string;
  /** Employment type filter (e.g. Full Time, Part Time). */
  employmentType?: string;
  /** Multiple work modes. */
  workModes?: string[];
  /** Multiple employment types. */
  employmentTypes?: string[];
  /** Multiple cities. */
  locations?: string[];
  /** Multiple states. */
  states?: string[];
  /** Skills filter. */
  skills?: string[];
  /** Minimum experience in years. */
  minExp?: number;
  /** Maximum experience in years. */
  maxExp?: number;
  /** Minimum CTC floor (rupees) -- filters jobs whose maxCTC >= this value. */
  minCtc?: number;
  /** Maximum CTC ceiling (rupees). */
  maxCtc?: number;
  /** Posted within period. */
  postedWithin?: '24h' | '7d' | '30d';
  /** Sort order. */
  sortBy?: 'newest' | 'salary_high' | 'salary_low' | 'relevance';
  page: number;
  pageSize: number;
}

export interface FullTextSearchQuery {
  q?: string;
  page: number;
  pageSize: number;
  minCtc?: number;
  maxCtc?: number;
  workModes?: string[];
  employmentTypes?: string[];
  locations?: string[];
  skills?: string[];
  minExp?: number;
  maxExp?: number;
  postedWithin?: '24h' | '7d' | '30d';
  sortBy?: 'newest' | 'salary_high' | 'salary_low' | 'relevance';
}

export interface JobsPage {
  rows: PublicJob[];
  total: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'designation' | 'company' | 'skill';
}

export interface SuggestionsResponse {
  suggestions: SearchSuggestion[];
}

/**
 * Master lists that populate the search dropdowns.
 */
export interface JobFilters {
  designations: string[];
  industries: string[];
  states: string[];
  locations: string[];
  cityByState: Record<string, string[]>;
  workModes: string[];
  employmentTypes: string[];
  skills: string[];
}

/** Saved search configuration. */
export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  createdAt: string;
}
