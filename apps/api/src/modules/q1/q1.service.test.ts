/* eslint-disable @typescript-eslint/no-explicit-any -- the hand-rolled Prisma stub below
   mirrors only the handful of calls under test; typing it fully would be more fixture than
   test. The rest of this file is strictly typed, so no @ts-nocheck. */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { completenessOf, requirementsFor, type ScreeningProfileFacts } from './q1.service';
import { ScreeningStatus, derivePriority } from '@/shared/screening';

/**
 * Profile completeness is the number the whole Q1 workspace turns on: it drives the meter in
 * the queue, the rail's progress bar, which of the two profile states renders, and the stored
 * priority. It is defined as "how many of eight required fields are present", which is what
 * reproduces the Figma's own percentages — Jatinder Singh has all eight at 100%, and Anuranjan
 * Kumar is missing exactly CV, salary, notice period and LinkedIn at 50%.
 *
 * These cases pin that correspondence. If the requirement list is ever extended, the 50% case
 * fails and whoever extended it has to decide what the design's numbers now mean.
 */

const COMPLETE: ScreeningProfileFacts = {
  hasCv: true,
  expectedSalary: 3_000_000,
  noticePeriod: 30,
  linkedInUrl: 'linkedin.com/in/jatinderux',
  dateOfBirth: new Date('1990-03-14'),
  cityId: 12,
  educationCount: 1,
  skillCount: 7,
};

describe('completenessOf', () => {
  it('is 100% for the design’s complete candidate', () => {
    assert.equal(completenessOf(COMPLETE), 100);
  });

  it('is 50% for the design’s incomplete candidate', () => {
    // Anuranjan Kumar: no CV, no salary, no notice period, no LinkedIn.
    const anuranjan: ScreeningProfileFacts = {
      ...COMPLETE,
      hasCv: false,
      expectedSalary: null,
      noticePeriod: null,
      linkedInUrl: null,
    };
    assert.equal(completenessOf(anuranjan), 50);
  });

  it('is 0% when nothing has been filled in', () => {
    const empty: ScreeningProfileFacts = {
      hasCv: false,
      expectedSalary: null,
      noticePeriod: null,
      linkedInUrl: null,
      dateOfBirth: null,
      cityId: null,
      educationCount: 0,
      skillCount: 0,
    };
    assert.equal(completenessOf(empty), 0);
  });

  it('does not count a whitespace-only LinkedIn as provided', () => {
    assert.equal(completenessOf({ ...COMPLETE, linkedInUrl: '   ' }), 88);
  });

  it('counts a zero notice period — "immediate" is an answer, not a blank', () => {
    assert.equal(completenessOf({ ...COMPLETE, noticePeriod: 0 }), 100);
  });

  it('counts a zero expected salary rather than treating it as missing', () => {
    assert.equal(completenessOf({ ...COMPLETE, expectedSalary: 0 }), 100);
  });
});

describe('requirementsFor', () => {
  it('names the missing items in the order the design lists them', () => {
    const anuranjan: ScreeningProfileFacts = {
      ...COMPLETE,
      hasCv: false,
      expectedSalary: null,
      noticePeriod: null,
      linkedInUrl: null,
    };
    const missing = requirementsFor(anuranjan)
      .filter((r) => !r.ok)
      .map((r) => r.label);

    assert.deepEqual(missing, [
      'Missing CV',
      'Missing salary information',
      'Notice period not provided',
      'LinkedIn URL missing',
    ]);
  });

  it('reports nothing missing for a complete profile', () => {
    assert.deepEqual(
      requirementsFor(COMPLETE).filter((r) => !r.ok),
      [],
    );
  });
});

describe('derivePriority', () => {
  it('is High for a strong profile still in the queue', () => {
    assert.equal(derivePriority(100, ScreeningStatus.NEW), 'High');
    assert.equal(derivePriority(80, ScreeningStatus.SCREENING), 'High');
  });

  it('is Medium for a weaker profile still in the queue', () => {
    assert.equal(derivePriority(75, ScreeningStatus.SCREENING), 'Medium');
    assert.equal(derivePriority(50, ScreeningStatus.INCOMPLETE), 'Medium');
  });

  it('is Low once the candidate is off the queue, however complete they are', () => {
    // Every closed/parked row in the designs shows Low, including 100% ones.
    for (const status of [
      ScreeningStatus.FOLLOW_UP,
      ScreeningStatus.NO_RESPONSE,
      ScreeningStatus.VERIFIED,
      ScreeningStatus.NOT_INTERESTED,
    ] as const) {
      assert.equal(derivePriority(100, status), 'Low', `expected Low for ${status}`);
    }
  });
});

/**
 * Two regressions found by running these services against a real database rather than a mock.
 * Both were invisible to the pure-function tests above because they live in the write path.
 */
describe('screening writes', () => {
  it('returns the priority that was just synced, not the pre-sync one', async () => {
    // `updateStatus` used to build its response from the row it had written a moment before
    // `syncPriority` ran, so parking a candidate answered with their old High/Medium while
    // the database already said Low. The queue then drew a Low-status row with a High dot.
    const { Q1Service } = await import('./q1.service');

    let stored = { priority: 'High', status: 'Screening' };
    const db: any = {
      subscriberScreening: {
        findUnique: async () => ({
          subscriberID: 1n,
          status: 'Screening',
          priority: stored.priority,
          relevantExpMonths: null,
          followUpDate: null,
          followUpTime: null,
          contactAttempts: 0,
          nextAttemptAt: null,
          notInterestedReason: null,
          verifiedAt: null,
          firstReviewedAt: new Date(),
        }),
        update: async ({ data }: any) => {
          stored = { ...stored, ...data };
          return {
            subscriberID: 1n,
            status: stored.status,
            priority: stored.priority,
            relevantExpMonths: null,
            followUpDate: data.followUpDate ?? null,
            followUpTime: data.followUpTime ?? null,
            contactAttempts: data.contactAttempts ?? 0,
            nextAttemptAt: null,
            notInterestedReason: null,
            verifiedAt: null,
          };
        },
      },
      subscriberCVDetails: { findUnique: async () => ({}) },
      subscriberProfileExtra: { findUnique: async () => ({}) },
      subscriberCVUploaded: { findUnique: async () => null },
      subscriberEducation: { count: async () => 0 },
      subscriberTags: { count: async () => 0 },
      jobApplicationDetail: { findFirst: async () => null },
    };

    const service = new Q1Service(
      { client: db } as any,
      {} as any,
      { record: async () => undefined } as any,
    );

    const result = await service.updateStatus(
      1,
      { status: 'FollowUp', followUpDate: '2026-09-30' } as any,
      1,
    );

    // Off the queue means Low, whatever the profile score is.
    assert.equal(result.status, 'FollowUp');
    assert.equal(result.priority, 'Low');
  });
});
