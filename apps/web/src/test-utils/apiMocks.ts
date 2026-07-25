import type { Job, Candidate, Application, Notification } from '@/types/api';

// ---------------------------------------------------------------------------
// Factory functions for test data
// ---------------------------------------------------------------------------

export function createMockJob(overrides?: Partial<Job>): Job {
  return {
    id: 1,
    title: 'Software Engineer',
    company: 'TechCorp',
    companyId: 1,
    location: 'Mumbai',
    state: 'Maharashtra',
    district: 'Mumbai',
    minSalary: 500000,
    maxSalary: 1000000,
    minExperience: 2,
    maxExperience: 5,
    description: 'Build great software',
    requirements: 'React, TypeScript',
    workMode: 'remote',
    employmentType: 'full-time',
    status: 'active',
    postedAt: '2024-01-15T00:00:00Z',
    expiresAt: null,
    applicantCount: 10,
    ...overrides,
  };
}

export function createMockCandidate(overrides?: Partial<Candidate>): Candidate {
  return {
    userId: 1,
    fullName: 'Rahul Sharma',
    email: 'rahul@example.com',
    mobile: '9876543210',
    designation: 'Frontend Developer',
    totalExperience: 3,
    currentCtc: 600000,
    skills: ['React', 'TypeScript', 'Node.js'],
    state: 'Maharashtra',
    district: 'Pune',
    isOnboarded: true,
    ...overrides,
  };
}

export function createMockApplication(overrides?: Partial<Application>): Application {
  return {
    id: 1,
    jobId: 1,
    candidateId: 1,
    status: 'applied',
    appliedAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
    ...overrides,
  };
}

export function createMockNotification(overrides?: Partial<Notification>): Notification {
  return {
    id: 'notif-1',
    type: 'job_match',
    title: 'New job match',
    message: 'A new job matching your profile has been posted.',
    isRead: false,
    createdAt: '2024-02-10T08:30:00Z',
    ...overrides,
  };
}
