import type { CvEditProfile } from './candidate.types';

/**
 * Whether the candidate answered "I'm a fresher" on step 1 of the wizard.
 *
 * There is no fresher flag in the schema — the answer is stored as zero total experience
 * (see `PersonalStep`), so that is what has to be read back. A saved employment row
 * outranks it: someone who has entered a job has work experience whatever the years say,
 * and must not lose the step or the score that goes with it.
 *
 * Lives on its own because two unrelated things ask the question: the wizard, deciding
 * whether to offer the Work Experience step, and profile completion, deciding whether to
 * score one.
 */
export function isFresherProfile(cv: CvEditProfile | null | undefined): boolean {
  if (!cv) return false;
  if (Array.isArray(cv.employment) && cv.employment.length > 0) return false;
  return !cv.professional?.totalExp && !cv.professional?.totalExpMonths;
}
