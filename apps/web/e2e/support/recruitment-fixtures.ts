/** Shared mock data for recruitment flow E2E specs. */

export const CANDIDATE_ROW = {
  subscriberId: 100,
  fullName: 'Ravi Kumar',
  designation: 'Software Engineer',
  city: 'Bengaluru',
  experience: '3 years',
  jobStatus: 'Active',
  appliedOn: '2026-08-15T10:00:00.000Z',
};

export const CANDIDATE_DETAIL = {
  subscriberId: 100,
  fullName: 'Ravi Kumar',
  email: 'ravi@example.com',
  mobile: '9876543210',
  gender: 'M',
  city: 'Bengaluru',
  designation: 'Software Engineer',
  totalExperience: '3 years',
  photoUrl: null,
  resumeHeadline: 'Full-stack developer with React and Node.js',
  currentCompany: 'InfoTech',
  currentDesignation: 'Software Engineer',
  currentCtc: 1200000,
  noticePeriod: 30,
  skills: ['React', 'Node.js', 'PostgreSQL'],
  education: [
    { degree: 'B.Tech', institute: 'IIT Delhi', year: 2023 },
  ],
  experience: [
    { designation: 'Software Engineer', company: 'InfoTech', from: '2023-07', to: 'Present' },
  ],
  registrationStatus: 'Pending',
};

export const REFERRAL_ROW = {
  referralId: 1,
  jobSubscriberMapId: 200,
  candidate: 'Ravi Kumar',
  designation: 'Software Engineer',
  company: 'TechCorp',
  status: 'Referred',
  referredAt: '2026-08-20T10:00:00.000Z',
  sentToCompanyAt: null,
  expiresAt: null,
};

export function referralRow(overrides: Partial<typeof REFERRAL_ROW> = {}) {
  return { ...REFERRAL_ROW, ...overrides };
}

export const INTERVIEW_ROUND = {
  roundId: 1,
  roundNumber: 1,
  roundName: 'Screening',
  interviewerName: 'Mr. Sharma',
  interviewModeId: 1,
  meetingLink: null,
  scheduledAt: '2026-09-01T10:00:00.000Z',
  status: 'Scheduled',
  result: 'Pending',
  companyFeedback: null,
  slots: [
    { slotId: 1, slotDateTime: '2026-09-01T10:00:00.000Z', isSelected: false },
    { slotId: 2, slotDateTime: '2026-09-01T14:00:00.000Z', isSelected: false },
    { slotId: 3, slotDateTime: '2026-09-02T10:00:00.000Z', isSelected: false },
  ],
};

export const OFFER_ROW = {
  offerId: 1,
  jobSubscriberMapId: 200,
  offerDetails: { salary: 1500000, designation: 'Software Engineer' },
  joiningDate: '2026-10-01',
  status: 'Sent',
  sentAt: '2026-09-10T10:00:00.000Z',
  candidateResponseAt: null,
};

export const DOCUMENT_ROW = {
  documentId: 1,
  candidate: 'Ravi Kumar',
  document: 'Aadhaar Card',
  status: 'Pending' as const,
};

export const SCORE_RESULT = {
  totalScore: 78,
  skillScore: 25,
  experienceScore: 20,
  jobRoleScore: 15,
  educationScore: 8,
  locationScore: 4,
  salaryScore: 3,
  noticePeriodScore: 3,
};

export const INTERVIEW_ROW = {
  interviewId: 1,
  interviewStatusId: 10,
  jobSubscriberMapId: 200,
  candidate: 'Ravi Kumar',
  designation: 'Software Engineer',
  company: 'TechCorp',
  mode: 'Video' as const,
  scheduledAt: '2026-09-01T10:00:00.000Z',
  status: 'Scheduled' as const,
};

export const ELIGIBLE_APPLICATION = {
  jobSubscriberMapId: 200,
  candidate: 'Ravi Kumar',
  designation: 'Software Engineer',
  company: 'TechCorp',
};

export const INTERVIEW_MODE = { id: 1, label: 'Video' };
