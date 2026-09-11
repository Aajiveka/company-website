import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  MATCH_CRITERIA,
  MATCH_CRITERION_KEYS,
  RELEVANT_THRESHOLD,
  criterionColumn,
  isRelevant,
  weightedScore,
  type MatchCriterionKey,
} from './matching';

/**
 * Jatinder Singh's sub-scores, read straight off the Q2 applicant-detail frame (172:5821) —
 * Skill 96, Experience 95, Job Role 98, Education 90, Location 95, Salary 86, Notice 82.
 */
const JATINDER: Record<MatchCriterionKey, number> = {
  skill: 96,
  experience: 95,
  jobRole: 98,
  education: 90,
  location: 95,
  salary: 86,
  noticePeriod: 82,
};

describe('match criteria', () => {
  it('carries the seven Figma criteria, weighted to exactly 1', () => {
    assert.equal(MATCH_CRITERIA.length, 7);
    const sum = MATCH_CRITERIA.reduce((a, c) => a + c.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  });

  it('lists them in the order the Candidate Scoring panel prints them', () => {
    assert.deepEqual(MATCH_CRITERION_KEYS, [
      'skill',
      'experience',
      'jobRole',
      'education',
      'location',
      'salary',
      'noticePeriod',
    ]);
  });

  it('maps a criterion to its tblApplicationMatchReview column', () => {
    assert.equal(criterionColumn('skill'), 'incSkill');
    assert.equal(criterionColumn('noticePeriod'), 'incNoticePeriod');
  });
});

describe('weightedScore', () => {
  /**
   * The design's header reads "Overall JD match 98%" and its Total Match Score also reads 98%
   * with "1/7 criteria" and only Job Role Match ticked — whose own sub-score is 98. That is
   * only consistent if the ticked subset is renormalised rather than scaled down: a plain
   * weighted sum over one 20%-weight criterion would show 20, not 98.
   */
  it('reproduces the Figma: only Job Role ticked gives 98%', () => {
    const total = weightedScore(JATINDER, { jobRole: true });
    assert.equal(total, 98);
  });

  it('renormalises any subset, not just a single criterion', () => {
    // Skill 30% and Experience 25% → (96*.30 + 95*.25) / .55 = 95.54 → 96
    assert.equal(weightedScore(JATINDER, { skill: true, experience: true }), 96);
  });

  it('scores all seven when no subset is ticked, so an untouched row shows the full total', () => {
    const all = weightedScore(JATINDER);
    assert.equal(weightedScore(JATINDER, {}), all);
    assert.equal(
      weightedScore(JATINDER, {
        skill: false,
        experience: false,
        jobRole: false,
        education: false,
        location: false,
        salary: false,
        noticePeriod: false,
      }),
      all,
    );
  });

  it('the full seven-criteria total is the ScoringService weighting', () => {
    // 96*.30 + 95*.25 + 98*.20 + 90*.10 + 95*.05 + 86*.05 + 82*.05 = 93.85 → 94
    assert.equal(weightedScore(JATINDER), 94);
  });

  it('treats a missing sub-score as zero rather than throwing', () => {
    const partial = { skill: 80 } as Record<MatchCriterionKey, number>;
    assert.equal(weightedScore(partial, { skill: true, salary: true }), 69);
  });
});

describe('relevance', () => {
  /**
   * "Relevant Matches — Match ≥ 60%" is the dashboard card's own subtitle, and it is the cut
   * the Employer Jobs "n relevant" column and the Relevant / Not Relevant tabs share. The
   * Figma's ten applicants score 95, 94, 94, 92, 75, 72, 69, 51, 50 and 43 — seven at or above
   * 60, which is exactly what the Relevant Matches card shows.
   */
  it('cuts at 60', () => {
    assert.equal(RELEVANT_THRESHOLD, 60);
    assert.equal(isRelevant(60), true);
    assert.equal(isRelevant(59), false);
  });

  it("counts the Figma's ten applicants as seven relevant", () => {
    const scores = [95, 94, 94, 92, 75, 72, 69, 51, 50, 43];
    assert.equal(scores.filter(isRelevant).length, 7);
  });
});
