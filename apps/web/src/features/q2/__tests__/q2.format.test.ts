import { describe, it, expect } from 'vitest';
import {
  ctcLabel,
  fileSizeLabel,
  resumeMetaLabel,
  expRangeLabel,
  experienceLabel,
  matchTone,
  noticeLabel,
  postedOnLabel,
  profileTone,
  topMatchTone,
  weightLabel,
} from '../q2.format';

/**
 * These pin the strings and colour steps the Q2 frames show literally. The match ring's bands
 * in particular are read off the All Applicants table, where 95/94/94/92 draw green,
 * 75/72/69 blue, 51/50 amber and 43 red — so the steps are 90, 60 and 50.
 */

describe('expRangeLabel', () => {
  it('renders the design’s en-dashed range', () => {
    expect(expRangeLabel(6, 10)).toBe('6 – 10 yrs');
    expect(expRangeLabel(4, 8)).toBe('4 – 8 yrs');
  });

  it('collapses a one-sided range and renders nothing for an empty one', () => {
    expect(expRangeLabel(5, null)).toBe('5 yrs');
    expect(expRangeLabel(null, 7)).toBe('7 yrs');
    expect(expRangeLabel(null, null)).toBe('—');
  });
});

describe('ctcLabel', () => {
  it('renders "₹24 – 32 LPA" from rupee amounts', () => {
    expect(ctcLabel(2_400_000, 3_200_000)).toBe('₹24 – 32 LPA');
  });

  it('keeps one decimal when a bound is not a whole lakh', () => {
    expect(ctcLabel(1_250_000, 1_800_000)).toBe('₹12.5 – 18 LPA');
  });

  it('does not print "₹24 – 24 LPA" when both ends are the same lakh', () => {
    expect(ctcLabel(2_400_000, 2_400_000)).toBe('₹24 LPA');
  });

  it('falls back to a dash when no salary is recorded', () => {
    expect(ctcLabel(0, 0)).toBe('—');
  });
});

describe('experienceLabel and noticeLabel', () => {
  it('names a zero-experience candidate a fresher', () => {
    expect(experienceLabel(0)).toBe('Fresher');
    expect(experienceLabel(null)).toBe('Fresher');
    expect(experienceLabel(1)).toBe('1 yr');
    expect(experienceLabel(10)).toBe('10 yrs');
  });

  it('renders the notice period the detail panel shows', () => {
    expect(noticeLabel(30)).toBe('30 days');
    expect(noticeLabel(1)).toBe('1 day');
    expect(noticeLabel(0)).toBe('Immediate');
    expect(noticeLabel(null)).toBe('—');
  });
});

describe('postedOnLabel', () => {
  it('renders "28 Aug 2026" and never ICU’s "Sept"', () => {
    expect(postedOnLabel('2026-08-28T00:00:00.000Z')).toBe('28 Aug 2026');
    expect(postedOnLabel('2026-09-10T00:00:00.000Z')).toBe('10 Sep 2026');
  });

  it('does not throw on a missing or unparseable date', () => {
    expect(postedOnLabel(null)).toBe('—');
    expect(postedOnLabel('not-a-date')).toBe('—');
  });
});

describe('matchTone', () => {
  it('reproduces the All Applicants table’s four bands', () => {
    // 95 / 94 / 92 render green
    expect(matchTone(95).ring).toContain('emerald');
    expect(matchTone(90).ring).toContain('emerald');
    // 75 / 72 / 69 render blue
    expect(matchTone(89).ring).toContain('blue');
    expect(matchTone(60).ring).toContain('blue');
    // 51 / 50 render amber
    expect(matchTone(59).ring).toContain('amber');
    expect(matchTone(50).ring).toContain('amber');
    // 43 renders red
    expect(matchTone(49).ring).toContain('red');
  });
});

describe('profileTone', () => {
  /** In the designs only 100% is green — 90%, 82%, 80%, 75%, 60% and 50% are all amber. */
  it('is a two-state scale, green only at 100', () => {
    expect(profileTone(100)).toContain('emerald');
    expect(profileTone(90)).toContain('amber');
    expect(profileTone(82)).toContain('amber');
    expect(profileTone(50)).toContain('amber');
  });
});

describe('topMatchTone', () => {
  it('greens the Top Match column only above the relevance cut', () => {
    expect(topMatchTone(94)).toContain('emerald');
    expect(topMatchTone(60)).toContain('emerald');
    expect(topMatchTone(59)).toContain('muted');
  });
});

describe('weightLabel', () => {
  it('renders the "w 30%" chip beside each criterion', () => {
    expect(weightLabel(0.3)).toBe('w 30%');
    expect(weightLabel(0.05)).toBe('w 5%');
  });
});

describe('fileSizeLabel', () => {
  it('renders the design’s "240 KB"', () => {
    expect(fileSizeLabel(240_000)).toBe('240 KB');
  });

  it('uses B, KB and MB at the boundaries the unit changes', () => {
    expect(fileSizeLabel(0)).toBe('0 B');
    expect(fileSizeLabel(999)).toBe('999 B');
    expect(fileSizeLabel(1000)).toBe('1 KB');
    expect(fileSizeLabel(999_999)).toBe('1000 KB');
    expect(fileSizeLabel(1_000_000)).toBe('1.0 MB');
    expect(fileSizeLabel(2_400_000)).toBe('2.4 MB');
  });

  it('returns null for an unknown size, so the caller can drop the part', () => {
    expect(fileSizeLabel(null)).toBeNull();
    expect(fileSizeLabel(-1)).toBeNull();
  });
});

describe('resumeMetaLabel', () => {
  it('renders the full line the Figma shows', () => {
    expect(resumeMetaLabel('Click to preview', 2, 240_000)).toBe(
      'Click to preview · 2 pages · 240 KB',
    );
  });

  it('singularises a one-page CV', () => {
    expect(resumeMetaLabel('Click to preview', 1, 90_000)).toBe(
      'Click to preview · 1 page · 90 KB',
    );
  });

  /**
   * A CV uploaded before the columns existed, whose backfill has not run or could not read the
   * object, knows neither fact. Each part drops on its own rather than the line collapsing.
   */
  it('degrades one part at a time', () => {
    expect(resumeMetaLabel('Click to preview', null, 240_000)).toBe(
      'Click to preview · 240 KB',
    );
    expect(resumeMetaLabel('Click to preview', 2, null)).toBe('Click to preview · 2 pages');
    expect(resumeMetaLabel('Click to preview', null, null)).toBe('Click to preview');
  });
});
