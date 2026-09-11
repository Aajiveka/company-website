/**
 * Q2's job-matching vocabulary (Figma "Q2" page).
 *
 * Q2 is the QC2 role — see `roles.ts`. Its screens rank *applications* (a candidate against
 * one job) rather than candidates, so everything here is keyed by JobSubscriberMapID.
 *
 * Like Q1's screening statuses, the review status below is a plain string in
 * tblApplicationMatchReview.Status rather than an id in tblMstrJobMappingStatus. That master's
 * ids 10 and 11 are seeded as "Interview passed to candidate/Client" in db/seed but inserted
 * as ON_HOLD / NEED_MORE_INFO by the figma_flow_gap_models migration, both ON CONFLICT DO
 * NOTHING — so a restored production database disagrees with a fresh dev one about what they
 * mean. Keeping Q2's own space out of that id space means it cannot inherit the ambiguity.
 *
 * The existing pipeline still moves: forwarding also writes JobMapStatus.REFERRED_TO_Q3 and
 * creates the tblCvReferral row via CvReferralService, so Q3's screens see it exactly as they
 * do today.
 */
export const MatchReviewStatus = {
  /** Scored and waiting for Q2's decision — the "New" pill in the Status column. */
  NEW: 'New',
  /** Q2 forwarded the CV to Q3. */
  FORWARDED: 'Forwarded',
  /** Profile incomplete — pushed back to Q1 to finish screening. */
  SENT_BACK: 'SentBackToQ1',
  /** Q2 rejected the application outright. */
  REJECTED: 'Rejected',
} as const;

export type MatchReviewStatusValue = (typeof MatchReviewStatus)[keyof typeof MatchReviewStatus];

export const MATCH_REVIEW_STATUSES = Object.values(
  MatchReviewStatus,
) as MatchReviewStatusValue[];

/** Statuses that have left Q2's queue — excluded from the "All Applicants" default list. */
export const DECIDED_STATUSES: MatchReviewStatusValue[] = [
  MatchReviewStatus.FORWARDED,
  MatchReviewStatus.SENT_BACK,
  MatchReviewStatus.REJECTED,
];

/**
 * "Relevant Matches — Match ≥ 60%", read off the Q2 dashboard card's own subtitle. The
 * Employer Jobs table's "n relevant" column and the "Relevant / Not Relevant" tabs and pills
 * all use this same cut, which is what reproduces the Figma's numbers (7 of 10 relevant).
 */
export const RELEVANT_THRESHOLD = 60;

export const isRelevant = (totalScore: number) => totalScore >= RELEVANT_THRESHOLD;

/**
 * The seven scoring criteria and their weights, in the order the Candidate Scoring panel
 * lists them. Identical to ScoringService's WEIGHTS and to the weights documented on
 * tblCandidateJobScore — declared here so Q2 can re-weight a *subset* without reaching into
 * the recruitment module.
 */
export const MATCH_CRITERIA = [
  { key: 'skill', label: 'Skill Match', weight: 0.3 },
  { key: 'experience', label: 'Experience Match', weight: 0.25 },
  { key: 'jobRole', label: 'Job Role Match', weight: 0.2 },
  { key: 'education', label: 'Education', weight: 0.1 },
  { key: 'location', label: 'Location', weight: 0.05 },
  { key: 'salary', label: 'Salary', weight: 0.05 },
  { key: 'noticePeriod', label: 'Notice Period', weight: 0.05 },
] as const;

export type MatchCriterionKey = (typeof MATCH_CRITERIA)[number]['key'];

export const MATCH_CRITERION_KEYS = MATCH_CRITERIA.map((c) => c.key) as MatchCriterionKey[];

/** `skill` -> `IncSkill`, the tblApplicationMatchReview column / Prisma field suffix. */
export const criterionColumn = (k: MatchCriterionKey) =>
  `inc${k[0].toUpperCase()}${k.slice(1)}` as const;

/**
 * The Candidate Scoring panel's "Tick the criteria to include in the match".
 *
 * The Figma shows only "Job Role Match" ticked, "1/7 criteria", and a Total Match Score of
 * 98% — the same number as the Job Role sub-score. So the total is the weighted average over
 * the *ticked* criteria with the weights renormalised to sum to 1, not the full weighted sum
 * scaled down. With nothing ticked there is no subset to average, and the design's default
 * state shows the full seven-criteria total, so that is what an empty selection returns.
 */
export function weightedScore(
  scores: Record<MatchCriterionKey, number>,
  included?: Partial<Record<MatchCriterionKey, boolean>>,
): number {
  const active = included
    ? MATCH_CRITERIA.filter((c) => included[c.key])
    : [...MATCH_CRITERIA];
  const criteria = active.length ? active : [...MATCH_CRITERIA];
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const weighted = criteria.reduce((sum, c) => sum + (scores[c.key] ?? 0) * c.weight, 0);
  return Math.round(weighted / totalWeight);
}
