/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Education writes.
 *
 * The wizard is not the only caller — the CV manager and the profile dialog post to the same
 * endpoint, and anything holding a token can post to it directly — so the rules that protect
 * the data cannot live only in the form. These pin the ones that would otherwise store a
 * qualification no employer filter could make sense of: a branch under the wrong degree, an
 * end year before the start year, a "percentage" of 101.
 */

const mockDb = {
  mstrEducationType: { findUnique: mock.fn() },
  mstrCourse: { findUnique: mock.fn() },
  subscriberEducation: { findFirst: mock.fn(), create: mock.fn(), updateMany: mock.fn() },
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

/** A valid B.Tech in Computer Science and Engineering, for a test to then break one field of. */
const validDto = (overrides: Record<string, unknown> = {}) => ({
  degreeId: 136,
  courseTypeId: 1020,
  instituteName: 'Patna University',
  startYear: 2016,
  passingYear: 2020,
  specialization: 'Computer Science',
  courseMode: 'Full Time',
  marks: '78.5',
  ...overrides,
});

async function rejection(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e) {
    assert.ok(e instanceof BadRequestException, `expected a 400, got ${e}`);
    return (e.getResponse() as { message: string }).message;
  }
  assert.fail('expected the save to be rejected');
}

describe('CandidatesService — education', () => {
  beforeEach(() => {
    resetAllMocks();
    mockDb.mstrEducationType.findUnique.mock.mockImplementation(async () => ({
      educationTypeID: 136,
      descr: 'B.Tech',
    }));
    mockDb.mstrCourse.findUnique.mock.mockImplementation(async () => ({ educationTypeID: 136 }));
    mockDb.subscriberEducation.findFirst.mock.mockImplementation(async () => null);
    mockDb.subscriberEducation.create.mock.mockImplementation(async () => ({ subscriberEducationID: 5n }));
    mockDb.subscriberEducation.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
  });

  it('saves a valid qualification', async () => {
    const service = buildService();
    const result = await service.upsertEducation(1, 2, validDto());
    assert.deepEqual(result, { subscriberEducationId: 5 });
  });

  it('rejects a qualification that does not exist', async () => {
    const service = buildService();
    mockDb.mstrEducationType.findUnique.mock.mockImplementation(async () => null);
    // Without this the foreign key blows up as a 500 with a Prisma message in it.
    assert.equal(
      await rejection(() => service.upsertEducation(1, 2, validDto({ degreeId: 99999 }))),
      'Choose a valid education qualification.',
    );
  });

  it('rejects a course belonging to a different qualification', async () => {
    const service = buildService();
    // An engineering branch submitted against MBBS — what changing Education without clearing
    // Course would send.
    mockDb.mstrCourse.findUnique.mock.mockImplementation(async () => ({ educationTypeID: 145 }));
    assert.equal(
      await rejection(() => service.upsertEducation(1, 2, validDto())),
      'That course does not belong to B.Tech.',
    );
  });

  it('rejects an end year earlier than the start year', async () => {
    const service = buildService();
    assert.equal(
      await rejection(() => service.upsertEducation(1, 2, validDto({ startYear: 2020, passingYear: 2016 }))),
      'End year cannot be earlier than start year.',
    );
  });

  it('rejects a start year in the future', async () => {
    const service = buildService();
    const nextYear = new Date().getFullYear() + 1;
    assert.equal(
      await rejection(() => service.upsertEducation(1, 2, validDto({ startYear: nextYear, passingYear: nextYear }))),
      'Start year cannot be in the future.',
    );
  });

  it('allows an end year in the near future, for a course still being studied', async () => {
    const service = buildService();
    const nextYear = new Date().getFullYear() + 1;
    // There is no "currently pursuing" flag in the schema, so an expected graduation year is
    // how an ongoing course is recorded.
    const result = await service.upsertEducation(1, 2, validDto({ startYear: 2024, passingYear: nextYear }));
    assert.deepEqual(result, { subscriberEducationId: 5 });
  });

  it('rejects an end year far beyond any plausible graduation', async () => {
    const service = buildService();
    const farOff = new Date().getFullYear() + 50;
    assert.match(
      await rejection(() => service.upsertEducation(1, 2, validDto({ startYear: 2016, passingYear: farOff }))),
      /^End year cannot be later than/,
    );
  });

  it('rejects a percentage above 100', async () => {
    const service = buildService();
    assert.equal(
      await rejection(() => service.upsertEducation(1, 2, validDto({ marks: '101' }))),
      'Percentage must be between 0 and 100.',
    );
  });

  it('rejects a negative percentage', async () => {
    const service = buildService();
    assert.match(
      await rejection(() => service.upsertEducation(1, 2, validDto({ marks: '-1' }))),
      /^Enter a percentage \(0-100\)/,
    );
  });

  it('accepts a CGPA, which the column already holds', async () => {
    const service = buildService();
    for (const marks of ['8.5 CGPA', '8.5/10', '9 gpa']) {
      const result = await service.upsertEducation(1, 2, validDto({ marks }));
      assert.deepEqual(result, { subscriberEducationId: 5 }, `rejected ${marks}`);
    }
  });

  it('refuses the same qualification from the same institution twice', async () => {
    const service = buildService();
    mockDb.subscriberEducation.findFirst.mock.mockImplementation(async () => ({ subscriberEducationID: 4n }));
    assert.equal(
      await rejection(() => service.upsertEducation(1, 2, validDto())),
      'You have already added this qualification.',
    );
  });

  it('does not treat the row being edited as its own duplicate', async () => {
    const service = buildService();
    await service.upsertEducation(1, 2, validDto({ subscriberEducationId: 4 }));
    const where = mockDb.subscriberEducation.findFirst.mock.calls.at(-1)?.arguments[0]?.where;
    assert.deepEqual(where.subscriberEducationID, { not: 4 });
  });

  it('saves an institution that is not in the master list', async () => {
    const service = buildService();
    // The master suggests, it does not gate: no list of Indian institutions is complete.
    await service.upsertEducation(1, 2, validDto({ instituteName: 'A College Nobody Listed' }));
    const data = mockDb.subscriberEducation.create.mock.calls.at(-1)?.arguments[0]?.data;
    assert.equal(data.instituteName, 'A College Nobody Listed');
  });
});
