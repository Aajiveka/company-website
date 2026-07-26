/**
 * Shared TypeScript interfaces for API responses.
 *
 * These are generic, cross-feature types. Feature-specific shapes live in
 * their own `*.types.ts` files (e.g. `features/jobs/jobs.types.ts`).
 */

// ---------------------------------------------------------------------------
// Generic wrappers
// ---------------------------------------------------------------------------

/** Standard envelope returned by most API endpoints. */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Paginated list envelope. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export interface Job {
  id: number;
  title: string;
  company: string;
  companyId: number;
  location: string;
  state: string;
  district: string;
  minSalary: number | null;
  maxSalary: number | null;
  minExperience: number;
  maxExperience: number;
  description: string;
  requirements: string;
  workMode: 'remote' | 'onsite' | 'hybrid';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'closed' | 'draft';
  postedAt: string;
  expiresAt: string | null;
  applicantCount: number;
}

// ---------------------------------------------------------------------------
// Candidate
// ---------------------------------------------------------------------------

export interface Candidate {
  userId: number;
  fullName: string;
  email: string;
  mobile: string;
  designation: string | null;
  totalExperience: number;
  currentCtc: number | null;
  skills: string[];
  state: string | null;
  district: string | null;
  isOnboarded: boolean;
}

// ---------------------------------------------------------------------------
// Application
// ---------------------------------------------------------------------------

export interface Application {
  id: number;
  jobId: number;
  candidateId: number;
  status:
    | 'applied'
    | 'shortlisted'
    | 'interviewed'
    | 'offered'
    | 'rejected'
    | 'withdrawn';
  appliedAt: string;
  updatedAt: string;
  job?: Job;
  candidate?: Candidate;
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  type: 'job_match' | 'application_update' | 'interview' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Interview
// ---------------------------------------------------------------------------

export interface Interview {
  id: string;
  applicationId: number;
  candidateId: number;
  scheduledAt: string;
  mode: 'video' | 'phone' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  meetingLink?: string;
  candidate?: Candidate;
}

// ---------------------------------------------------------------------------
// Company
// ---------------------------------------------------------------------------

export interface Company {
  id: number;
  name: string;
  industry: string;
  website: string | null;
  logo: string | null;
  description: string | null;
  location: string;
  employeeCount: string | null;
  openPositions: number;
}
