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
  city: string;
  workMode: string;
  employmentType: string;
  minExp: number;
  minCtc: number;
  maxCtc: number;
  status: string;
  applicants: number;
  postedOn: string;
}
