/** Fixtures mirroring the jobs and applicants drawn in the "Q2" Figma frames. */

export const Q2_STATS = {
  activeJobs: 4,
  totalApplicants: 10,
  relevantMatches: 7,
  forwardedToQ3: 0,
  sentBackToQ1: 0,
};

export const Q2_NAV_COUNTS = { employerJobs: 4, allApplicants: 10 };

export const Q2_SLA = { total: 10, matched: 7, awaiting: 3 };

export const Q2_JOB_ROWS = [
  {
    jobId: 1,
    title: 'Senior UI/UX Designer',
    company: 'Secninjaz Technologies',
    location: 'Chandigarh, India',
    minExp: 6,
    maxExp: 10,
    workMode: 'Hybrid',
    applicants: 2,
    relevant: 1,
    topMatch: 94,
  },
  {
    jobId: 2,
    title: 'Senior Software Engineer — Full-Stack',
    company: 'Infosys',
    location: 'Pune, India',
    minExp: 4,
    maxExp: 8,
    workMode: 'Remote',
    applicants: 4,
    relevant: 3,
    topMatch: 92,
  },
  {
    jobId: 3,
    title: 'Senior Product Manager',
    company: 'Razorpay',
    location: 'Bengaluru, India',
    minExp: 6,
    maxExp: 10,
    workMode: 'Onsite',
    applicants: 1,
    relevant: 1,
    topMatch: 95,
  },
  {
    jobId: 4,
    title: 'DevOps Engineer',
    company: 'Postman',
    location: 'Chennai, India',
    minExp: 4,
    maxExp: 7,
    workMode: 'Remote',
    applicants: 3,
    relevant: 2,
    topMatch: 94,
  },
];

/** The ten All Applicants rows, in the design's order. Seven clear the ≥ 60% relevance cut. */
export const Q2_APPLICANT_ROWS = [
  { mapId: 101, subscriberId: 11, jobId: 3, name: 'Priya Nair', currentDesignation: 'Senior Product Manager', jobTitle: 'Senior Product Manager', company: 'Razorpay', totalScore: 95, profileCompleteness: 100 },
  { mapId: 102, subscriberId: 12, jobId: 1, name: 'Jatinder Singh', currentDesignation: 'Senior UI/UX Designer', jobTitle: 'Senior UI/UX Designer', company: 'Secninjaz Technologies', totalScore: 94, profileCompleteness: 100 },
  { mapId: 103, subscriberId: 13, jobId: 4, name: 'Arjun Mehta', currentDesignation: 'DevOps Engineer', jobTitle: 'DevOps Engineer', company: 'Postman', totalScore: 94, profileCompleteness: 100 },
  { mapId: 104, subscriberId: 14, jobId: 2, name: 'Rahul Sharma', currentDesignation: 'Senior Software Engineer', jobTitle: 'Senior Software Engineer — Full-Stack', company: 'Infosys', totalScore: 92, profileCompleteness: 82 },
  { mapId: 105, subscriberId: 15, jobId: 4, name: 'Nishu Kumar', currentDesignation: 'Technical Lead', jobTitle: 'DevOps Engineer', company: 'Postman', totalScore: 75, profileCompleteness: 75 },
  { mapId: 106, subscriberId: 16, jobId: 2, name: 'Ishita Verma', currentDesignation: 'Graduate Trainee — Frontend', jobTitle: 'Senior Software Engineer — Full-Stack', company: 'Infosys', totalScore: 72, profileCompleteness: 80 },
  { mapId: 107, subscriberId: 15, jobId: 2, name: 'Nishu Kumar', currentDesignation: 'Technical Lead', jobTitle: 'Senior Software Engineer — Full-Stack', company: 'Infosys', totalScore: 69, profileCompleteness: 75 },
  { mapId: 108, subscriberId: 17, jobId: 2, name: 'Anuranjan Kumar', currentDesignation: 'Machine Learning Engineer', jobTitle: 'Senior Software Engineer — Full-Stack', company: 'Infosys', totalScore: 51, profileCompleteness: 50 },
  { mapId: 109, subscriberId: 18, jobId: 1, name: 'Sana Kapoor', currentDesignation: 'Content Strategist', jobTitle: 'Senior UI/UX Designer', company: 'Secninjaz Technologies', totalScore: 50, profileCompleteness: 90 },
  { mapId: 110, subscriberId: 19, jobId: 4, name: 'Meera Iyer', currentDesignation: 'Operations Executive', jobTitle: 'DevOps Engineer', company: 'Postman', totalScore: 43, profileCompleteness: 60 },
].map((r) => ({ ...r, relevant: r.totalScore >= 60, status: 'New' as const }));

export const Q2_JOB_INFO = {
  jobId: 1,
  title: 'Senior UI/UX Designer',
  company: 'Secninjaz Technologies',
  location: 'Chandigarh, India',
  description:
    'Own end-to-end product design for our B2B SaaS suite — from discovery to polished, shippable flows. Build and maintain the design system, partner closely with engineering, and mentor junior designers.',
  jobType: 'Full-time',
  workMode: 'Hybrid',
  minExp: 6,
  maxExp: 10,
  minCTC: 2_400_000,
  maxCTC: 3_200_000,
  qualification: "Bachelor's in Design / HCI or related",
  postedOn: '2026-08-28T00:00:00.000Z',
  requiredSkills: ['Figma', 'Design Systems', 'Prototyping', 'UI/UX', 'HTML/CSS'],
};

export const Q2_JOB_APPLICANTS = {
  job: Q2_JOB_INFO,
  totalApplicants: 2,
  applicants: [
    { mapId: 102, subscriberId: 12, name: 'Jatinder Singh', designation: 'Senior UI/UX Designer', totalExp: 10, totalScore: 94, relevant: true, profileCompleteness: 100, hasCv: true, rank: 1 },
    { mapId: 109, subscriberId: 18, name: 'Sana Kapoor', designation: 'Content Strategist', totalExp: 4, totalScore: 50, relevant: false, profileCompleteness: 90, hasCv: true, rank: 2 },
  ],
};

/**
 * Jatinder Singh's detail, in the state the Figma draws it: only Job Role Match ticked, so
 * "1/7 criteria" and a renormalised Total Match Score of 98%.
 */
export const Q2_APPLICATION = {
  mapId: 102,
  subscriberId: 12,
  status: 'New' as const,
  overallScore: 98,
  candidate: {
    name: 'Jatinder Singh',
    designation: 'Senior UI/UX Designer',
    email: 'jatinder.singh@email.com',
    phone: '+91 98765 43210',
    location: 'Chandigarh, India',
    totalExp: 10,
    education: 'B.Des (HCI)',
    noticePeriod: 30,
    profileCompleteness: 100,
    skills: ['Figma', 'Design Systems', 'Prototyping', 'UI/UX', 'HTML/CSS', 'User Research'],
    resume: {
      name: 'Jatinder_Singh_Resume.pdf',
      path: 'resumes/jatinder-singh.pdf',
      sizeBytes: 240_000,
      pageCount: 2,
    },
  },
  job: {
    jobId: 1,
    title: 'Senior UI/UX Designer',
    company: 'Secninjaz Technologies',
    location: 'Chandigarh, India',
    description: Q2_JOB_INFO.description,
    jobType: 'Full-time',
    workMode: 'Hybrid',
    minExp: 6,
    maxExp: 10,
    minCTC: 2_400_000,
    maxCTC: 3_200_000,
    qualification: 'B.Des / HCI',
    requiredSkills: ['Figma', 'Design Systems', 'Prototyping', 'UI/UX', 'HTML/CSS'],
  },
  scoring: {
    criteria: [
      { key: 'skill' as const, label: 'Skill Match', weight: 0.3, score: 96, included: false },
      { key: 'experience' as const, label: 'Experience Match', weight: 0.25, score: 95, included: false },
      { key: 'jobRole' as const, label: 'Job Role Match', weight: 0.2, score: 98, included: true },
      { key: 'education' as const, label: 'Education', weight: 0.1, score: 90, included: false },
      { key: 'location' as const, label: 'Location', weight: 0.05, score: 95, included: false },
      { key: 'salary' as const, label: 'Salary', weight: 0.05, score: 86, included: false },
      { key: 'noticePeriod' as const, label: 'Notice Period', weight: 0.05, score: 82, included: false },
    ],
    totalScore: 98,
    selectedCount: 1,
    criteriaCount: 7,
  },
  coverage: {
    matched: ['Figma', 'Design Systems', 'Prototyping', 'UI/UX', 'HTML/CSS'],
    missing: [],
    requiredSkills: ['Figma', 'Design Systems', 'Prototyping', 'UI/UX', 'HTML/CSS'],
    reasons: [
      '10 yrs relevant experience',
      'Strong Figma & Design Systems depth',
      'Location matches Chandigarh, India',
    ],
  },
};

export const Q2_ANALYTICS = {
  activeJobs: 4,
  totalApplications: 10,
  scoredApplications: 10,
  relevantMatches: 7,
  relevantThreshold: 60,
  averageMatch: 74,
  distribution: [
    { band: '90–100', count: 4 },
    { band: '60–89', count: 3 },
    { band: '50–59', count: 2 },
    { band: 'Below 50', count: 1 },
  ],
  decisions: { awaiting: 10, forwardedToQ3: 0, sentBackToQ1: 0, rejected: 0 },
  criteria: [
    { key: 'skill' as const, label: 'Skill Match', weight: 0.3, average: 74 },
    { key: 'experience' as const, label: 'Experience Match', weight: 0.25, average: 71 },
    { key: 'jobRole' as const, label: 'Job Role Match', weight: 0.2, average: 68 },
    { key: 'education' as const, label: 'Education', weight: 0.1, average: 80 },
    { key: 'location' as const, label: 'Location', weight: 0.05, average: 66 },
    { key: 'salary' as const, label: 'Salary', weight: 0.05, average: 72 },
    { key: 'noticePeriod' as const, label: 'Notice Period', weight: 0.05, average: 78 },
  ],
};
