/**
 * Minimal PDF introspection, for the resume card's "2 pages · 240 KB" line.
 *
 * Deliberately not a PDF library. The only PDF dependency here is `pdfkit`, which writes
 * documents and cannot read them, and pulling in a reader to learn one integer is not worth
 * the supply-chain surface. So this reads the two places a page count is normally declared
 * and gives up honestly when neither is legible — callers render the size alone in that case,
 * rather than a guess.
 *
 * Known limits: a PDF whose catalogue lives inside a compressed object stream (an
 * xref-stream PDF, common from modern generators) exposes neither marker in the raw bytes,
 * and returns null. An incrementally-updated PDF can carry several /Count values, so the
 * largest plausible one wins — that is the newest page tree in every case observed.
 */

/** PDFs are capped at this many pages before a count is treated as a misparse. */
const MAX_PLAUSIBLE_PAGES = 10_000;

/**
 * Pages in a PDF, or null when the file does not say so legibly.
 *
 * Only the head and tail of a large file are scanned: the page tree root sits near one end or
 * the other in practice, and stringifying a 10 MB buffer to regex over it is pure waste.
 */
export function pdfPageCount(buffer: Buffer): number | null {
  if (!isPdf(buffer)) return null;

  const text = readableSlice(buffer);

  // 1. The page tree root's /Count. Authoritative when present, and survives the object
  //    compression that hides individual page objects.
  const counts: number[] = [];
  const pagesRe = /\/Type\s*\/Pages\b/g;
  let m: RegExpExecArray | null;
  while ((m = pagesRe.exec(text)) !== null) {
    // /Count may sit either side of /Type within the same dictionary, so look at a window
    // around the match rather than only forwards.
    const window = text.slice(Math.max(0, m.index - 400), m.index + 400);
    for (const c of window.matchAll(/\/Count\s+(\d+)/g)) {
      const n = Number(c[1]);
      if (n > 0 && n <= MAX_PLAUSIBLE_PAGES) counts.push(n);
    }
  }
  if (counts.length) return Math.max(...counts);

  // 2. Failing that, count the page objects themselves. `/Type /Page` must not also match
  //    `/Type /Pages`, hence the negative lookahead on the trailing "s".
  const pageObjects = text.match(/\/Type\s*\/Page(?![\sa-zA-Z])/g);
  if (pageObjects && pageObjects.length <= MAX_PLAUSIBLE_PAGES) return pageObjects.length;

  return null;
}

/** The %PDF- magic. A .pdf name proves nothing about the bytes. */
export function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

/**
 * Up to 1 MB from each end, decoded as latin1.
 *
 * latin1 rather than utf8 because PDF structure is byte-oriented: utf8 decoding replaces
 * invalid sequences in the compressed streams, which can eat a following marker.
 */
function readableSlice(buffer: Buffer): string {
  const CHUNK = 1024 * 1024;
  if (buffer.length <= CHUNK * 2) return buffer.toString('latin1');
  return (
    buffer.subarray(0, CHUNK).toString('latin1') +
    buffer.subarray(buffer.length - CHUNK).toString('latin1')
  );
}
