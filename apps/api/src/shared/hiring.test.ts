import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  RoundStatus,
  companyReviewState,
  documentState,
  interviewPill,
  istDateAfter,
  modeId,
  modeLabel,
  parseInterviewers,
  q2ReturnState,
  reviewDay,
  reviewDaysLeft,
  roundLabel,
  stageOf,
  startOfDay,
  startOfWeek,
  type StageFacts,
} from './hiring';

/** An instant given as IST wall-clock time. */
const ist = (s: string) => new Date(`${s}+05:30`);

describe('review window', () => {
  // Day 1 is the forwarding day; the Figma's "Day 6 / 14" for a CV forwarded 18 Sep reads on 23 Sep.
  it('counts calendar days in IST, starting at Day 1', () => {
    const sent = ist('2026-09-18T11:00:00');
    assert.equal(reviewDay(sent, ist('2026-09-18T23:59:00')), 1);
    assert.equal(reviewDay(sent, ist('2026-09-23T09:00:00')), 6);
    assert.equal(reviewDaysLeft(sent, ist('2026-09-23T09:00:00')), 8);
  });

  it('rolls over at IST midnight, not UTC midnight', () => {
    const sent = ist('2026-09-18T11:00:00');
    // 00:30 IST on the 19th is still the 18th in UTC.
    assert.equal(reviewDay(sent, ist('2026-09-19T00:30:00')), 2);
  });

  it('clamps an expired CV to Day 14 with nothing left', () => {
    const sent = ist('2026-09-01T10:00:00');
    assert.equal(reviewDay(sent, ist('2026-10-10T10:00:00')), 14);
    assert.equal(reviewDaysLeft(sent, ist('2026-10-10T10:00:00')), 0);
  });

  it('starts the week on Monday in IST', () => {
    // Thu 02 Oct 2026 → Mon 28 Sep 2026
    assert.equal(startOfWeek(ist('2026-10-01T23:00:00')).getTime(), ist('2026-09-28T00:00:00').getTime());
    assert.equal(startOfDay(ist('2026-10-01T23:00:00')).getTime(), ist('2026-10-01T00:00:00').getTime());
  });
});

describe('company review state', () => {
  const now = ist('2026-09-30T12:00:00');
  const base = { status: 'SentToCompany', companyShortlistedAt: null, sentToCompanyAt: ist('2026-09-25T10:00:00') };

  it('is in review early in the window', () => {
    assert.equal(companyReviewState(base, false, now), 'InReview');
  });

  it('is expiring with two days or fewer left', () => {
    assert.equal(companyReviewState({ ...base, sentToCompanyAt: ist('2026-09-18T10:00:00') }, false, now), 'Expiring');
  });

  it('distinguishes shortlisted with and without slots', () => {
    const s = { ...base, companyShortlistedAt: ist('2026-09-29T10:00:00') };
    assert.equal(companyReviewState(s, true, now), 'Shortlisted');
    assert.equal(companyReviewState(s, false, now), 'SlotsAwaited');
  });

  it('reports auto-expired regardless of the clock', () => {
    assert.equal(companyReviewState({ ...base, status: 'Expired' }, false, now), 'AutoExpired');
  });
});

describe('pipeline stage', () => {
  const facts = (over: Partial<StageFacts>): StageFacts => ({
    referralStatus: 'SentToCompany',
    rejected: false,
    joinedAt: null,
    selectedAt: null,
    docsApprovedAt: null,
    offerStatus: null,
    latestRound: null,
    ...over,
  });

  it('follows the referral first', () => {
    assert.equal(stageOf(facts({ referralStatus: 'Referred' })), 'Referred');
    assert.equal(stageOf(facts({ referralStatus: 'Returned' })), 'Returned');
    assert.equal(stageOf(facts({ referralStatus: 'Expired' })), 'Returned');
    assert.equal(stageOf(facts({})), 'CompanyReview');
  });

  it('walks the interview rounds', () => {
    const r = (status: string, decision: string | null = null) => facts({ latestRound: { status, decision } });
    assert.equal(stageOf(r(RoundStatus.PENDING)), 'Scheduling');
    assert.equal(stageOf(r(RoundStatus.NO_SHOW)), 'Scheduling');
    assert.equal(stageOf(r(RoundStatus.RESCHEDULE_REQUESTED)), 'Scheduling');
    assert.equal(stageOf(r(RoundStatus.SCHEDULED)), 'Interview');
    assert.equal(stageOf(r(RoundStatus.COMPLETED)), 'Decision');
    assert.equal(stageOf(r(RoundStatus.COMPLETED, 'Hold')), 'Decision');
    assert.equal(stageOf(r(RoundStatus.COMPLETED, 'Rejected')), 'Closed');
  });

  it('moves through documents, offer and joining', () => {
    const done = { status: RoundStatus.COMPLETED, decision: 'Selected' };
    assert.equal(stageOf(facts({ latestRound: done, selectedAt: new Date() })), 'Documents');
    assert.equal(stageOf(facts({ latestRound: done, selectedAt: new Date(), docsApprovedAt: new Date() })), 'Offer');
    assert.equal(stageOf(facts({ latestRound: done, selectedAt: new Date(), offerStatus: 'Accepted' })), 'Offer');
    assert.equal(stageOf(facts({ latestRound: done, offerStatus: 'Rejected' })), 'Closed');
    assert.equal(stageOf(facts({ latestRound: done, joinedAt: new Date() })), 'Closed');
  });

  it('closes a rejected application whatever its round says', () => {
    assert.equal(stageOf(facts({ rejected: true, latestRound: { status: RoundStatus.SCHEDULED, decision: null } })), 'Closed');
  });
});

describe('interview pill', () => {
  const now = ist('2026-10-02T14:15:00');
  const r = (over: Partial<Parameters<typeof interviewPill>[0]>) => ({
    status: RoundStatus.SCHEDULED,
    scheduledAt: ist('2026-10-02T15:00:00'),
    durationMins: 45,
    decision: null,
    ...over,
  });

  it('reads "Starts in 45 min" inside the hour before', () => {
    assert.equal(interviewPill(r({}), now), 'StartingSoon');
    assert.equal(interviewPill(r({ scheduledAt: ist('2026-10-02T16:30:00') }), now), 'Confirmed');
  });

  it('is in progress during the slot', () => {
    assert.equal(interviewPill(r({ scheduledAt: ist('2026-10-02T14:00:00') }), now), 'InProgress');
  });

  it('awaits the result once conducted, until decided', () => {
    assert.equal(interviewPill(r({ status: RoundStatus.COMPLETED }), now), 'AwaitingResult');
    assert.equal(interviewPill(r({ status: RoundStatus.COMPLETED, decision: 'NextRound' }), now), 'Decided');
  });

  it('surfaces no-shows and reschedule requests', () => {
    assert.equal(interviewPill(r({ status: RoundStatus.NO_SHOW }), now), 'NoShow');
    assert.equal(interviewPill(r({ status: RoundStatus.RESCHEDULE_REQUESTED }), now), 'RescheduleAsked');
  });
});

describe('vocabulary', () => {
  it('maps the design\'s modes onto tblMstrInterviewMode ids and back', () => {
    for (const label of ['Virtual', 'Telephonic', 'Face-to-Face', 'Walk-in']) {
      assert.equal(modeLabel(modeId(label)), label);
    }
    assert.equal(modeId('Virtual'), 3); // "Video" in the master
    assert.equal(modeLabel(99), null);
  });

  it('labels rounds R1… and Final', () => {
    assert.equal(roundLabel({ roundNumber: 2, isFinal: false }), 'R2');
    assert.equal(roundLabel({ roundNumber: 4, isFinal: true }), 'Final');
  });

  it('reads document state off flgStatus', () => {
    assert.equal(documentState(null, false), 'Missing');
    assert.equal(documentState(0, true), 'Uploaded');
    assert.equal(documentState(1, true), 'Verified');
    assert.equal(documentState(2, true), 'NeedsCorrection');
    assert.equal(documentState(3, true), 'NeedsCorrection');
  });

  it('prefers re-referred over acknowledged for Q2\'s state', () => {
    assert.equal(q2ReturnState({ q2AcknowledgedAt: null, reReferredAt: null }), 'Awaiting');
    assert.equal(q2ReturnState({ q2AcknowledgedAt: new Date(), reReferredAt: null }), 'Acknowledged');
    assert.equal(q2ReturnState({ q2AcknowledgedAt: new Date(), reReferredAt: new Date() }), 'ReReferred');
  });

  it('parses interviewers, falling back to the single legacy pair', () => {
    assert.deepEqual(
      parseInterviewers({ interviewers: '[{"name":"Vikram Sethi","title":"EM","email":"v@x.in"}]', interviewerName: null, interviewerEmail: null }),
      [{ name: 'Vikram Sethi', title: 'EM', email: 'v@x.in' }],
    );
    assert.deepEqual(parseInterviewers({ interviewers: null, interviewerName: 'Kiran Shah', interviewerEmail: null }), [
      { name: 'Kiran Shah', email: undefined },
    ]);
    assert.deepEqual(parseInterviewers({ interviewers: 'not json', interviewerName: null, interviewerEmail: null }), []);
  });
});

describe('document due date', () => {
  // Regression: IST midnight stored into a @db.Date column kept the UTC date — a day early.
  it('is the IST calendar date N days on, at UTC midnight for a DATE column', () => {
    // 18 Oct 2026, 09:00 IST = 03:30 UTC.
    assert.equal(istDateAfter(new Date('2026-10-18T03:30:00Z'), 3).toISOString(), '2026-10-21T00:00:00.000Z');
    // 23:45 IST on 18 Oct is still the 18th in India, though already 18:15 UTC.
    assert.equal(istDateAfter(new Date('2026-10-18T18:15:00Z'), 3).toISOString(), '2026-10-21T00:00:00.000Z');
    // 00:15 IST on 19 Oct is 18:45 UTC on the 18th — the 19th in India.
    assert.equal(istDateAfter(new Date('2026-10-18T18:45:00Z'), 3).toISOString(), '2026-10-22T00:00:00.000Z');
  });
});
