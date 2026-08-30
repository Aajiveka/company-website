/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { avatarUrl } from './avatar-url';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Profile photos used to be published as `/files/<storage key>`. Nothing serves that path —
 * nginx hands it to the SPA fallback — so every uploaded photo came back as index.html and
 * rendered as a broken image. These tests pin the replacement: a real API route, and an
 * allowlist so a row pointing at some other document cannot be replayed as an image.
 */

const mockDb = {
  subscriberCVDetails: { findUnique: mock.fn() },
};

const mockPrisma = {
  get client() {
    return mockDb;
  },
};

const mockStorage = { read: mock.fn(async () => Buffer.from('bytes')) };

function buildService(): CandidatesService {
  return new CandidatesService(mockPrisma as unknown as PrismaService, mockStorage as any, {} as any);
}

/** Makes the CV row answer with the given stored photo key. */
function photoNameIs(photoName: string | null) {
  mockDb.subscriberCVDetails.findUnique.mock.mockImplementation(async () => ({ photoName }));
}

describe('avatarUrl', () => {
  it('points at the API route, not at the raw storage key', () => {
    assert.equal(
      avatarUrl(42, 'Documents/Photo/42-1730000000000-a1b2c3.jpg'),
      '/api/files/avatar/42?v=42-1730000000000-a1b2c3.jpg',
    );
  });

  it('changes when the photo is replaced, so a cached copy is never shown', () => {
    const before = avatarUrl(42, 'Documents/Photo/42-1-aaa.jpg');
    const after = avatarUrl(42, 'Documents/Photo/42-2-bbb.jpg');
    assert.notEqual(before, after);
  });

  it('is null when there is no photo, or no subscriber to hang it on', () => {
    assert.equal(avatarUrl(42, null), null);
    assert.equal(avatarUrl(42, '   '), null);
    assert.equal(avatarUrl(null, 'Documents/Photo/42-1-aaa.jpg'), null);
  });
});

describe('CandidatesService.avatarFile', () => {
  beforeEach(() => {
    mockDb.subscriberCVDetails.findUnique.mock.resetCalls();
    mockStorage.read.mock.resetCalls();
  });

  it('serves an uploaded photo with the type its extension declares', async () => {
    photoNameIs('Documents/Photo/42-1-aaa.PNG');
    const { body, mimeType } = await buildService().avatarFile(42);
    assert.equal(mimeType, 'image/png');
    assert.equal(body.toString(), 'bytes');
  });

  it('refuses a row pointing at a document that is not an allowed image', async () => {
    photoNameIs('Documents/Resume/42-1-aaa.pdf');
    await assert.rejects(() => buildService().avatarFile(42), /No profile photo/);
    assert.equal(mockStorage.read.mock.calls.length, 0);
  });

  it('refuses a junk subscriber id without touching the database', async () => {
    photoNameIs('Documents/Photo/42-1-aaa.jpg');
    await assert.rejects(() => buildService().avatarFile(Number('abc')), /No profile photo/);
    assert.equal(mockDb.subscriberCVDetails.findUnique.mock.calls.length, 0);
  });
});
