import type { CvEditProfile } from './candidate.types';
import { isFresherProfile } from './fresher';

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

/**
 * What a fresher's fourteen work-experience points become.
 *
 * A fresher has no roles to list, and the wizard drops the step that would collect them, so
 * scoring them on employment would hold every fresher fourteen points short of 100% with no
 * way to close the gap. The points go to what a fresher is actually screened on instead:
 * their education, and the projects that stand in for a job history. Split evenly — for
 * someone with no employer to name, a shipped project says as much as the degree does.
 *
 * The section itself is dropped rather than ticked: a green check against "Work experience"
 * on a profile that has none reads as a bug, not as an exemption.
 */
const FRESHER_WEIGHTS: Record<string, number> = { education: 21, projects: 13 };

export function computeSections(cv: CvEditProfile): CompletionSection[] {
  const fresher = isFresherProfile(cv);
  const p = cv.personal;
  const pr = cv.professional;
  const cp = cv.careerProfile ?? ({} as CvEditProfile['careerProfile']);
  // Marital status / category are commented out of the `languages` section below, so the
  // object they came from is unused for now. Restore both together.
  // const pd = cv.personalDetails ?? ({} as CvEditProfile['personalDetails']);
  const sections: CompletionSection[] = [
    {
      key: 'personalDetails',
      anchor: 'personal-details',
      weight: 12,
      done: !!(p && p.fullName && p.mobile && p.gender && p.cityId),
    },
    // A face on the profile is the one thing a recruiter sees before anything else, and it
    // is a single upload away — so it scores, and the hero's pencil is the way in.
    { key: 'photo', anchor: 'personal-details', weight: 8, done: !!text(p?.photoUrl).trim() },
    { key: 'headline', anchor: 'headline', weight: 8, done: !!text(cv.headline).trim() },
    { key: 'keySkills', anchor: 'key-skills', weight: 12, done: list(pr?.tagNames).length > 0 },
    { key: 'employment', anchor: 'employment', weight: 14, done: list(cv.employment).length > 0 },
    { key: 'education', anchor: 'education', weight: 14, done: list(cv.education).length > 0 },
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
      weight: 8,
      // Was `!!(pd.maritalStatus || pd.category) && ...`. Nothing in the redesigned portal
      // edits marital status or category, so that half of the condition could never be
      // satisfied and held every candidate 6 points short of 100%. Languages alone decide it
      // until an editor for those fields exists.
      done: list(cv.languages).length > 0,
    },
  ];

  if (!fresher) return sections;
  return sections
    .filter((s) => s.key !== 'employment')
    .map((s) => (FRESHER_WEIGHTS[s.key] ? { ...s, weight: FRESHER_WEIGHTS[s.key] } : s));
}

/**
 * The weights add up to exactly 100 — on both the experienced and the fresher list — so any
 * profile with every section filled reads 100%. `profileCompletion.test.ts` guards that for
 * each: a new section with a weight has to take its points from the existing ones, or the
 * meter can never be finished.
 */
export function computeCompletion(cv: CvEditProfile) {
  const sections = computeSections(cv);
  const percent = sections.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0);
  return { sections, percent };
}
