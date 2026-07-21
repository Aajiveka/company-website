import { Role, type RoleId } from '@/types/roles';
import type { AuthSession } from '@/features/auth/auth.types';
import type { CandidateProfile, CvEditProfile } from '@/features/candidates/candidate.types';
import type { CompanyMasters, CompanyProfile, JobListing } from '@/features/clients/client.types';
import type { PublicJob } from '@/features/jobs/jobs.types';
import type { CandidateDocReview, CandidateRow, QC1Stats } from '@/features/recruitment/recruitment.types';

/**
 * Demo seed data shaped from the recovered stored-proc outputs. This drives the
 * MSW mock API. Swap VITE_USE_MOCKS=0 to hit the real Express/SQL-Server API.
 */

export interface DemoUser {
  userId: number;
  userName: string;
  password: string;
  fullName: string;
  email: string;
  roleId: RoleId;
}

// One demo login per role. Password for all: "demo123".
export const DEMO_USERS: DemoUser[] = [
  { userId: 1, userName: 'candidate', password: 'demo123', fullName: 'Rahul Sharma', email: 'rahul@example.com', roleId: Role.Subscriber },
  { userId: 2, userName: 'qc1', password: 'demo123', fullName: 'Priya QC', email: 'qc1@aajiveka.com', roleId: Role.QC1 },
  { userId: 3, userName: 'qc2', password: 'demo123', fullName: 'Anil QC2', email: 'qc2@aajiveka.com', roleId: Role.QC2 },
  { userId: 4, userName: 'employer', password: 'demo123', fullName: 'Acme HR', email: 'hr@acme.com', roleId: Role.Client },
  { userId: 5, userName: 'admin', password: 'demo123', fullName: 'System Admin', email: 'admin@aajiveka.com', roleId: Role.Admin },
];

export function makeSession(user: DemoUser): AuthSession {
  return {
    user: {
      userId: user.userId,
      userName: user.userName,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
    },
    accessToken: `mock-access-${user.userId}`,
    refreshToken: `mock-refresh-${user.userId}`,
  };
}

/** Mutable so the mock QC decision endpoint can flip it, mirroring tblSubscriberRegistration.flgstatus. */
export let CANDIDATE_REGISTRATION_STATUS: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
export function decideCandidate(decision: 'Approved' | 'Rejected') {
  CANDIDATE_REGISTRATION_STATUS = decision;
}

export const CANDIDATE_PROFILE: CandidateProfile = {
  subscriberId: 1,
  fullName: 'Rahul Sharma',
  email: 'rahul@example.com',
  mobile: '9876543210',
  gender: 'Male',
  city: 'Pune',
  designation: 'Senior Software Engineer',
  totalExperience: '6 years',
  photoUrl: null,
  skills: ['React', 'TypeScript', 'Node.js', 'SQL Server', 'Azure', 'REST APIs'],
  education: [
    { degree: 'B.E. Computer Science', institute: 'University of Pune', year: '2018' },
    { degree: 'HSC', institute: 'Fergusson College', year: '2014' },
  ],
  experience: [
    { company: 'Acme Corp', designation: 'Senior Software Engineer', from: 'Jan 2021', to: 'Present' },
    { company: 'Globex', designation: 'Software Engineer', from: 'Jul 2018', to: 'Dec 2020' },
  ],
};

export const CV_MASTERS = {
  cities: [
    { id: 413, label: 'Pune' },
    { id: 287, label: 'Bangalore Urban' },
    { id: 404, label: 'Mumbai City' },
    { id: 616, label: 'Hyderabad' },
  ],
  subFunctions: [
    { id: 1, label: 'Any Roles' },
    { id: 2, label: 'Banking Operations' },
    { id: 3, label: 'Acquisition Manager' },
    { id: 114, label: 'After Sales Service & Repair' },
    { id: 175, label: 'Accounting & Taxation' },
    { id: 275, label: 'System Analyst' },
    { id: 338, label: 'Brand Management' },
  ],
  industries: [
    { id: 1, label: 'Accounting / Auditing' },
    { id: 10, label: 'Banking' },
    { id: 51, label: 'IT Services & Consulting' },
    { id: 73, label: 'Retail' },
    { id: 71, label: 'Real Estate' },
  ],
  skills: [
    { id: 1, label: 'React' },
    { id: 2, label: 'Node.js' },
    { id: 3, label: 'SQL' },
  ],
  courseTypes: [
    { id: 1, label: 'Full Time' },
    { id: 2, label: 'Part Time' },
    { id: 3, label: 'Distance' },
  ],
  educationDegrees: [
    { id: 1, label: 'B.E. Computer Science' },
    { id: 2, label: 'HSC' },
    { id: 3, label: 'M.Tech' },
  ],
  designations: [
    { id: 1, label: 'Software Engineer' },
    { id: 2, label: 'Senior Software Engineer' },
    { id: 3, label: 'Team Lead' },
  ],
  employmentTypes: [
    { id: 1, label: 'Full-time' },
    { id: 2, label: 'Contract' },
  ],
};

export let CV_EDIT_PROFILE: CvEditProfile = {
  personal: { fullName: 'Rahul Sharma', email: 'rahul@example.com', mobile: '9876543210', dob: '1994-05-12', gender: 'M', address: 'Pune, Maharashtra', cityId: 1 },
  professional: { subFunctionId: 1, skillId: 1, totalExp: 6, currentCtc: 1800000, currentCityId: 1, flgReadyToRelocate: true, noticePeriod: 30, industryTypeId: 1, preferredCityIds: [1, 2], tagNames: ['React', 'Node.js'] },
  education: [
    { subscriberEducationId: 1, courseTypeId: 1, degreeId: 1 },
    { subscriberEducationId: 2, courseTypeId: 1, degreeId: 2 },
  ],
  employment: [
    { subscriberEmployerId: 1, employer: 'Acme Corp', designationId: 2, employeeTypeId: 1, joiningDate: '2021-01-01', releavingDate: '', flgCurrent: true, salary: 1800000, jobDescr: '', noticePeriodDays: 30 },
  ],
  certificates: [{ subscriberCertificateId: 1, certificateName: 'AWS Certified Developer' }],
};

let nextEducationId = 3;
let nextEmploymentId = 2;
let nextCertificateId = 2;

export function updateCvPersonal(payload: typeof CV_EDIT_PROFILE.personal) {
  CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, personal: payload };
}
export function updateCvProfessional(payload: typeof CV_EDIT_PROFILE.professional) {
  CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, professional: payload };
}
export function upsertCvEducation(payload: { subscriberEducationId?: number; courseTypeId: number; degreeId: number }) {
  if (payload.subscriberEducationId) {
    CV_EDIT_PROFILE = {
      ...CV_EDIT_PROFILE,
      education: CV_EDIT_PROFILE.education.map((e) => (e.subscriberEducationId === payload.subscriberEducationId ? { ...e, ...payload } : e)),
    };
  } else {
    const row = { subscriberEducationId: nextEducationId++, courseTypeId: payload.courseTypeId, degreeId: payload.degreeId };
    CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, education: [...CV_EDIT_PROFILE.education, row] };
  }
}
export function deleteCvEducation(id: number) {
  CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, education: CV_EDIT_PROFILE.education.filter((e) => e.subscriberEducationId !== id) };
}
export function upsertCvEmployment(payload: Partial<(typeof CV_EDIT_PROFILE.employment)[number]> & { employer: string }) {
  if (payload.subscriberEmployerId) {
    CV_EDIT_PROFILE = {
      ...CV_EDIT_PROFILE,
      employment: CV_EDIT_PROFILE.employment.map((e) => (e.subscriberEmployerId === payload.subscriberEmployerId ? { ...e, ...payload } : e)),
    };
  } else {
    const row = {
      subscriberEmployerId: nextEmploymentId++, employer: payload.employer,
      designationId: payload.designationId ?? null, employeeTypeId: payload.employeeTypeId ?? null,
      joiningDate: payload.joiningDate ?? '', releavingDate: payload.releavingDate ?? '',
      flgCurrent: payload.flgCurrent ?? false, salary: payload.salary ?? null,
      jobDescr: payload.jobDescr ?? '', noticePeriodDays: payload.noticePeriodDays ?? null,
    };
    CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, employment: [...CV_EDIT_PROFILE.employment, row] };
  }
}
export function deleteCvEmployment(id: number) {
  CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, employment: CV_EDIT_PROFILE.employment.filter((e) => e.subscriberEmployerId !== id) };
}
export function upsertCvCertificate(payload: { subscriberCertificateId?: number; certificateName: string }) {
  if (payload.subscriberCertificateId) {
    CV_EDIT_PROFILE = {
      ...CV_EDIT_PROFILE,
      certificates: CV_EDIT_PROFILE.certificates.map((c) =>
        c.subscriberCertificateId === payload.subscriberCertificateId ? { ...c, ...payload } : c,
      ),
    };
  } else {
    const row = { subscriberCertificateId: nextCertificateId++, certificateName: payload.certificateName };
    CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, certificates: [...CV_EDIT_PROFILE.certificates, row] };
  }
}
export function deleteCvCertificate(id: number) {
  CV_EDIT_PROFILE = { ...CV_EDIT_PROFILE, certificates: CV_EDIT_PROFILE.certificates.filter((c) => c.subscriberCertificateId !== id) };
}

export const COMPANY_PROFILE: CompanyProfile = {
  clientId: 4,
  clientName: 'Acme Technologies Pvt. Ltd.',
  industry: 'Information Technology',
  email: 'hr@acme.com',
  contactNo: '020-12345678',
  website: 'https://acme.example.com',
  city: 'Bengaluru',
  address: 'Prestige Tech Park, Bengaluru 560103',
  logoUrl: null,
  description:
    'Acme Technologies builds enterprise SaaS products used by 500+ companies. We are hiring across engineering, product and design.',
};

export const COMPANY_MASTERS: CompanyMasters = {
  designations: [
    { id: 1, label: 'Frontend Engineer' },
    { id: 2, label: 'Backend Engineer' },
    { id: 3, label: 'QA Analyst' },
    { id: 4, label: 'Product Manager' },
  ],
  states: [
    { id: 16, label: 'Karnataka' },
    { id: 21, label: 'Maharashtra' },
  ],
  cities: [
    { id: 1, label: 'Bengaluru', stateId: 16 },
    { id: 2, label: 'Pune', stateId: 21 },
    { id: 3, label: 'Mumbai', stateId: 21 },
    { id: 4, label: 'Remote', stateId: 0 },
  ],
  workModes: [
    { id: 1, label: 'On-site' },
    { id: 2, label: 'Hybrid' },
    { id: 3, label: 'Remote' },
  ],
  employmentTypes: [
    { id: 1, label: 'Full-time' },
    { id: 2, label: 'Part-time' },
    { id: 3, label: 'Contract' },
  ],
  industryTypes: [
    { id: 1, label: 'Information Technology' },
    { id: 2, label: 'Banking' },
  ],
  skills: [
    { id: 1, label: 'React' },
    { id: 2, label: 'Node.js' },
    { id: 3, label: 'SQL' },
  ],
};

export let COMPANY_JOBS: JobListing[] = [
  { jobId: 101, designation: 'Frontend Engineer', designationId: 1, city: 'Bengaluru', cityId: 1, workMode: 'Hybrid', workModeId: 2, employmentType: 'Full-time', employmentTypeId: 1, industryTypeId: 1, description: 'Build and ship customer-facing UI.', candidateProfile: '', openings: 2, skillIds: [1], minExp: 3, minCtc: 1200000, maxCtc: 1800000, status: 'Active', applicants: 24, postedOn: '2026-06-20' },
  { jobId: 102, designation: 'Backend Engineer', designationId: 2, city: 'Pune', cityId: 2, workMode: 'Remote', workModeId: 3, employmentType: 'Full-time', employmentTypeId: 1, industryTypeId: 1, description: 'Own the core API and data layer.', candidateProfile: '', openings: 1, skillIds: [2, 3], minExp: 4, minCtc: 1500000, maxCtc: 2200000, status: 'Active', applicants: 18, postedOn: '2026-06-25' },
  { jobId: 103, designation: 'QA Analyst', designationId: 3, city: 'Bengaluru', cityId: 1, workMode: 'On-site', workModeId: 1, employmentType: 'Full-time', employmentTypeId: 1, industryTypeId: 1, description: 'Own test planning and release quality.', candidateProfile: '', openings: 1, skillIds: [], minExp: 2, minCtc: 800000, maxCtc: 1200000, status: 'Closed', applicants: 9, postedOn: '2026-07-01' },
];

export function updateCompanyJob(jobId: number, patch: Partial<JobListing>) {
  COMPANY_JOBS = COMPANY_JOBS.map((j) => (j.jobId === jobId ? { ...j, ...patch } : j));
}
export function deactivateCompanyJob(jobId: number) {
  updateCompanyJob(jobId, { status: 'Closed' });
}

/* ------------------------- Public job search ---------------------------- */

/**
 * The REAL master lists, taken from the restored database — not invented.
 *
 * A job has no "function": tblMstrDesignation is only (DesignationID, Descr), and the
 * SubFunction -> Function chain hangs off the CANDIDATE side. So a job is searchable by
 * designation, industry and city, and these are the actual values in the data.
 */
export const JOB_DESIGNATIONS = [
  'Aws Solution Architect',
  'Azure Solution Architect',
  'Data Base Administrator',
  'Project Manager',
  'Software Developer',
  'Team Leader',
  'Trainee',
];

export const JOB_INDUSTRIES = ['Banking', 'IT', 'Real Estate', 'Retail'];

export const JOB_LOCATIONS = [
  'Amritsar',
  'Arga',
  'Delhi',
  'Faridabad',
  'Gurgaon',
  'Noida',
  'Sonipat',
];

export const JOB_STATES = ['Delhi', 'Haryana', 'Punjab', 'Uttar Pradesh'];

export const JOB_CITY_BY_STATE: Record<string, string[]> = {
  Delhi: ['Delhi'],
  Haryana: ['Faridabad', 'Gurgaon', 'Sonipat'],
  Punjab: ['Amritsar'],
  'Uttar Pradesh': ['Arga', 'Noida'],
};

const COMPANIES = ['aajiveka', 'Globex Corp', 'Initech Solutions'];
const WORK_MODES = ['Work From Home', 'Work From Office', 'Hybrid'];
const EMPLOYMENT_TYPES = ['Full Time', 'Part Time'];

/** Deterministic pool covering every (designation, location) pair. */
export const PUBLIC_JOBS: PublicJob[] = JOB_DESIGNATIONS.flatMap((designation, d) =>
  JOB_LOCATIONS.map((city, c) => {
    const i = d * JOB_LOCATIONS.length + c;
    const minCtc = 400000 + (i % 10) * 150000;
    return {
      jobId: 500 + i,
      designation,
      company: COMPANIES[i % COMPANIES.length],
      industry: JOB_INDUSTRIES[i % JOB_INDUSTRIES.length],
      city,
      workMode: WORK_MODES[i % WORK_MODES.length],
      employmentType: EMPLOYMENT_TYPES[i % EMPLOYMENT_TYPES.length],
      minExp: i % 8,
      minCtc,
      maxCtc: minCtc + 600000,
      postedOn: `2026-0${(i % 7) + 1}-${((i % 27) + 1).toString().padStart(2, '0')}`,
    };
  }),
);

const FIRST = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rohit', 'Kavya', 'Arjun', 'Divya', 'Sameer', 'Nisha'];
const LAST = ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Nair', 'Gupta', 'Mehta', 'Rao', 'Joshi', 'Khan'];
const DES = ['Software Engineer', 'Data Analyst', 'Product Manager', 'UX Designer', 'DevOps Engineer', 'QA Analyst'];
const CITY = ['Pune', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Delhi', 'Chennai'];
const STATUS = ['Applied', 'Shortlisted', 'Interview', 'Rejected'];

/** 57 deterministic candidate rows for the paginated listing. */
export const CANDIDATE_ROWS: CandidateRow[] = Array.from({ length: 57 }, (_, i) => ({
  subscriberId: 1000 + i,
  fullName: `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`,
  designation: DES[i % DES.length],
  city: CITY[i % CITY.length],
  experience: `${(i % 12) + 1} yrs`,
  jobStatus: STATUS[i % STATUS.length],
  appliedOn: `2026-0${(i % 6) + 1}-${((i % 27) + 1).toString().padStart(2, '0')}`,
}));

/** Applicants for the company's jobs — mutable so the mock shortlist/reject endpoint can flip status. */
export let APPLICANT_ROWS: (CandidateRow & { jobSubscriberMapId: number })[] = CANDIDATE_ROWS.slice(0, 20).map(
  (r, i) => ({ ...r, jobStatus: 'Applied', jobSubscriberMapId: 9000 + i }),
);
export function decideApplicant(jobSubscriberMapId: number, decision: 'Shortlisted' | 'Rejected') {
  APPLICANT_ROWS = APPLICANT_ROWS.map((r) =>
    r.jobSubscriberMapId === jobSubscriberMapId ? { ...r, jobStatus: decision } : r,
  );
}

// The real shape: spQC1GetDashboardData reports what registrations are still MISSING, not
// an approval funnel. The old mock invented pending/approved/rejected and the dashboard
// rendered blank the moment it met the real API.
export const QC1_STATS: QC1Stats = {
  total: 10,
  cvMissing: 5,
  educationMissing: 8,
  employmentMissing: 10,
};

export const APPLIED_JOBS = [
  { jobId: 101, designation: 'Senior Software Engineer', company: 'Acme Technologies', city: 'Bengaluru', appliedOn: '2026-06-20', status: 'Interview' },
  { jobId: 102, designation: 'Full Stack Developer', company: 'Globex', city: 'Pune', appliedOn: '2026-06-12', status: 'Shortlisted' },
  { jobId: 103, designation: 'React Developer', company: 'Initech', city: 'Remote', appliedOn: '2026-05-30', status: 'Applied' },
  { jobId: 104, designation: 'Frontend Lead', company: 'Umbrella Corp', city: 'Hyderabad', appliedOn: '2026-05-18', status: 'Rejected' },
] as const;

export const DOCUMENT_TYPES = [
  { documentTypeId: 1, name: 'Aadhaar Card' },
  { documentTypeId: 2, name: 'PAN Card' },
  { documentTypeId: 3, name: 'Resume / CV' },
  { documentTypeId: 4, name: 'Degree Certificate' },
  { documentTypeId: 5, name: 'Experience Letter' },
  { documentTypeId: 6, name: 'Passport' },
];

export let CANDIDATE_DOCUMENTS: {
  documentId: number; documentTypeId: number | null;
  name: string; status: 'Pending' | 'Uploaded' | 'Verified' | 'Rejected'; uploadedOn: string | null;
}[] = [
  { documentId: 1, documentTypeId: 1, name: 'Aadhaar Card', status: 'Verified', uploadedOn: '2026-06-01' },
  { documentId: 2, documentTypeId: 2, name: 'PAN Card', status: 'Verified', uploadedOn: '2026-06-01' },
  { documentId: 3, documentTypeId: 3, name: 'Resume / CV', status: 'Uploaded', uploadedOn: '2026-06-05' },
  { documentId: 4, documentTypeId: 4, name: 'Degree Certificate', status: 'Pending', uploadedOn: null },
  { documentId: 5, documentTypeId: 5, name: 'Experience Letter', status: 'Rejected', uploadedOn: '2026-06-03' },
];
export function assignDocumentTypes(documentTypeIds: number[]) {
  const already = new Set(CANDIDATE_DOCUMENTS.map((d) => d.documentTypeId));
  const toAdd = documentTypeIds.filter((id) => !already.has(id));
  CANDIDATE_DOCUMENTS = [
    ...CANDIDATE_DOCUMENTS,
    ...toAdd.map((documentTypeId, i) => ({
      documentId: CANDIDATE_DOCUMENTS.length + i + 1,
      documentTypeId,
      name: DOCUMENT_TYPES.find((d) => d.documentTypeId === documentTypeId)?.name ?? '',
      status: 'Pending' as const,
      uploadedOn: null,
    })),
  ];
}
export function uploadCandidateDocument(documentTypeId: number) {
  CANDIDATE_DOCUMENTS = CANDIDATE_DOCUMENTS.map((d) =>
    d.documentTypeId === documentTypeId
      ? { ...d, status: 'Uploaded' as const, uploadedOn: new Date().toISOString().slice(0, 10) }
      : d,
  );
}

/** Jobs the demo candidate has applied to, mutable so the mock apply endpoint can append. */
export let APPLIED_JOB_LIST: { jobId: number; designation: string; company: string; city: string; appliedOn: string; status: string }[] =
  [...APPLIED_JOBS];
export function addAppliedJob(job: PublicJob) {
  APPLIED_JOB_LIST = [
    { jobId: job.jobId, designation: job.designation, company: job.company, city: job.city, appliedOn: new Date().toISOString().slice(0, 10), status: 'Applied' },
    ...APPLIED_JOB_LIST,
  ];
}

/** Thin active-job list for the QC "assign job" picker (assign-job.aspx). */
export const ACTIVE_JOBS = COMPANY_JOBS.filter((j) => j.status === 'Active').map((j) => ({
  jobId: j.jobId,
  designation: j.designation,
  company: 'Acme Technologies Pvt. Ltd.',
}));

export let JOB_ALERTS = [
  { alertId: 1, keyword: 'React Developer', location: 'Pune', frequency: 'Daily' as const },
  { alertId: 2, keyword: 'Frontend Engineer', location: 'Remote', frequency: 'Weekly' as const },
];
export function addJobAlert(a: { keyword: string; location: string; frequency: 'Daily' | 'Weekly' }) {
  const alert = { alertId: JOB_ALERTS.length + 1, ...a };
  JOB_ALERTS = [...JOB_ALERTS, alert];
  return alert;
}

export let INTERVIEWS: {
  interviewId: number; interviewStatusId: number; jobSubscriberMapId: number | null;
  candidate: string; designation: string; company: string;
  mode: 'In-person' | 'Telephonic' | 'Video'; scheduledAt: string; location?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}[] = [
  { interviewId: 1, interviewStatusId: 1, jobSubscriberMapId: 9001, candidate: 'Rahul Sharma', designation: 'Senior Software Engineer', company: 'Acme Technologies', mode: 'Video', scheduledAt: '2026-07-15 11:00', status: 'Scheduled' },
  { interviewId: 2, interviewStatusId: 2, jobSubscriberMapId: 9002, candidate: 'Priya Patel', designation: 'Data Analyst', company: 'Globex', mode: 'Telephonic', scheduledAt: '2026-07-16 15:30', status: 'Scheduled' },
  { interviewId: 3, interviewStatusId: 3, jobSubscriberMapId: 9003, candidate: 'Amit Reddy', designation: 'Product Manager', company: 'Initech', mode: 'In-person', scheduledAt: '2026-07-10 10:00', status: 'Completed' },
  { interviewId: 4, interviewStatusId: 4, jobSubscriberMapId: 9004, candidate: 'Sneha Iyer', designation: 'UX Designer', company: 'Umbrella Corp', mode: 'Video', scheduledAt: '2026-07-09 14:00', status: 'Cancelled' },
];
export function updateInterviewStatus(interviewStatusId: number, status: 'Completed' | 'Cancelled') {
  INTERVIEWS = INTERVIEWS.map((i) => (i.interviewStatusId === interviewStatusId ? { ...i, status } : i));
}
export function addInterview(i: { jobSubscriberMapId: number; interviewModeId: number; interviewTime: string; location?: string }) {
  const eligible = ELIGIBLE_APPLICATIONS.find((e) => e.jobSubscriberMapId === i.jobSubscriberMapId);
  const mode = INTERVIEW_MODES.find((m) => m.id === i.interviewModeId)?.label as 'In-person' | 'Telephonic' | 'Video' | undefined;
  const interview = {
    interviewId: INTERVIEWS.length + 1,
    interviewStatusId: INTERVIEWS.length + 1,
    jobSubscriberMapId: i.jobSubscriberMapId,
    candidate: eligible?.candidate ?? '',
    designation: eligible?.designation ?? '',
    company: eligible?.company ?? '',
    mode: mode ?? 'Video',
    scheduledAt: i.interviewTime.replace('T', ' '),
    location: i.location,
    status: 'Scheduled' as const,
  };
  INTERVIEWS = [interview, ...INTERVIEWS];
  ELIGIBLE_APPLICATIONS = ELIGIBLE_APPLICATIONS.filter((e) => e.jobSubscriberMapId !== i.jobSubscriberMapId);
  return interview;
}

export const INTERVIEW_MODES = [
  { id: 1, label: 'In-person' },
  { id: 2, label: 'Telephonic' },
  { id: 3, label: 'Video' },
];

export let ELIGIBLE_APPLICATIONS = [
  { jobSubscriberMapId: 9005, candidate: 'Vikram Nair', designation: 'DevOps Engineer', company: 'Initech Solutions' },
  { jobSubscriberMapId: 9006, candidate: 'Anjali Gupta', designation: 'QA Analyst', company: 'Globex Corp' },
];

export let DOC_REVIEWS: CandidateDocReview[] = [
  { documentId: 1, candidate: 'Rahul Sharma', document: 'Aadhaar Card', status: 'Pending' },
  { documentId: 2, candidate: 'Rahul Sharma', document: 'Degree Certificate', status: 'Pending' },
  { documentId: 3, candidate: 'Priya Patel', document: 'PAN Card', status: 'Verified' },
  { documentId: 4, candidate: 'Amit Reddy', document: 'Experience Letter', status: 'Pending' },
];
export function reviewDoc(documentId: number, status: 'Verified' | 'Rejected') {
  DOC_REVIEWS = DOC_REVIEWS.map((d) => (d.documentId === documentId ? { ...d, status } : d));
}
