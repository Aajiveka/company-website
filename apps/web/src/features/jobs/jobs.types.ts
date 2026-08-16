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
  /** The remaining two of the job page's four headed sections. */
  keyResponsibilities: string | null;
  preferredQualifications: string | null;
  maxExp: number | null;
  skills: string[];
  educationTypes: string[];
  companyLogo: string | null;
  /** The "Job overview" panel. Every one of these is optional on the row. */
  educationDetail: string | null;
  department: string | null;
  subDepartment: string | null;
  reportTo: string | null;
  teamSize: number | null;
  /** One entry per interview round, in order. Empty when the employer left it blank. */
  interviewRounds: string[];
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
  sortBy?: 'newest' | 'salary_high' | 'salary_low' | 'exp_low' | 'exp_high' | 'relevance';
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
  sortBy?: 'newest' | 'salary_high' | 'salary_low' | 'exp_low' | 'exp_high' | 'relevance';
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
  roleByFunction: Record<string, string[]>;
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

/**
 * The apply form (Figma 28:4658 / 28:4794). All strings, including salary and experience:
 * candidates write "20 LPA", "2000000" and "negotiable" in equal measure, and coercing to a
 * number would silently drop two of the three.
 */
export interface ApplyFormValues {
  fullName: string;
  email: string;
  phone: string;
  totalExperience: string;
  currentLocation: string;
  expectedSalary: string;
  noticePeriod: string;
  linkedInUrl: string;
  portfolioUrl: string;
  coverLetter: string;
}

/** What POST /jobs/:id/apply returns — the reference shown on the confirmation screen. */
export interface ApplyResult {
  jobSubscriberMapId: number;
  reference: string;
}
