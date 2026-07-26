/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JobApplicationsService } from './job-application.service';

// ── Mock factories ──────────────────────────────────────────────────────────
const mockDb = {
  mstrDesignation: { findMany: mock.fn() },
  mstrIndustryType: { findMany: mock.fn() },
  mstrState: { findMany: mock.fn() },
  mstrCily: { findMany: mock.fn() },
  mstrWorkMode: { findMany: mock.fn() },
  mstrEmpType: { findMany: mock.fn() },
  mstrSkills: { findMany: mock.fn() },
  clientJobs: { findMany: mock.fn(), findUnique: mock.fn(), count: mock.fn() },
};

const mockPrisma = { get client() { return mockDb; } };
const mockCandidates = {
  subscriberIdFor: mock.fn(),
  recommendations: mock.fn(),
};
const mockApplications = { apply: mock.fn() };

function resetAllMocks() {
  for (const table of Object.values(mockDb)) {
    for (const fn of Object.values(table)) (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
  }
  mockCandidates.subscriberIdFor.mock.resetCalls();
  mockCandidates.recommendations.mock.resetCalls();
  mockApplications.apply.mock.resetCalls();
}

async function buildService(): Promise<JobsService> {
  const mod = await Test.createTestingModule({
    providers: [
      JobsService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: CandidatesService, useValue: mockCandidates },
      { provide: JobApplicationsService, useValue: mockApplications },
    ],
  }).compile();
  return mod.get(JobsService);
}

// ── Sample data ─────────────────────────────────────────────────────────────
const sampleJobRow = {
  jobID: 1n,
  statusID: 1,
  minCTC: 300000,
  maxCTC: 600000,
  minExp: 2,
  maxEmp: 5,
  timestampIns: new Date('2025-06-01'),
  jobDescr: 'Build things',
  jobCandidateProfile: 'Engineer',
  client: { clientName: 'ACME Corp', companyLogo: 'logo.png' },
  jobCity: { descr: 'Mumbai' },
  designation: { descr: 'Software Engineer' },
  industryType: { industryType: 'IT' },
  employeeType: { descr: 'Full-time' },
  workMode: { descr: 'Remote' },
  ClientJobSkill: [{ skill: { descr: 'TypeScript' } }, { skill: { descr: 'Node.js' } }],
  ClientJobs_EducationType: [{ educationType: { descr: 'B.Tech' } }],
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('JobsService', () => {
  let svc: JobsService;

  beforeEach(async () => {
    resetAllMocks();
    svc = await buildService();
  });

  // ── filters ──

  describe('filters()', () => {
    it('returns aggregated filter options', async () => {
      mockDb.mstrDesignation.findMany.mock.mockImplementation(async () => [{ descr: 'Engineer' }]);
      mockDb.mstrIndustryType.findMany.mock.mockImplementation(async () => [{ industryType: 'IT' }]);
      mockDb.mstrState.findMany.mock.mockImplementation(async () => [{ stateID: 1, descr: 'Maharashtra' }]);
      mockDb.mstrCily.findMany.mock.mockImplementation(async () => [{ descr: 'Mumbai', stateID: 1 }]);
      mockDb.mstrWorkMode.findMany.mock.mockImplementation(async () => [{ descr: 'Remote' }]);
      mockDb.mstrEmpType.findMany.mock.mockImplementation(async () => [{ descr: 'Full-time' }]);
      mockDb.mstrSkills.findMany.mock.mockImplementation(async () => [{ descr: 'JavaScript' }]);

      const result = await svc.filters();
      assert.deepEqual(result.designations, ['Engineer']);
      assert.deepEqual(result.industries, ['IT']);
      assert.deepEqual(result.locations, ['Mumbai']);
      assert.deepEqual(result.workModes, ['Remote']);
      assert.deepEqual(result.skills, ['JavaScript']);
    });

    it('filters out null and empty values', async () => {
      mockDb.mstrDesignation.findMany.mock.mockImplementation(async () => [{ descr: null }, { descr: '' }, { descr: 'Valid' }]);
      mockDb.mstrIndustryType.findMany.mock.mockImplementation(async () => []);
      mockDb.mstrState.findMany.mock.mockImplementation(async () => []);
      mockDb.mstrCily.findMany.mock.mockImplementation(async () => []);
      mockDb.mstrWorkMode.findMany.mock.mockImplementation(async () => []);
      mockDb.mstrEmpType.findMany.mock.mockImplementation(async () => []);
      mockDb.mstrSkills.findMany.mock.mockImplementation(async () => []);

      const result = await svc.filters();
      assert.deepEqual(result.designations, ['Valid']);
    });
  });

  // ── search ──

  describe('search()', () => {
    const baseQuery = { page: 1, pageSize: 10 };

    it('returns paginated results with total', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => [sampleJobRow]);
      mockDb.clientJobs.count.mock.mockImplementation(async () => 1);

      const result = await svc.search(baseQuery as any);
      assert.equal(result.total, 1);
      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].designation, 'Software Engineer');
      assert.equal(result.rows[0].company, 'ACME Corp');
      assert.equal(result.rows[0].city, 'Mumbai');
    });

    it('applies designation filter to where clause', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => []);
      mockDb.clientJobs.count.mock.mockImplementation(async () => 0);

      await svc.search({ ...baseQuery, designation: 'Manager' } as any);
      const whereArg = mockDb.clientJobs.findMany.mock.calls[0].arguments[0].where;
      assert.deepEqual(whereArg.designation, { descr: { equals: 'Manager', mode: 'insensitive' } });
    });

    it('applies location filter', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => []);
      mockDb.clientJobs.count.mock.mockImplementation(async () => 0);

      await svc.search({ ...baseQuery, location: 'Delhi' } as any);
      const whereArg = mockDb.clientJobs.findMany.mock.calls[0].arguments[0].where;
      assert.deepEqual(whereArg.jobCity, { descr: { equals: 'Delhi', mode: 'insensitive' } });
    });

    it('paginates correctly with skip and take', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => []);
      mockDb.clientJobs.count.mock.mockImplementation(async () => 0);

      await svc.search({ page: 3, pageSize: 5 } as any);
      const args = mockDb.clientJobs.findMany.mock.calls[0].arguments[0];
      assert.equal(args.skip, 10); // (3-1) * 5
      assert.equal(args.take, 5);
    });

    it('returns empty results when no jobs match', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => []);
      mockDb.clientJobs.count.mock.mockImplementation(async () => 0);

      const result = await svc.search(baseQuery as any);
      assert.equal(result.total, 0);
      assert.equal(result.rows.length, 0);
    });
  });

  // ── byId ──

  describe('byId()', () => {
    it('returns full job detail with skills and education', async () => {
      mockDb.clientJobs.findUnique.mock.mockImplementation(async () => sampleJobRow);
      const result = await svc.byId(1);
      assert.equal(result.jobId, 1);
      assert.equal(result.designation, 'Software Engineer');
      assert.equal(result.company, 'ACME Corp');
      assert.deepEqual(result.skills, ['TypeScript', 'Node.js']);
      assert.deepEqual(result.educationTypes, ['B.Tech']);
      assert.equal(result.companyLogo, 'logo.png');
      assert.equal(result.description, 'Build things');
    });

    it('throws NotFoundException for missing job', async () => {
      mockDb.clientJobs.findUnique.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.byId(999), NotFoundException);
    });
  });

  // ── recommended ──

  describe('recommended()', () => {
    it('delegates to candidates.recommendations', async () => {
      mockCandidates.subscriberIdFor.mock.mockImplementation(async () => 42n);
      mockCandidates.recommendations.mock.mockImplementation(async () => [{ jobId: 1 }]);

      const result = await svc.recommended(1);
      assert.equal(mockCandidates.subscriberIdFor.mock.callCount(), 1);
      assert.equal(mockCandidates.recommendations.mock.callCount(), 1);
      assert.equal(mockCandidates.recommendations.mock.calls[0].arguments[0], 42n);
      assert.deepEqual(result, [{ jobId: 1 }]);
    });
  });
});
