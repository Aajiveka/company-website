import { describe, expect, it } from 'vitest';
import { pageBreaks } from '../exportPdf';

/** Page breaks: a page ends between blocks, never through one. */
describe('pageBreaks', () => {
  it('keeps a one-page resume on one page', () => {
    expect(pageBreaks(900, [], 1123, 1078)).toEqual([[0, 900]]);
  });

  it('moves the cut above a block that would straddle it', () => {
    // A job entry from 1100 to 1200 crosses the first page's 1123 px edge.
    const pages = pageBreaks(2000, [{ top: 1100, bottom: 1200 }], 1123, 1078);
    expect(pages[0]).toEqual([0, 1100]);
    expect(pages[1]![0]).toBe(1100);
  });

  it('follows nested blocks up, so a heading never ends a page alone', () => {
    // The heading's wrapper (1050-1200) holds its first entry (1080-1200).
    const pages = pageBreaks(
      2000,
      [
        { top: 1050, bottom: 1200 },
        { top: 1080, bottom: 1200 },
      ],
      1123,
      1078,
    );
    expect(pages[0]).toEqual([0, 1050]);
  });

  it('cuts a block taller than a page rather than looping forever', () => {
    const pages = pageBreaks(3000, [{ top: 50, bottom: 2900 }], 1123, 1078);
    expect(pages[0]).toEqual([0, 1123]);
    expect(pages.at(-1)![1]).toBe(3000);
  });
});
