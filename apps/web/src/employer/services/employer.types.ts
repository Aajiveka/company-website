/** Employer company + job listing shapes (tblClientMstr / tblClientJobs). */
export interface InterviewRound {
  round: number;
  process: string;
}

export interface CompanyProfile {
  clientId: number;
  clientName: string;
  industry: string;
  email: string;
  contactNo: string;
  website: string;
  city: string;
  address: string;
  logoUrl: string | null;
  description: string;
}

export interface JobListing {
  jobId: number;
  designation: string;
  designationId: number;
  city: string;
  cityId: number;
  workMode: string;
  workModeId: number;
  employmentType: string;
  employmentTypeId: number;
  industryTypeId: number | null;
  description: string;
  candidateProfile: string;
  /** The remaining two of the job page's four headed sections, one item per line. */
  keyResponsibilities: string;
  preferredQualifications: string;
  openings: number | null;
  skillIds: number[];
  minExp: number;
  maxExp: number | null;
  minCtc: number;
  maxCtc: number;
  educationDetail: string;
  reportTo: string;
  teamSize: number | null;
  department: string;
  subDepartment: string;
  interviewProcess: InterviewRound[];
  status: string;
  applicants: number;
  postedOn: string;
}

/** id-backed lookup lists for the job post/edit form. */
export interface MasterOption {
  id: number;
  label: string;
}

export interface CityOption extends MasterOption {
  stateId: number;
}

export interface CompanyMasters {
  designations: MasterOption[];
  states: MasterOption[];
  cities: CityOption[];
  workModes: MasterOption[];
  employmentTypes: MasterOption[];
  industryTypes: MasterOption[];
  skills: MasterOption[];
}

export interface JobPostInput {
  designationId: number;
  cityId: number;
  workModeId: number;
  employmentTypeId: number;
  industryTypeId?: number;
  minExp?: number;
  maxExp?: number;
  minCtc: number;
  maxCtc: number;
  openings?: number;
  description: string;
  candidateProfile?: string;
  /** One item per line — the public job page numbers whatever lines it finds. */
  keyResponsibilities?: string;
  preferredQualifications?: string;
  skillIds?: number[];
  educationDetail?: string;
  reportTo?: string;
  teamSize?: number;
  department?: string;
  subDepartment?: string;
  interviewProcess?: InterviewRound[];
}

export interface JobListParams {
  q?: string;
  city?: string;
  status?: 'Active' | 'Closed' | 'Draft' | 'Archived';
  page?: number;
  pageSize?: number;
}

export interface JobListResponse {
  items: JobListing[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: {
    all: number;
    active: number;
    closed: number;
    draft: number;
    archived: number;
  };
  cities: string[];
}

export interface BulkUploadResult {
  imported: number;
  skipped: number;
  errors: { row: number; reason: string }[];
  preview: Array<{
    row: number;
    position?: string;
    employmentType?: string;
    experience?: string;
    workMode?: string;
    ctcMin?: number;
    ctcMax?: number;
    department?: string;
    location?: string;
    skills?: string;
    status: 'Valid' | 'Error' | string;
    error?: string;
  }>;
}
