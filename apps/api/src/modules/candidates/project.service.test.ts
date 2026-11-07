/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { BadRequestException } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Project writes. The wizard checks the worked-from / worked-till order too, but the CV manager
 * and anything holding a token post to the same endpoint, so the API has to refuse it itself.
 */

const mockDb = {
  subscriberProject: { create: mock.fn(), updateMany: mock.fn() },
};

const mockPrisma = {
  get client() {
    return mockDb;
  },
};

/** Constructed directly — see the note in jobs.service.test.ts on why the container is skipped. */
const buildService = () => new CandidatesService(mockPrisma as unknown as PrismaService, {} as any, {} as any);

const dto = (overrides: Record<string, unknown> = {}) => ({
  title: 'HRMS',
  projectStatus: 'Finished',
  workedFromMonth: 1,
  workedFromYear: 2026,
  workedTillMonth: 1,
  workedTillYear: 2025,
  ...overrides,
});

describe('CandidatesService — projects', () => {
  beforeEach(() => {
    mockDb.subscriberProject.create.mock.resetCalls();
    mockDb.subscriberProject.create.mock.mockImplementation(async () => ({ subscriberProjectID: 7n }));
  });

  it('refuses a worked-till earlier than worked-from', async () => {
    await assert.rejects(() => buildService().upsertProject(1, 2, dto()), (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.match(e.getResponse().message, /cannot be earlier/);
      return true;
    });
    assert.equal(mockDb.subscriberProject.create.mock.callCount(), 0);
  });

  it('compares months, not just years', async () => {
    await assert.rejects(() =>
      buildService().upsertProject(1, 2, dto({ workedFromYear: 2025, workedFromMonth: 6, workedTillMonth: 3 })),
    );
  });

  it('accepts a project that starts and ends in the same month', async () => {
    await buildService().upsertProject(1, 2, dto({ workedTillYear: 2026 }));
    assert.equal(mockDb.subscriberProject.create.mock.callCount(), 1);
  });

  it('ignores the end of an in-progress project, which is not stored anyway', async () => {
    await buildService().upsertProject(1, 2, dto({ projectStatus: 'In Progress' }));
    const data = mockDb.subscriberProject.create.mock.calls[0].arguments[0].data;
    assert.equal(data.workedTillYear, null);
  });
});
