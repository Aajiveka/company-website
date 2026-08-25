import { describe, expect, it } from 'vitest';
import type { CvEditProfile } from '../candidate.types';
import { computeCompletion, computeSections } from '../profileCompletion';

/** A profile with every weighted section satisfied. */
const fullCv = () =>
  ({
    personal: { fullName: 'Asha Verma', mobile: '9876543210', gender: 'F', cityId: 1 },
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

describe('profileCompletion', () => {
  it('weights add up to 100 so the meter can be finished', () => {
    const total = computeSections(fullCv()).reduce((sum, s) => sum + s.weight, 0);
    expect(total).toBe(100);
  });

  it('reads 100% once every section is filled', () => {
    const { sections, percent } = computeCompletion(fullCv());
    expect(sections.filter((s) => !s.done)).toEqual([]);
    expect(percent).toBe(100);
  });

  // Zero years is a fresher's real answer, not a blank field: it must not cost them the
  // Professional Details section, which used to cap every fresher's profile at 90%.
  it('reaches 100% for a fresher with no work experience', () => {
    const cv = fullCv();
    cv.professional = { ...cv.professional!, totalExp: 0 };
    expect(computeCompletion(cv).percent).toBe(100);
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
