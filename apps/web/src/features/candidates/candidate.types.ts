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
  emailVerified: boolean;
  mobile: string;
  gender: string;
  city: string;
  designation: string;
  totalExperience: string;
  photoUrl: string | null;
  /** The one-line pitch shown under the name. */
  resumeHeadline: string;
  currentCompany: string;
  currentDesignation: string;
  currentCtc: number | null;
  noticePeriod: number | null;
  /** Newest write across the CV and every section hanging off it, ISO 8601. */
  profileUpdatedAt: string | null;
  resumeUrl: string | null;
  resumeFileName: string | null;
  resumeUploadedAt: string | null;
  skills: string[];
  education: CandidateEducation[];
  experience: CandidateExperience[];
}

/**
 * A job the candidate has applied to, with full tracking info.
 */
export interface AppliedJob {
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
  appliedOn: string;
  status: string;
  statusHistory: StatusHistoryEntry[];
  interview: InterviewInfo | null;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  comments: string | null;
}

export interface InterviewInfo {
  scheduledOn: string;
  mode: string;
  location: string | null;
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

/** A job the candidate has bookmarked for later. */
export interface SavedJob {
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
  savedOn: string;
}

/** id-backed lookup lists for the CV editor. */
export interface CvMasterOption {
  id: number;
  label: string;
}

export interface CvCityOption extends CvMasterOption {
  stateId: number;
}

/** A course carries its education level, so picking a degree can filter the course list. */
export interface CvCourseOption extends CvMasterOption {
  degreeId: number;
}

export interface CvMasters {
  states: CvMasterOption[];
  cities: CvCityOption[];
  subFunctions: CvMasterOption[];
  industries: CvMasterOption[];
  skills: CvMasterOption[];
  /** Education levels — the "Degree" dropdown (10th, 12th, Graduation, Post Graduation). */
  degrees: CvMasterOption[];
  /** Courses, each tagged with the degree level it belongs to so the UI can cascade. */
  courses: CvCourseOption[];
  designations: CvMasterOption[];
  employmentTypes: CvMasterOption[];
  /**
   * Key-skill chips come from tblMstrTags, not tblMstrSkills — the save endpoint matches
   * names against tags and drops what it cannot find.
   */
  tags: CvMasterOption[];
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
  instituteName: string;
  passingYear: number | null;
  courseMode: string;
  marks: string;
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
  certificateUrl: string;
  certificationId: string;
  validFromMonth: number | null;
  validFromYear: number | null;
  validTillMonth: number | null;
  validTillYear: number | null;
  neverExpires: boolean;
}

/* ---------------------------- Profile sections ---------------------------- */

/**
 * Closed vocabularies. None of these has a master table in the schema — they are fixed lists
 * a candidate picks from, and the API validates against the same values.
 */
export const COURSE_MODES = ['Full Time', 'Part Time', 'Correspondence'] as const;
export const JOB_TYPES = ['Permanent', 'Contractual'] as const;
export const EMPLOYMENT_TYPES = ['Full Time', 'Part Time'] as const;
export const SHIFTS = ['Day', 'Night', 'Flexible'] as const;
/** Where the candidate wants to work, which is a different question from which shift. */
export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'] as const;
export const MARITAL_STATUSES = ['Single / unmarried', 'Married', 'Widowed', 'Divorced', 'Separated', 'Other'] as const;
export const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'] as const;
export const PROJECT_STATUSES = ['In Progress', 'Finished'] as const;
export const PROJECT_SITES = ['Onsite', 'Offsite'] as const;
export const DISABILITY_STATUSES = ['Do not have disability', 'Have disability'] as const;
export const MILITARY_STATUSES = ['Not applicable', 'Currently serving', 'Veteran'] as const;
export const CAREER_BREAK_STATUSES = ['Have not taken', 'Have taken'] as const;

/** The five link-shaped accomplishments. Certifications have their own richer entry type. */
export const ACCOMPLISHMENT_KINDS = [
  'ONLINE_PROFILE',
  'WORK_SAMPLE',
  'PUBLICATION',
  'PRESENTATION',
  'PATENT',
] as const;
export type AccomplishmentKind = (typeof ACCOMPLISHMENT_KINDS)[number];

/** 1 = Beginner, 2 = Proficient, 3 = Expert. */
export type LanguageProficiency = 1 | 2 | 3;

export interface CvCareerProfile {
  industryTypeId: number | null;
  department: string;
  roleCategory: string;
  jobRole: string;
  desiredJobType: string[];
  desiredEmploymentType: string[];
  preferredShift: string;
  preferredWorkModes: string[];
  preferredSalary: number | null;
  preferredJobRoles: string[];
  preferredCityIds: number[];
}

export interface CvPersonalDetails {
  maritalStatus: string;
  personalTraits: string[];
  category: string;
  workPermitCountries: string[];
  usWorkPermit: string;
}

export interface CvDiversity {
  disabilityStatus: string;
  disabilityType: string;
  disabilityPercent: number | null;
  assistanceRequired: string;
  militaryStatus: string;
  militaryServiceType: string;
  militaryRank: string;
  militaryEnrolmentDate: string;
  careerBreakStatus: string;
  careerBreakReason: string;
  careerBreakFrom: string;
  /** Empty while the break is ongoing — the profile prints "Present". */
  careerBreakTo: string;
}

export interface CvItSkillEntry {
  subscriberItSkillId: number;
  skillName: string;
  version: string;
  lastUsedYear: number | null;
  expYears: number | null;
  expMonths: number | null;
}

export interface CvProjectEntry {
  subscriberProjectId: number;
  title: string;
  clientName: string;
  projectStatus: string;
  workedFromMonth: number | null;
  workedFromYear: number | null;
  workedTillMonth: number | null;
  workedTillYear: number | null;
  projectSite: string;
  natureOfEmployment: string;
  teamSize: number | null;
  roleDescr: string;
  skillsUsed: string[];
  details: string;
}

export interface CvAccomplishmentEntry {
  subscriberAccomplishmentId: number;
  kind: AccomplishmentKind;
  title: string;
  url: string;
  descr: string;
  eventMonth: number | null;
  eventYear: number | null;
  patentStatus: string;
  patentOffice: string;
}

export interface CvLanguageEntry {
  subscriberLanguageId: number;
  languageName: string;
  proficiencyId: LanguageProficiency;
  canRead: boolean;
  canWrite: boolean;
  canSpeak: boolean;
}

export interface CvEditProfile {
  personal: CvPersonal | null;
  professional: CvProfessional | null;
  education: CvEducationEntry[];
  employment: CvEmploymentEntry[];
  certificates: CvCertificateEntry[];
  headline: string;
  summary: string;
  careerProfile: CvCareerProfile;
  personalDetails: CvPersonalDetails;
  diversity: CvDiversity;
  itSkills: CvItSkillEntry[];
  projects: CvProjectEntry[];
  accomplishments: CvAccomplishmentEntry[];
  languages: CvLanguageEntry[];
}
