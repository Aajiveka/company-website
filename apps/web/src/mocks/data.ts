import { Role, type RoleId } from '@/types/roles';
import type { AuthSession } from '@/features/auth/auth.types';
import type { CandidateProfile } from '@/features/candidates/candidate.types';
import type { CompanyProfile, JobListing } from '@/features/clients/client.types';
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

export const COMPANY_JOBS: JobListing[] = [
  { jobId: 101, designation: 'Frontend Engineer', city: 'Bengaluru', workMode: 'Hybrid', employmentType: 'Full-time', minExp: 3, minCtc: 1200000, maxCtc: 1800000, status: 'Open', applicants: 24, postedOn: '2026-06-20' },
  { jobId: 102, designation: 'Backend Engineer', city: 'Pune', workMode: 'Remote', employmentType: 'Full-time', minExp: 4, minCtc: 1500000, maxCtc: 2200000, status: 'Open', applicants: 18, postedOn: '2026-06-25' },
  { jobId: 103, designation: 'QA Analyst', city: 'Bengaluru', workMode: 'On-site', employmentType: 'Full-time', minExp: 2, minCtc: 800000, maxCtc: 1200000, status: 'Open', applicants: 9, postedOn: '2026-07-01' },
];

/* ------------------------- Public job search ---------------------------- */

/** Master lists behind the hero's Function / Location dropdowns (legacy ddlFunction / ddlCityState). */
export const JOB_FUNCTIONS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Human Resources',
  'Finance',
  'Operations',
  'Design',
  'Customer Support',
];

export const JOB_LOCATIONS = [
  'Pune',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Delhi',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
];

// Designations per function, so a filtered search returns coherent-looking roles.
const DESIGNATIONS_BY_FUNCTION: Record<string, string[]> = {
  Engineering: ['Frontend Engineer', 'Backend Engineer', 'DevOps Engineer', 'QA Analyst'],
  Sales: ['Sales Executive', 'Account Manager', 'Business Development Manager'],
  Marketing: ['Digital Marketing Executive', 'Content Strategist', 'SEO Analyst'],
  'Human Resources': ['HR Executive', 'Talent Acquisition Specialist', 'HR Business Partner'],
  Finance: ['Financial Analyst', 'Accountant', 'Audit Associate'],
  Operations: ['Operations Executive', 'Supply Chain Analyst', 'Process Manager'],
  Design: ['UX Designer', 'Graphic Designer', 'Product Designer'],
  'Customer Support': ['Support Executive', 'Customer Success Manager'],
};

const COMPANIES = ['Acme Technologies', 'Globex Corp', 'Initech Solutions', 'Umbrella Group', 'Stark Industries'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];
const EMPLOYMENT_TYPES = ['Full-time', 'Contract', 'Part-time'];

/**
 * Deterministic public job pool — one opening per (function, location, designation),
 * so every dropdown combination returns a handful of coherent results rather than one.
 */
export const PUBLIC_JOBS: PublicJob[] = JOB_FUNCTIONS.flatMap((jobFunction, f) =>
  JOB_LOCATIONS.flatMap((city, c) =>
    DESIGNATIONS_BY_FUNCTION[jobFunction].map((designation, d) => {
      const i = (f * JOB_LOCATIONS.length + c) * 4 + d;
      const minCtc = 400000 + (i % 10) * 150000;
      return {
        jobId: 500 + i,
        designation,
        company: COMPANIES[i % COMPANIES.length],
        jobFunction,
        city,
        workMode: WORK_MODES[i % WORK_MODES.length],
        employmentType: EMPLOYMENT_TYPES[i % EMPLOYMENT_TYPES.length],
        minExp: i % 8,
        minCtc,
        maxCtc: minCtc + 600000,
        postedOn: `2026-0${(i % 7) + 1}-${((i % 27) + 1).toString().padStart(2, '0')}`,
      };
    }),
  ),
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

export const QC1_STATS: QC1Stats = { pending: 34, approved: 128, rejected: 22, interview: 15 };

export const APPLIED_JOBS = [
  { jobId: 101, designation: 'Senior Software Engineer', company: 'Acme Technologies', city: 'Bengaluru', appliedOn: '2026-06-20', status: 'Interview' },
  { jobId: 102, designation: 'Full Stack Developer', company: 'Globex', city: 'Pune', appliedOn: '2026-06-12', status: 'Shortlisted' },
  { jobId: 103, designation: 'React Developer', company: 'Initech', city: 'Remote', appliedOn: '2026-05-30', status: 'Applied' },
  { jobId: 104, designation: 'Frontend Lead', company: 'Umbrella Corp', city: 'Hyderabad', appliedOn: '2026-05-18', status: 'Rejected' },
] as const;

export const CANDIDATE_DOCUMENTS = [
  { documentId: 1, name: 'Aadhaar Card', status: 'Verified', uploadedOn: '2026-06-01' },
  { documentId: 2, name: 'PAN Card', status: 'Verified', uploadedOn: '2026-06-01' },
  { documentId: 3, name: 'Resume / CV', status: 'Uploaded', uploadedOn: '2026-06-05' },
  { documentId: 4, name: 'Degree Certificate', status: 'Pending', uploadedOn: null },
  { documentId: 5, name: 'Experience Letter', status: 'Rejected', uploadedOn: '2026-06-03' },
] as const;

export let JOB_ALERTS = [
  { alertId: 1, keyword: 'React Developer', location: 'Pune', frequency: 'Daily' as const },
  { alertId: 2, keyword: 'Frontend Engineer', location: 'Remote', frequency: 'Weekly' as const },
];
export function addJobAlert(a: { keyword: string; location: string; frequency: 'Daily' | 'Weekly' }) {
  const alert = { alertId: JOB_ALERTS.length + 1, ...a };
  JOB_ALERTS = [...JOB_ALERTS, alert];
  return alert;
}

export const INTERVIEWS = [
  { interviewId: 1, candidate: 'Rahul Sharma', designation: 'Senior Software Engineer', company: 'Acme Technologies', mode: 'Video', scheduledAt: '2026-07-15 11:00', status: 'Scheduled' },
  { interviewId: 2, candidate: 'Priya Patel', designation: 'Data Analyst', company: 'Globex', mode: 'Telephonic', scheduledAt: '2026-07-16 15:30', status: 'Scheduled' },
  { interviewId: 3, candidate: 'Amit Reddy', designation: 'Product Manager', company: 'Initech', mode: 'In-person', scheduledAt: '2026-07-10 10:00', status: 'Completed' },
  { interviewId: 4, candidate: 'Sneha Iyer', designation: 'UX Designer', company: 'Umbrella Corp', mode: 'Video', scheduledAt: '2026-07-09 14:00', status: 'Cancelled' },
] as const;

export let DOC_REVIEWS: CandidateDocReview[] = [
  { documentId: 1, candidate: 'Rahul Sharma', document: 'Aadhaar Card', status: 'Pending' },
  { documentId: 2, candidate: 'Rahul Sharma', document: 'Degree Certificate', status: 'Pending' },
  { documentId: 3, candidate: 'Priya Patel', document: 'PAN Card', status: 'Verified' },
  { documentId: 4, candidate: 'Amit Reddy', document: 'Experience Letter', status: 'Pending' },
];
export function reviewDoc(documentId: number, status: 'Verified' | 'Rejected') {
  DOC_REVIEWS = DOC_REVIEWS.map((d) => (d.documentId === documentId ? { ...d, status } : d));
}
