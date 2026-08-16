/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { CandidatesService } from './candidates.service';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Key skills used to be stored only as rows in tblSubscriberTags, a join to the tblMstrTags
 * master list. Names that were not already in that master list were dropped on save, so a
 * candidate typing "reactjs" got a 200 back and an empty Key Skills card on the next read.
 *
 * These tests pin the two halves of the fix: the typed list is written verbatim to the extras
 * row, and the tag join still receives whatever matched so recruiter search is unchanged.
 */

const mockDb = {
  subscriberCVDetails: { findUnique: mock.fn(), update: mock.fn() },
  subscriberPrefferedLocations: { deleteMany: mock.fn(), createMany: mock.fn() },
  subscriberTags: { deleteMany: mock.fn(), createMany: mock.fn() },
  mstrTags: { findMany: mock.fn() },
  subscriberProfileExtra: { upsert: mock.fn() },
};

const mockPrisma = {
  get client() {
    return mockDb;
  },
};

function resetAllMocks() {
  for (const table of Object.values(mockDb)) {
    for (const fn of Object.values(table)) (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
  }
}

/** Constructed directly — see the note in jobs.service.test.ts on why the container is skipped. */
function buildService(): CandidatesService {
  return new CandidatesService(mockPrisma as unknown as PrismaService, {} as any, {} as any);
}

/** The extras row the service wrote, as the upsert would have stored it. */
function writtenKeySkills() {
  const call = mockDb.subscriberProfileExtra.upsert.mock.calls.at(-1);
  return call?.arguments[0]?.update?.keySkills;
}

/** The tag ids the service linked to the candidate. */
function linkedTagIds() {
  const call = mockDb.subscriberTags.createMany.mock.calls.at(-1);
  return (call?.arguments[0]?.data ?? []).map((row: { tagID: number }) => row.tagID);
}

describe('CandidatesService — key skills', () => {
  beforeEach(() => {
    resetAllMocks();
    mockDb.subscriberCVDetails.findUnique.mock.mockImplementation(async () => ({ subscriberID: 1n }));
    mockDb.subscriberCVDetails.update.mock.mockImplementation(async () => ({}));
    mockDb.subscriberProfileExtra.upsert.mock.mockImplementation(async () => ({}));
    mockDb.subscriberTags.deleteMany.mock.mockImplementation(async () => ({ count: 0 }));
    mockDb.subscriberTags.createMany.mock.mockImplementation(async () => ({ count: 0 }));
    mockDb.mstrTags.findMany.mock.mockImplementation(async () => [
      { tagID: 7, tagName: 'React' },
      { tagID: 8, tagName: 'PostgreSQL' },
    ]);
  });

  it('stores a skill that is not in the tag master instead of dropping it', async () => {
    const service = buildService();

    await service.updateKeySkills(1, 1, { tagNames: ['reactjs', 'Tailwind'] });

    assert.equal(writtenKeySkills(), 'reactjs, Tailwind');
  });

  it('still links the names that do match a master tag, so search keeps working', async () => {
    const service = buildService();

    await service.updateKeySkills(1, 1, { tagNames: ['react', 'reactjs', 'PostgreSQL'] });

    assert.deepEqual(linkedTagIds(), [7, 8]);
    assert.equal(writtenKeySkills(), 'react, reactjs, PostgreSQL');
  });

  it('replaces the previous list rather than appending to it', async () => {
    const service = buildService();

    await service.updateKeySkills(1, 1, { tagNames: ['Vue'] });

    assert.equal(mockDb.subscriberTags.deleteMany.mock.calls.length, 1);
    assert.equal(writtenKeySkills(), 'Vue');
  });

  it('trims, drops blanks and keeps one chip per skill regardless of case', async () => {
    const service = buildService();

    await service.updateKeySkills(1, 1, { tagNames: ['  React ', 'react', '', '   ', 'REACT', 'Node'] });

    // First spelling wins — it is the one the candidate is looking at.
    assert.equal(writtenKeySkills(), 'React, Node');
  });

  it('clearing every chip stores NULL rather than an empty string', async () => {
    const service = buildService();

    await service.updateKeySkills(1, 1, { tagNames: [] });

    assert.equal(writtenKeySkills(), null);
    assert.equal(mockDb.subscriberTags.createMany.mock.calls.length, 0);
  });

  it('drops whole entries rather than storing half a skill name at the column limit', async () => {
    const service = buildService();
    const long = Array.from({ length: 40 }, (_, i) => `SkillNumber${String(i).padStart(3, '0')}`);

    await service.updateKeySkills(1, 1, { tagNames: long });

    const stored = writtenKeySkills() as string;
    assert.ok(stored.length <= 1000);
    // Every stored entry is a complete name, so nothing reads back as "SkillNumb".
    for (const entry of stored.split(', ')) assert.ok(long.includes(entry), `truncated entry: ${entry}`);
  });
});
