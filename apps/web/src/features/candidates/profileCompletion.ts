import type { CvEditProfile } from './candidate.types';

/**
 * How complete a candidate's profile is.
 *
 * Shared by the completion meter and the ring around the profile photo, which have to agree —
 * two independent scores for the same profile read as a bug. The weights are what a recruiter
 * screens on: who you are and what you have done outweigh the optional extras, but every
 * section is worth something, so filling one always moves the number.
 */

export interface CompletionSection {
  /** Translation key under `completion.` */
  key: string;
  /** Anchor of the matching section on the profile page. Several keys can share one. */
  anchor: string;
  weight: number;
  done: boolean;
}

/**
 * `CvEditProfile` says these are always present, but the CV is assembled from legacy tables
 * where a partially-migrated row can leave a section null. This runs on the critical path of
 * every portal screen — the banner needs the percentage — so one missing field must not take
 * the whole portal down with it.
 */
const list = <T,>(xs: T[] | null | undefined): T[] => (Array.isArray(xs) ? xs : []);
const text = (s: string | null | undefined): string => (typeof s === 'string' ? s : '');

export function computeSections(cv: CvEditProfile): CompletionSection[] {
  const p = cv.personal;
  const pr = cv.professional;
  const cp = cv.careerProfile ?? ({} as CvEditProfile['careerProfile']);
  const pd = cv.personalDetails ?? ({} as CvEditProfile['personalDetails']);
  return [
    {
      key: 'personalDetails',
      anchor: 'personal-details',
      weight: 10,
      done: !!(p && p.fullName && p.mobile && p.gender && p.cityId),
    },
    {
      key: 'professional',
      anchor: 'professional',
      weight: 10,
      done: !!(pr && (pr.subFunctionId || pr.skillId) && pr.totalExp > 0),
    },
    { key: 'headline', anchor: 'headline', weight: 8, done: !!text(cv.headline).trim() },
    { key: 'keySkills', anchor: 'key-skills', weight: 10, done: list(pr?.tagNames).length > 0 },
    { key: 'employment', anchor: 'employment', weight: 12, done: list(cv.employment).length > 0 },
    { key: 'education', anchor: 'education', weight: 12, done: list(cv.education).length > 0 },
    { key: 'itSkills', anchor: 'it-skills', weight: 8, done: list(cv.itSkills).length > 0 },
    { key: 'projects', anchor: 'projects', weight: 6, done: list(cv.projects).length > 0 },
    { key: 'summary', anchor: 'summary', weight: 8, done: !!text(cv.summary).trim() },
    {
      key: 'accomplishments',
      anchor: 'accomplishments',
      weight: 4,
      done: list(cv.accomplishments).length > 0 || list(cv.certificates).length > 0,
    },
    {
      key: 'careerProfile',
      anchor: 'career-profile',
      weight: 6,
      done: !!(cp.jobRole || list(cp.desiredJobType).length || list(cp.preferredCityIds).length),
    },
    {
      key: 'languages',
      anchor: 'personal-details',
      weight: 6,
      done: !!(pd.maritalStatus || pd.category) && list(cv.languages).length > 0,
    },
  ];
}

export function computeCompletion(cv: CvEditProfile) {
  const sections = computeSections(cv);
  const percent = sections.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0);
  return { sections, percent };
}
