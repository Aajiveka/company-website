/** Company + job listing shapes (tblClientMstr / tblClientJobs). */
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
  openings: number | null;
  skillIds: number[];
  minExp: number;
  minCtc: number;
  maxCtc: number;
  status: string;
  applicants: number;
  postedOn: string;
}

/** id-backed lookup lists for the job post/edit form. */
export interface MasterOption {
  id: number;
  label: string;
}

export interface CompanyMasters {
  designations: MasterOption[];
  cities: MasterOption[];
  workModes: MasterOption[];
  employmentTypes: MasterOption[];
  industryTypes: MasterOption[];
  skills: MasterOption[];
}
