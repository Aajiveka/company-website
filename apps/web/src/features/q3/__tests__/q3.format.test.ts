import { describe, expect, it } from 'vitest';
import {
  avatarTone,
  bareLink,
  expLabel,
  fmtSize,
  initialsOf,
  linkHost,
  nextDueLines,
  stageHref,
  stagePill,
} from '../q3.format';

/**
 * The NEXT DUE column and STAGE pill are where the pipeline's meaning lives, so the strings
 * the designs print are pinned here: "Slot pending / Contacted 2×", "Day 11 of 14",
 * "Overdue 1 day / Nudge company", "2 docs missing", "Joins 14 Oct / Joining process".
 */
describe('nextDueLines', () => {
  it('reads the Figma rows', () => {
    expect(nextDueLines({ kind: 'slotPending', attempts: 2 })).toEqual({
      primary: 'Slot pending',
      secondary: 'Contacted 2×',
      tone: 'amber',
    });
    expect(nextDueLines({ kind: 'reviewDay', day: 11, daysLeft: 3, expiresAt: '2026-10-03T06:00:00Z' })).toMatchObject({
      primary: 'Day 11 of 14',
      secondary: 'Auto-expires 03 Oct',
      tone: 'amber',
    });
    expect(nextDueLines({ kind: 'resultOverdue', days: 1 })).toEqual({
      primary: 'Overdue 1 day',
      secondary: 'Nudge company',
      tone: 'red',
    });
    expect(nextDueLines({ kind: 'docsMissing', count: 2, requestedAt: new Date().toISOString() })).toMatchObject({
      primary: '2 docs missing',
      secondary: 'Re-requested today',
    });
    expect(nextDueLines({ kind: 'joins', at: '2026-10-14T00:00:00Z' })).toMatchObject({
      primary: 'Joins 14 Oct',
      secondary: 'Joining process',
    });
  });

  it('turns the review window red with two days or fewer left', () => {
    expect(nextDueLines({ kind: 'reviewDay', day: 13, daysLeft: 1, expiresAt: null }).tone).toBe('red');
  });

  it('names the meeting provider under an interview time', () => {
    const lines = nextDueLines({
      kind: 'interviewAt',
      at: new Date().toISOString(),
      mode: 'Virtual',
      link: 'https://meet.google.com/zxl-prdz-r2q',
    });
    expect(lines.primary.startsWith('Today, ')).toBe(true);
    expect(lines.secondary).toBe('Virtual · Google Meet');
  });
});

describe('stage pill and route', () => {
  it('uses the more specific label where the designs do', () => {
    expect(stagePill('Decision', 'AwaitingResult')).toEqual({ label: 'Awaiting result', tone: 'amber' });
    expect(stagePill('Offer', 'OfferAccepted')).toEqual({ label: 'Offer accepted', tone: 'green' });
    expect(stagePill('Scheduling', null)).toEqual({ label: 'Scheduling', tone: 'violet' });
  });

  it('opens each stage on its own screen', () => {
    expect(stageHref('Scheduling', 31)).toBe('/q3/scheduling/31');
    expect(stageHref('Decision', 39)).toBe('/q3/decisions/39');
    expect(stageHref('CompanyReview', 32)).toBe('/q3/company-review?mapId=32');
  });
});

describe('small formatters', () => {
  it('formats initials, sizes, experience and links', () => {
    expect(initialsOf('Jatinder Singh')).toBe('JS');
    expect(initialsOf('Meera')).toBe('M');
    expect(fmtSize(1_258_291)).toBe('1.2 MB');
    expect(fmtSize(655_360)).toBe('640 KB');
    expect(expLabel(0)).toBe('Fresher');
    expect(expLabel(7)).toBe('7 yrs');
    expect(expLabel(null)).toBe('');
    expect(linkHost('https://teams.microsoft.com/l/meetup')).toBe('Microsoft Teams');
    expect(bareLink('https://meet.google.com/xpa-rmqk-tdv')).toBe('meet.google.com/xpa-rmqk-tdv');
  });

  it('gives one person one avatar colour everywhere', () => {
    expect(avatarTone('Nishu Kumar')).toBe(avatarTone('Nishu Kumar'));
  });
});
