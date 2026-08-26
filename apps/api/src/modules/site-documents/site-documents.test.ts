/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { NotFoundException } from '@nestjs/common';
import { SiteDocumentsService } from './site-documents.service';
import { SiteDocumentsController } from './site-documents.controller';

const row = (over = {}) => ({
  siteDocumentID: 1,
  slug: 'aajivika-book',
  title: 'Aajivika Book',
  storageKey: 'site/docs/aajivika-book.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 6974662,
  fileName: 'aajivika-book.pdf',
  active: true,
  ...over,
});

const mockDb = { siteDocument: { findFirst: mock.fn(), findMany: mock.fn() } };
const mockPrisma = { get client() { return mockDb; } };
const mockStorage = { read: mock.fn(async () => Buffer.from('%PDF-1.7')) };

/** The local driver has no redirectUrl; the S3 one does. Both shapes are exercised below. */
const localDriver = {};
const s3Driver = { redirectUrl: mock.fn(async () => 'https://s3.example/signed?sig=abc') };

const build = (driver: object = localDriver) =>
  new SiteDocumentsService(mockPrisma as any, mockStorage as any, driver as any);

/** Captures what the controller writes, so the headers can be asserted. */
function fakeRes() {
  const headers: Record<string, string> = {};
  return {
    headers,
    body: undefined as unknown,
    redirectedTo: undefined as string | undefined,
    redirectStatus: undefined as number | undefined,
    setHeader(k: string, v: string) { headers[k.toLowerCase()] = v; },
    send(b: unknown) { this.body = b; },
    redirect(status: number, url: string) { this.redirectStatus = status; this.redirectedTo = url; },
  };
}

beforeEach(() => {
  mockDb.siteDocument.findFirst.mock.resetCalls();
  mockStorage.read.mock.resetCalls();
  s3Driver.redirectUrl.mock.resetCalls();
});

describe('SiteDocumentsService', () => {
  it('reads the stored bytes for a published slug', async () => {
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row());
    const result = await build().fetch('aajivika-book');

    assert.equal(mockStorage.read.mock.calls[0].arguments[0], 'site/docs/aajivika-book.pdf');
    assert.equal(result.canInline, true);
    assert.equal(result.doc.slug, 'aajivika-book');
  });

  it('404s rather than leaking that a slug exists but is inactive', async () => {
    // The query itself filters on active, so an unpublished row comes back as nothing.
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => null);
    await assert.rejects(() => build().fetch('aajivika-book'), NotFoundException);
    assert.equal(mockStorage.read.mock.calls.length, 0);
  });

  /**
   * The point of the allowlist: a type the browser might execute must never come back with
   * canInline, no matter what got stored.
   */
  it('refuses to inline a type outside the allowlist', async () => {
    for (const mimeType of ['image/svg+xml', 'text/html', 'application/msword']) {
      mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row({ mimeType }));
      const result = await build().fetch('x');
      assert.equal(result.canInline, false, `${mimeType} must not inline`);
    }
  });
});

describe('SiteDocumentsController', () => {
  it('serves an allowlisted type inline, locked down', async () => {
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row());
    const res = fakeRes();
    await new SiteDocumentsController(build()).view('aajivika-book', res as any);

    assert.equal(res.headers['content-type'], 'application/pdf');
    assert.match(res.headers['content-disposition'], /^inline;/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['content-security-policy'], 'sandbox');
  });

  it('falls back to attachment for a type it will not inline', async () => {
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row({ mimeType: 'text/html' }));
    const res = fakeRes();
    await new SiteDocumentsController(build()).view('x', res as any);

    assert.match(res.headers['content-disposition'], /^attachment;/);
  });

  it('always attaches on the download route', async () => {
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row());
    const res = fakeRes();
    await new SiteDocumentsController(build()).download('aajivika-book', res as any);

    assert.match(res.headers['content-disposition'], /^attachment;/);
  });

  /**
   * Proxying the bytes was what made a 7 MB brochure take tens of seconds and left the PDF
   * viewer blank throughout. With a store that can serve the object itself, the API must get
   * out of the way — and must not read the object to do it.
   */
  it('redirects instead of proxying when the store can serve the object', async () => {
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row());
    const res = fakeRes();
    await new SiteDocumentsController(build(s3Driver)).view('aajivika-book', res as any);

    assert.equal(res.redirectStatus, 302);
    assert.equal(res.redirectedTo, 'https://s3.example/signed?sig=abc');
    assert.equal(mockStorage.read.mock.calls.length, 0, 'must not pull the object into memory');
    // The signed URL expires, so a cached redirect would send the next visitor to a dead link.
    assert.equal(res.headers['cache-control'], 'no-store');
  });

  it('asks the store to pin the disposition it would have set itself', async () => {
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row());
    await new SiteDocumentsController(build(s3Driver)).download('aajivika-book', fakeRes() as any);
    assert.equal(s3Driver.redirectUrl.mock.calls[0].arguments[1].disposition, 'attachment');

    s3Driver.redirectUrl.mock.resetCalls();
    await new SiteDocumentsController(build(s3Driver)).view('aajivika-book', fakeRes() as any);
    assert.equal(s3Driver.redirectUrl.mock.calls[0].arguments[1].disposition, 'inline');
  });

  it('keeps the allowlist on the redirect path too', async () => {
    mockDb.siteDocument.findFirst.mock.mockImplementation(async () => row({ mimeType: 'text/html' }));
    await new SiteDocumentsController(build(s3Driver)).view('x', fakeRes() as any);

    assert.equal(s3Driver.redirectUrl.mock.calls[0].arguments[1].disposition, 'attachment');
  });
});
