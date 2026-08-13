import type { CvEditProfile } from '../candidate.types';

/**
 * The "Resume Score" panel in the Figma resume builder.
 *
 * Scored on what an ATS and a recruiter actually look for, and reported per section so the
 * number is explainable — a bare 74 tells a candidate nothing about what to fix. Kept
 * separate from `profileCompletion`: that measures how much of the *profile* is filled in,
 * this measures how well the *resume* would read, and they weight sections differently.
 */

export type SectionState = 'complete' | 'partial' | 'missing';

export interface ScoreSection {
  key: string;
  label: string;
  weight: number;
  state: SectionState;
  /** Shown next to the section in the score panel. */
  hint: string;
}

const stateScore: Record<SectionState, number> = { complete: 1, partial: 0.5, missing: 0 };

export function computeResumeScore(cv: CvEditProfile) {
  const contactDone = !!(cv.personal?.fullName && cv.personal?.email && cv.personal?.mobile);
  const summaryLength = cv.summary?.trim().length ?? 0;
  const skillCount = cv.professional?.tagNames.length ?? 0;
  const describedRoles = cv.employment.filter((e) => e.jobDescr?.trim()).length;

  const sections: ScoreSection[] = [
    {
      key: 'contact',
      label: 'Contact info',
      weight: 15,
      state: contactDone ? 'complete' : cv.personal?.fullName ? 'partial' : 'missing',
      hint: contactDone ? 'complete' : 'add email and phone',
    },
    {
      key: 'summary',
      label: 'Summary',
      weight: 20,
      // Under ~200 characters is a sentence, not a summary — it reads as a stub to a recruiter.
      state: summaryLength >= 200 ? 'complete' : summaryLength > 0 ? 'partial' : 'missing',
      hint: summaryLength >= 200 ? 'complete' : summaryLength > 0 ? 'too short' : 'missing',
    },
    {
      key: 'experience',
      label: 'Experience',
      weight: 25,
      state: !cv.employment.length ? 'missing' : describedRoles === cv.employment.length ? 'complete' : 'partial',
      hint: !cv.employment.length
        ? 'missing'
        : describedRoles === cv.employment.length
          ? 'complete'
          : 'describe every role',
    },
    {
      key: 'education',
      label: 'Education',
      weight: 15,
      state: cv.education.length ? 'complete' : 'missing',
      hint: cv.education.length ? 'complete' : 'missing',
    },
    {
      key: 'skills',
      label: 'Skills',
      weight: 15,
      // Six-plus chips is roughly where keyword matching starts working in the candidate's favour.
      state: skillCount >= 6 ? 'complete' : skillCount > 0 ? 'partial' : 'missing',
      hint: skillCount >= 6 ? 'complete' : skillCount > 0 ? 'add more' : 'missing',
    },
    {
      key: 'certifications',
      label: 'Certifications',
      weight: 10,
      state: cv.certificates.length ? 'complete' : 'missing',
      hint: cv.certificates.length ? 'complete' : 'missing',
    },
  ];

  const score = Math.round(sections.reduce((sum, s) => sum + s.weight * stateScore[s.state], 0));

  return { score, sections };
}
