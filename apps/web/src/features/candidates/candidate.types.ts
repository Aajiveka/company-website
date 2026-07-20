/** Candidate CV shape (subset of tblSubscriber* used by candidate-profile.aspx). */
export interface CandidateEducation {
  degree: string;
  institute: string;
  year: string;
}

export interface CandidateExperience {
  company: string;
  designation: string;
  from: string;
  to: string;
}

export interface CandidateProfile {
  subscriberId: number;
  fullName: string;
  email: string;
  mobile: string;
  gender: string;
  city: string;
  designation: string;
  totalExperience: string;
  photoUrl: string | null;
  skills: string[];
  education: CandidateEducation[];
  experience: CandidateExperience[];
}

/**
 * A job the candidate has applied to (tblJobSubscriberMapping + status). `status` is
 * tblMstrJobMappingStatus.Descr text (Applied/Shortlisted/Interview scheduled/Interview
 * attended/Selected/Rejected/...) — open-ended rather than a fixed union, since the master
 * table has 11 real values and the UI only special-cases a handful via statusTone().
 */
export interface AppliedJob {
  jobId: number;
  designation: string;
  company: string;
  city: string;
  appliedOn: string;
  status: string;
}

/** Candidate document (tblCandidateDocumentMap / tblMstrDocuments). */
export interface CandidateDocument {
  /** tblCandidateDocumentMap.DocumentMapID — identifies this requirement. */
  documentId: number;
  /** tblMstrDocuments.DocumentID — what the upload endpoint is keyed by. */
  documentTypeId: number | null;
  name: string;
  status: 'Pending' | 'Uploaded' | 'Verified' | 'Rejected';
  uploadedOn: string | null;
}

/** Saved job alert. */
export interface JobAlert {
  alertId: number;
  keyword: string;
  location: string;
  frequency: 'Daily' | 'Weekly';
}

/** id-backed lookup lists for the CV editor. */
export interface CvMasterOption {
  id: number;
  label: string;
}

export interface CvMasters {
  cities: CvMasterOption[];
  subFunctions: CvMasterOption[];
  industries: CvMasterOption[];
  skills: CvMasterOption[];
  courseTypes: CvMasterOption[];
  educationDegrees: CvMasterOption[];
  designations: CvMasterOption[];
  employmentTypes: CvMasterOption[];
}

export interface CvPersonal {
  fullName: string;
  email: string;
  mobile: string;
  dob: string;
  gender: 'M' | 'F';
  address: string;
  cityId: number | null;
}

export interface CvProfessional {
  subFunctionId: number | null;
  skillId: number | null;
  totalExp: number;
  currentCtc: number | null;
  currentCityId: number | null;
  flgReadyToRelocate: boolean;
  noticePeriod: number | null;
  industryTypeId: number | null;
  preferredCityIds: number[];
  tagNames: string[];
}

export interface CvEducationEntry {
  subscriberEducationId: number;
  courseTypeId: number | null;
  degreeId: number | null;
}

export interface CvEmploymentEntry {
  subscriberEmployerId: number;
  employer: string;
  designationId: number | null;
  employeeTypeId: number | null;
  joiningDate: string;
  releavingDate: string;
  flgCurrent: boolean;
  salary: number | null;
  jobDescr: string;
  noticePeriodDays: number | null;
}

export interface CvCertificateEntry {
  subscriberCertificateId: number;
  certificateName: string;
}

export interface CvEditProfile {
  personal: CvPersonal | null;
  professional: CvProfessional | null;
  education: CvEducationEntry[];
  employment: CvEmploymentEntry[];
  certificates: CvCertificateEntry[];
}
