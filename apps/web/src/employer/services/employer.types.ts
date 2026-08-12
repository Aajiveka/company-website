/** Employer company + job listing shapes (tblClientMstr / tblClientJobs). */
export interface InterviewRound {
  round: number;
  process: string;
}

export interface CompanyProfile {
  clientId: number;
  clientName: string;
  industry: string;
  industryTypeId?: number | null;
  email: string;
  contactNo: string;
  website: string;
  city: string;
  cityId?: number;
  address: string;
  logoUrl: string | null;
  description: string;
}

export type ApplicantPipelineStatus = 'New' | 'Shortlisted' | 'Interview' | 'Hired' | 'Rejected';
export type ApplicantDecision = 'Shortlisted' | 'Interview' | 'Hired' | 'Rejected';

export interface EmployerApplicant {
  jobSubscriberMapId: number;
  subscriberId: number;
  fullName: string;
  designation: string;
  city: string;
  experience: string;
  jobStatus: string;
  status: ApplicantPipelineStatus;
  skills: string[];
  company: string;
  notice: string;
  appliedOn: string;
  email?: string;
  mobile?: string;
}

export interface EmployerApplicantDetail extends EmployerApplicant {
  email: string;
  mobile: string;
  jobCity: string;
  totalExp: number | null;
  currentCtc: number | null;
  industry: string;
  cvPath: string | null;
  photoUrl: string | null;
  employment: Array<{
    employer: string;
    designation: string;
    from: string;
    to: string;
    salary: number | null;
    description: string;
    current: boolean;
  }>;
  education: Array<{
    degree: string;
    course: string;
    institute: string;
    year: number | null;
    mode: string;
    marks: string;
  }>;
  timeline: Array<{ status: string; at: string; comments: string }>;
}

export interface CompanyAnalytics {
  totalJobs: number;
  activeJobs: number;
  closedJobs: number;
  draftJobs: number;
  archivedJobs: number;
  totalApplications: number;
  mapped: number;
  shortlisted: number;
  interviewScheduled: number;
  selected: number;
  rejected: number;
  jobPerformance: Array<{
    jobId: number;
    designation: string;
    applications: number;
    shortlisted: number;
    interviewScheduled: number;
    selected: number;
    rejected: number;
  }>;
}

export interface UpdateCompanyProfileInput {
  clientName?: string;
  email?: string;
  contactNo?: string;
  website?: string;
  address?: string;
  description?: string;
  cityId?: number;
  industryTypeId?: number;
  companyLogo?: string;
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
