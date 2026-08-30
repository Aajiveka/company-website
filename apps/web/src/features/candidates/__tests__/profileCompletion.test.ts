import { describe, expect, it } from 'vitest';
import type { CvEditProfile } from '../candidate.types';
import { computeCompletion, computeSections } from '../profileCompletion';

/** A profile with every weighted section satisfied. */
const fullCv = () =>
  ({
    personal: { fullName: 'Asha Verma', mobile: '9876543210', gender: 'F', cityId: 1, photoUrl: '/api/files/avatar/1?v=a.jpg' },
    professional: { subFunctionId: 3, skillId: null, totalExp: 4, tagNames: ['React'] },
    headline: 'Frontend engineer',
    summary: 'Builds portals.',
    employment: [{ subscriberEmployerId: 1 }],
    education: [{ subscriberEducationId: 1 }],
    itSkills: [{ subscriberItSkillId: 1 }],
    projects: [{ subscriberProjectId: 1 }],
    accomplishments: [{ subscriberAccomplishmentId: 1 }],
    certificates: [],
    careerProfile: { jobRole: 'Engineer', desiredJobType: [], preferredCityIds: [] },
    personalDetails: { maritalStatus: 'Single', category: null },
    languages: [{ subscriberLanguageId: 1 }],
    diversity: {},
  }) as unknown as CvEditProfile;

/** The same profile as a fresher: no roles, and zero total experience is how that is stored. */
const fresherCv = () => {
  const cv = fullCv();
  cv.professional = { ...cv.professional!, totalExp: 0, totalExpMonths: 0 };
  cv.employment = [];
  return cv;
};

describe('profileCompletion', () => {
  it('weights add up to 100 so the meter can be finished', () => {
    const total = computeSections(fullCv()).reduce((sum, s) => sum + s.weight, 0);
    expect(total).toBe(100);
  });

  // The fresher list is a section shorter, so its weights are the ones that can silently
  // stop adding up — and a meter that cannot reach 100% is exactly what this guards.
  it('weights add up to 100 on the fresher list too', () => {
    const total = computeSections(fresherCv()).reduce((sum, s) => sum + s.weight, 0);
    expect(total).toBe(100);
  });

  it('reads 100% once every section is filled', () => {
    const { sections, percent } = computeCompletion(fullCv());
    expect(sections.filter((s) => !s.done)).toEqual([]);
    expect(percent).toBe(100);
  });

  // Zero years is a fresher's real answer, not a blank field, and nothing may read it as one.
  it('reaches 100% for a fresher with no work experience', () => {
    expect(computeCompletion(fresherCv()).percent).toBe(100);
  });

  // The wizard drops the Work Experience step for a fresher, so a checklist row they can
  // never tick would be a dead end worth 14 points.
  it('drops the work-experience section for a fresher', () => {
    expect(computeSections(fresherCv()).find((s) => s.key === 'employment')).toBeUndefined();
    expect(computeSections(fullCv()).find((s) => s.key === 'employment')?.weight).toBe(14);
  });

  // Those 14 points land on the two sections a fresher can actually fill.
  it('moves the work-experience points to education and projects', () => {
    const sections = computeSections(fresherCv());
    expect(sections.find((s) => s.key === 'education')?.weight).toBe(21);
    expect(sections.find((s) => s.key === 'projects')?.weight).toBe(13);
  });

  // A saved role outranks the years: the section comes back, at its normal weight.
  it('scores employment normally once a role is saved, whatever the years say', () => {
    const cv = fresherCv();
    cv.employment = [{ subscriberEmployerId: 1 }] as unknown as CvEditProfile['employment'];
    const sections = computeSections(cv);
    expect(sections.find((s) => s.key === 'employment')?.weight).toBe(14);
    expect(sections.find((s) => s.key === 'education')?.weight).toBe(14);
    expect(computeCompletion(cv).percent).toBe(100);
  });

  // The photo is uploaded from the hero, not from the wizard, so it is easy to leave out of
  // a payload and not notice the score is capped.
  it('withholds the photo points until one is uploaded', () => {
    const cv = fullCv();
    cv.personal = { ...cv.personal!, photoUrl: null };
    expect(computeCompletion(cv).percent).toBe(92);
    expect(computeSections(cv).find((s) => s.key === 'photo')?.done).toBe(false);
  });

  it('scores an empty profile at 0%', () => {
    const empty = {
      personal: null,
      professional: null,
      headline: '',
      summary: '',
      employment: [],
      education: [],
      itSkills: [],
      projects: [],
      accomplishments: [],
      certificates: [],
      careerProfile: {},
      personalDetails: {},
      languages: [],
      diversity: {},
    } as unknown as CvEditProfile;
    expect(computeCompletion(empty).percent).toBe(0);
  });
});
