/** Fixtures mirroring the candidates drawn in the "Q1 Flow" Figma frames. */

export const Q1_STATS = {
  newCandidates: 2,
  newToday: 2,
  pendingScreening: 2,
  followUpsDue: 1,
  followUpsDueToday: 1,
  verified: 1,
  verifiedToday: 1,
  notInterested: 1,
};

export const Q1_NAV_COUNTS = { candidates: 8, followUps: 2 };

export const Q1_ROW_NEW = {
  subscriberId: 1,
  fullName: 'Jatinder Singh',
  designation: 'Senior UI/UX Designer',
  city: 'Chandigarh, India',
  totalExperience: 10,
  currentCompany: 'Secninjaz Technologies',
  profileCompleteness: 100,
  cvAvailable: true,
  receivedAt: '2026-09-02T10:30:00.000Z',
  priority: 'High',
  status: 'New',
};

export const Q1_ROW_INCOMPLETE = {
  subscriberId: 3,
  fullName: 'Anuranjan Kumar',
  designation: 'Machine Learning Engineer',
  city: 'Pune, India',
  totalExperience: 3,
  currentCompany: 'Fractal Analytics',
  profileCompleteness: 50,
  cvAvailable: false,
  receivedAt: '2026-09-01T18:44:00.000Z',
  priority: 'Medium',
  status: 'Incomplete',
};

const BASE_PROFILE = {
  subscriberId: 1,
  fullName: 'Jatinder Singh',
  email: 'js.masoun@gmail.com',
  mobile: '+91 87009 03459',
  gender: 'Male',
  city: 'Chandigarh, India',
  designation: 'Senior UI/UX Designer',
  totalExperience: '10',
  photoUrl: null,
  currentCompany: 'Secninjaz Technologies',
  currentDesignation: 'Senior UI/UX Designer',
  noticePeriod: 30,
  resumeFileName: 'Jatinder_Singh_Resume.pdf',
  resumeUploadedAt: '01 Sep 2026',
  skills: ['UI/UX', 'Figma', 'HTML'],
  education: [{ degree: 'M.Des Interaction Design', institute: 'IIT Guwahati', year: '2015' }],
  experience: [
    { company: 'Secninjaz Technologies', designation: 'Senior UI/UX Designer', from: '2023', to: 'Present' },
  ],
  dateOfBirth: '1990-03-14',
  linkedInUrl: 'linkedin.com/in/jatinderux',
  profileSummary: 'Senior product designer with a decade of experience.',
  professionalTitle: 'Senior UI/UX Designer',
  expectedSalary: 3000000,
  previousCompanies: ['Infosys'],
  relevantExpMonths: 96,
};

const SCREENING = {
  status: 'Screening',
  priority: 'High',
  checklist: {
    nameVerified: true,
    cvAvailable: true,
    designationVerified: false,
    experienceChecked: true,
    educationChecked: true,
    skillsReviewed: true,
    locationVerified: false,
  },
  checklistDone: 5,
  checklistTotal: 7,
  checklistPercent: 71,
  followUpDate: null,
  followUpTime: null,
  contactAttempts: 0,
  nextAttemptAt: null,
  notInterestedReason: null,
  verifiedAt: null,
};

/** The "Profile view for new candidate" frame: 100%, nothing missing. */
export const Q1_PROFILE_COMPLETE = {
  ...BASE_PROFILE,
  profileCompleteness: 100,
  missingItems: [] as string[],
  screening: SCREENING,
};

/** The "Profile Incomplete" frame: 50%, four missing items and no CV. */
export const Q1_PROFILE_INCOMPLETE = {
  ...BASE_PROFILE,
  subscriberId: 3,
  fullName: 'Anuranjan Kumar',
  designation: 'Machine Learning Engineer',
  currentDesignation: 'Machine Learning Engineer',
  city: 'Pune, India',
  mobile: '+91 99881 22110',
  noticePeriod: null,
  expectedSalary: null,
  linkedInUrl: null,
  resumeFileName: null,
  resumeUploadedAt: null,
  relevantExpMonths: null,
  profileCompleteness: 50,
  missingItems: [
    'Missing CV',
    'Missing salary information',
    'Notice period not provided',
    'LinkedIn URL missing',
  ],
  screening: { ...SCREENING, status: 'Incomplete' },
};

export const Q1_ANALYTICS = {
  kpis: {
    candidatesScreened: 9,
    screenedThisWeek: 12,
    verificationRate: 11,
    avgScreeningMinutes: 84,
    cvAvailability: 89,
  },
  screeningsThisWeek: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    values: [8, 12, 9, 11, 10, 4, 2],
    total: 56,
  },
  profileCompletion: [
    { label: '100% complete', percent: 33 },
    { label: '75–99%', percent: 44 },
    { label: '50–74%', percent: 22 },
    { label: '< 50%', percent: 0 },
  ],
  byStatus: [
    { label: 'New', count: 2 },
    { label: 'Verified', count: 1 },
  ],
  funnel: [
    { label: 'Signed up', count: 128, percent: 100 },
    { label: 'Verified', count: 38, percent: 30 },
  ],
};
