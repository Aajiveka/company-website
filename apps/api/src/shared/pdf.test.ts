import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import PDFDocument from 'pdfkit';
import { isPdf, pdfPageCount } from './pdf';

/**
 * The resume card's "2 pages · 240 KB" line.
 *
 * The fixtures are generated with pdfkit — the writer already in this project — so the test
 * asserts against real PDF bytes rather than a hand-written string that happens to satisfy
 * the regexes. `pdfPageCount` is allowed to return null; what it must never do is return a
 * confidently wrong number.
 */

/** A real n-page PDF, via the library that already ships here. */
function makePdf(pages: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    for (let i = 0; i < pages; i++) {
      doc.addPage();
      doc.text(`Page ${i + 1}`);
    }
    doc.end();
  });
}

describe('isPdf', () => {
  it('recognises the %PDF- magic', async () => {
    assert.equal(isPdf(await makePdf(1)), true);
  });

  it('rejects bytes that merely have a .pdf name', () => {
    assert.equal(isPdf(Buffer.from('Not a PDF at all')), false);
    assert.equal(isPdf(Buffer.from([0x89, 0x50, 0x4e, 0x47])), false); // PNG
    assert.equal(isPdf(Buffer.alloc(0)), false);
    assert.equal(isPdf(Buffer.from('%PD')), false);
  });
});

describe('pdfPageCount', () => {
  it('counts a single-page resume', async () => {
    assert.equal(pdfPageCount(await makePdf(1)), 1);
  });

  /** The Figma's resume card says "2 pages", which is the common shape of a real CV. */
  it('counts the two-page case the design shows', async () => {
    assert.equal(pdfPageCount(await makePdf(2)), 2);
  });

  it('counts a longer document', async () => {
    assert.equal(pdfPageCount(await makePdf(7)), 7);
  });

  it('returns null for a non-PDF rather than guessing', () => {
    assert.equal(pdfPageCount(Buffer.from('plain text CV')), null);
    assert.equal(pdfPageCount(Buffer.alloc(0)), null);
  });

  it('returns null for a PDF header with no legible page tree', () => {
    assert.equal(pdfPageCount(Buffer.from('%PDF-1.7\n%%EOF\n')), null);
  });

  it('does not mistake /Type /Pages for a page object', () => {
    // No /Count anywhere, so the fallback runs and must not count the /Pages node itself.
    const bytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Pages /Kids [2 0 R] >>\nendobj\n%%EOF');
    assert.equal(pdfPageCount(bytes), null);
  });

  it('prefers the newest page tree when an incremental update leaves several', () => {
    const bytes = Buffer.from(
      '%PDF-1.4\n' +
        '1 0 obj\n<< /Type /Pages /Count 2 /Kids [] >>\nendobj\n' +
        '9 0 obj\n<< /Type /Pages /Count 5 /Kids [] >>\nendobj\n%%EOF',
    );
    assert.equal(pdfPageCount(bytes), 5);
  });

  it('treats an absurd count as a misparse', () => {
    const bytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Pages /Count 99999999 >>\nendobj');
    assert.equal(pdfPageCount(bytes), null);
  });

  it('finds /Count declared before /Type in the same dictionary', () => {
    const bytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Count 3 /Kids [] /Type /Pages >>\nendobj');
    assert.equal(pdfPageCount(bytes), 3);
  });
});
