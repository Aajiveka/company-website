import { describe, expect, it } from 'vitest';
import type { CvEditProfile, CvMasters } from '../../../candidate.types';
import { buildResumeData } from '../resumeData';

const base = {
  personal: {
    fullName: 'pappu kumar',
    email: 'p@x.in',
    mobile: '62349',
    cityId: 1,
    dob: '',
    gender: 'M',
    address: '',
    photoUrl: null,
  },
  professional: {
    tagNames: [],
    totalExp: 0,
    totalExpMonths: 0,
    preferredCityIds: [],
    noticePeriod: 0,
  },
  careerProfile: { preferredCityIds: [] },
  personalDetails: {},
  headline: '',
  summary: '',
  employment: [],
  education: [],
  projects: [],
  itSkills: [],
  certificates: [],
  accomplishments: [],
  languages: [],
} as unknown as CvEditProfile;

const masters = { cities: [{ id: 1, label: 'Patna' }] } as unknown as CvMasters;

describe('buildResumeData', () => {
  it('calls a candidate with no experience and no jobs a fresher', () => {
    const d = buildResumeData(base, masters);
    expect(d.snapshot).toContainEqual({ label: 'Experience', value: 'Fresher' });
  });

  it('prints a zero notice period as immediately available, not "0 days"', () => {
    const d = buildResumeData(base, masters);
    expect(d.preferences).toContainEqual({
      label: 'Notice period',
      value: 'Immediately available',
    });
  });

  it('leaves out personal facts that were never filled in', () => {
    const d = buildResumeData(base, masters);
    expect(d.personal.map((f) => f.label)).toEqual(['Gender']);
  });

  it('marks an in-progress project as running to the present', () => {
    const cv = {
      ...base,
      projects: [
        {
          title: 'HRMS',
          projectStatus: 'In Progress',
          workedFromMonth: 1,
          workedFromYear: 2026,
          workedTillMonth: null,
          workedTillYear: null,
          skillsUsed: [],
        },
      ],
    } as unknown as CvEditProfile;
    expect(buildResumeData(cv, masters).projects[0]!.period).toBe('Jan 2026 – Present');
  });

  it('does not print salary, caste category or the diversity block', () => {
    const cv = {
      ...base,
      professional: { ...base.professional, currentCtc: 900000 },
      careerProfile: { preferredSalary: 1200000 },
      personalDetails: { category: 'OBC' },
      diversity: { disabilityStatus: 'Have disability' },
    } as unknown as CvEditProfile;
    const text = JSON.stringify(buildResumeData(cv, masters));
    expect(text).not.toMatch(/900000|1200000|OBC|disability/i);
  });

  it('prints a link without the tracking query a copied URL drags along', () => {
    const cv = {
      ...base,
      accomplishments: [
        {
          kind: 'ONLINE_PROFILE',
          title: 'LinkedIn',
          url: 'https://www.linkedin.com/in/rahul-sharma/?utm_source=chatgpt.com',
        },
      ],
    } as unknown as CvEditProfile;
    expect(buildResumeData(cv, masters).links[0]!.label).toBe('linkedin.com/in/rahul-sharma');
  });

  it('splits skills typed on separate lines', () => {
    const cv = {
      ...base,
      professional: { ...base.professional, tagNames: ['React, Node.js\nMongoDB'] },
      projects: [{ title: 'EMS', skillsUsed: ['TypeScript\nNode.js', 'JWT'] }],
    } as unknown as CvEditProfile;
    const d = buildResumeData(cv, masters);
    expect(d.skills).toEqual(['React', 'Node.js', 'MongoDB']);
    expect(d.projects[0]!.skills).toEqual(['TypeScript', 'Node.js', 'JWT']);
  });

  it('does not repeat a specialization the course already names', () => {
    const cv = {
      ...base,
      education: [
        {
          courseTypeId: 1,
          specialization: 'Computer Science',
          courseMode: 'Full Time',
          marks: '80',
        },
      ],
    } as unknown as CvEditProfile;
    const d = buildResumeData(cv, {
      ...masters,
      courses: [{ id: 1, label: 'Computer Science and Engineering' }],
    } as unknown as CvMasters);
    expect(d.education[0]!.detail).toBe('Computer Science and Engineering · Full Time');
    expect(d.education[0]!.marks).toBe('Percentage: 80%');
  });

  it('keeps a short specialization that only looks like part of a word in the course', () => {
    const cv = {
      ...base,
      education: [{ courseTypeId: 1, specialization: 'AI', courseMode: '', marks: '' }],
    } as unknown as CvEditProfile;
    const d = buildResumeData(cv, {
      ...masters,
      courses: [{ id: 1, label: 'Chemical Engineering' }],
    } as unknown as CvMasters);
    expect(d.education[0]!.detail).toBe('Chemical Engineering · AI');
  });
});
