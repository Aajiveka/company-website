/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';

// ── Mock factories ──────────────────────────────────────────────────────────
const mockDb = {
  subscriberRegistration: { count: mock.fn() },
  clientMstr: { count: mock.fn() },
  clientJobs: { count: mock.fn(), findMany: mock.fn(), findUnique: mock.fn(), update: mock.fn(), updateMany: mock.fn() },
  jobSubscriberMapping: { count: mock.fn() },
  paymentOrder: { aggregate: mock.fn() },
  secUser: { findMany: mock.fn(), findUnique: mock.fn(), update: mock.fn(), updateMany: mock.fn() },
  subscriberCVDetails: { findMany: mock.fn() },
  platformSetting: { findMany: mock.fn(), upsert: mock.fn() },
  blogPost: { findMany: mock.fn(), findUnique: mock.fn(), create: mock.fn(), update: mock.fn(), delete: mock.fn() },
  auditLog: { findMany: mock.fn() },
  $queryRaw: mock.fn(),
};

const mockPrisma = { get client() { return mockDb; } };
const mockAudit = { record: mock.fn() };

function resetAllMocks() {
  for (const table of Object.values(mockDb)) {
    if (typeof table === 'function') { (table as ReturnType<typeof mock.fn>).mock.resetCalls(); continue; }
    for (const fn of Object.values(table)) (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
  }
  mockAudit.record.mock.resetCalls();
}

async function buildService(): Promise<AdminService> {
  /**
   * Constructed directly rather than through Test.createTestingModule.
   *
   * Nest resolves constructor dependencies from `emitDecoratorMetadata`, which esbuild — and
   * therefore the tsx runner this suite uses — does not emit. Every injection came back
   * undefined, so these tests all failed on `this.prisma.client` before reaching an assertion.
   * Passing the mocks positionally sidesteps the container entirely; AdminService has no
   * lifecycle hooks, so there is nothing the container was contributing.
   */
  return new AdminService(
    mockPrisma as unknown as PrismaService,
    mockAudit as unknown as AuditService,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let svc: AdminService;

  beforeEach(async () => {
    resetAllMocks();
    mockAudit.record.mock.mockImplementation(async () => {});
    svc = await buildService();
  });

  // ── stats ──

  describe('stats()', () => {
    it('aggregates platform statistics', async () => {
      mockDb.subscriberRegistration.count.mock.mockImplementation(async () => 100);
      mockDb.clientMstr.count.mock.mockImplementation(async () => 10);
      mockDb.clientJobs.count.mock.mockImplementation(async () => 50);
      mockDb.jobSubscriberMapping.count.mock.mockImplementation(async () => 200);
      mockDb.paymentOrder.aggregate.mock.mockImplementation(async () => ({ _sum: { amountInr: 50000 } }));
      mockDb.$queryRaw.mock.mockImplementation(async () => []);
      mockDb.auditLog.findMany.mock.mockImplementation(async () => []);

      const result = await svc.stats();
      assert.equal(result.totalCandidates, 100);
      assert.equal(result.totalEmployers, 10);
      assert.equal(result.totalApplications, 200);
      assert.equal(result.totalRevenue, 50000);
    });
  });

  // ── users ──

  describe('users()', () => {
    it('returns mapped user list with CV names', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => [
        { userID: 1n, userName: '9876543210', roleID: 1, active: 'Y', subscriberID: 5n },
      ]);
      mockDb.subscriberCVDetails.findMany.mock.mockImplementation(async () => [
        { subscriberID: 5n, fullName: 'Test User', mobileNo1: '9876543210' },
      ]);

      const result = await svc.users({});
      assert.equal(result.length, 1);
      assert.equal(result[0].fullName, 'Test User');
      assert.equal(result[0].isActive, true);
    });

    it('filters by active status', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => []);
      mockDb.subscriberCVDetails.findMany.mock.mockImplementation(async () => []);
      await svc.users({ isActive: false });
      const callArgs = mockDb.secUser.findMany.mock.calls[0].arguments[0];
      assert.equal(callArgs.where.active, 'N');
    });
  });

  // ── updateUser ──

  describe('updateUser()', () => {
    it('updates user role and active status', async () => {
      mockDb.secUser.findUnique.mock.mockImplementation(async () => ({ userID: 1n }));
      mockDb.secUser.update.mock.mockImplementation(async () => ({}));

      const result = await svc.updateUser(1, { roleId: 5, isActive: false }, 99);
      assert.deepEqual(result, { ok: true });
      const updateArgs = mockDb.secUser.update.mock.calls[0].arguments[0];
      assert.equal(updateArgs.data.roleID, 5);
      assert.equal(updateArgs.data.active, 'N');
    });

    it('throws NotFoundException for missing user', async () => {
      mockDb.secUser.findUnique.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.updateUser(999, {}, 99), NotFoundException);
    });
  });

  // ── jobs ──

  describe('jobs()', () => {
    it('returns job list with related data', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => [
        {
          jobID: 1n, statusID: 1, minCTC: 300000, maxCTC: 600000,
          timestampIns: new Date('2025-01-15'),
          designation: { descr: 'Engineer' }, client: { clientName: 'ACME' },
          jobCity: { descr: 'Mumbai' }, _count: { JobSubscriberMapping: 5 },
        },
      ]);
      const result = await svc.jobs({});
      assert.equal(result.length, 1);
      assert.equal(result[0].designation, 'Engineer');
      assert.equal(result[0].status, 'Active');
      assert.equal(result[0].applications, 5);
    });
  });

  // ── approveJob / rejectJob ──

  describe('approveJob()', () => {
    it('sets statusID to active', async () => {
      mockDb.clientJobs.findUnique.mock.mockImplementation(async () => ({ jobID: 1n }));
      mockDb.clientJobs.update.mock.mockImplementation(async () => ({}));
      const result = await svc.approveJob(1, 99);
      assert.deepEqual(result, { ok: true });
      assert.equal(mockDb.clientJobs.update.mock.calls[0].arguments[0].data.statusID, 1);
    });

    it('throws NotFoundException for missing job', async () => {
      mockDb.clientJobs.findUnique.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.approveJob(999, 99), NotFoundException);
    });
  });

  describe('rejectJob()', () => {
    it('sets statusID to 2 (closed)', async () => {
      mockDb.clientJobs.findUnique.mock.mockImplementation(async () => ({ jobID: 1n }));
      mockDb.clientJobs.update.mock.mockImplementation(async () => ({}));
      const result = await svc.rejectJob(1, 99);
      assert.deepEqual(result, { ok: true });
      assert.equal(mockDb.clientJobs.update.mock.calls[0].arguments[0].data.statusID, 2);
    });
  });

  // ── getSettings / updateSettings ──

  describe('getSettings()', () => {
    it('merges stored values with defaults, casting booleans and numbers', async () => {
      mockDb.platformSetting.findMany.mock.mockImplementation(async () => [
        { key: 'siteName', value: 'My Site' },
        { key: 'enableJobAlerts', value: 'false' },
        { key: 'smtpPort', value: '465' },
      ]);
      const result = await svc.getSettings();
      assert.equal(result.siteName, 'My Site');
      assert.equal(result.enableJobAlerts, false);
      assert.equal(result.smtpPort, 465);
      // Default for a key not in DB
      assert.equal(result.maintenanceMode, false);
    });
  });

  describe('updateSettings()', () => {
    it('upserts each setting and records audit', async () => {
      mockDb.platformSetting.upsert.mock.mockImplementation(async () => ({}));
      const result = await svc.updateSettings({ siteName: 'New' } as any, 99);
      assert.deepEqual(result, { ok: true });
      assert.equal(mockDb.platformSetting.upsert.mock.callCount(), 1);
      assert.equal(mockAudit.record.mock.callCount(), 1);
    });
  });

  // ── blogPosts ──

  describe('blogPosts()', () => {
    it('returns mapped blog posts', async () => {
      mockDb.blogPost.findMany.mock.mockImplementation(async () => [
        { postId: 1, title: 'Hello', slug: 'hello', excerpt: 'Hi', body: 'content', imageUrl: null, category: 'general', status: 'Published', author: 'Admin', createdAt: new Date('2025-01-01'), publishedAt: new Date('2025-01-01') },
      ]);
      const result = await svc.blogPosts();
      assert.equal(result.length, 1);
      assert.equal(result[0].title, 'Hello');
    });
  });

  describe('createBlogPost()', () => {
    it('creates and returns the new postId', async () => {
      mockDb.blogPost.create.mock.mockImplementation(async () => ({ postId: 42 }));
      const result = await svc.createBlogPost({ title: 'T', slug: 's', body: 'b' } as any, 1);
      assert.equal(result.postId, 42);
    });
  });

  describe('updateBlogPost()', () => {
    it('throws NotFoundException for missing post', async () => {
      mockDb.blogPost.findUnique.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.updateBlogPost(999, {} as any, 1), NotFoundException);
    });

    it('updates existing post', async () => {
      mockDb.blogPost.findUnique.mock.mockImplementation(async () => ({ postId: 1, publishedAt: null }));
      mockDb.blogPost.update.mock.mockImplementation(async () => ({}));
      const result = await svc.updateBlogPost(1, { title: 'Updated' } as any, 1);
      assert.deepEqual(result, { ok: true });
    });
  });

  describe('deleteBlogPost()', () => {
    it('deletes and audits', async () => {
      mockDb.blogPost.findUnique.mock.mockImplementation(async () => ({ postId: 1 }));
      mockDb.blogPost.delete.mock.mockImplementation(async () => ({}));
      const result = await svc.deleteBlogPost(1, 99);
      assert.deepEqual(result, { ok: true });
      assert.equal(mockDb.blogPost.delete.mock.callCount(), 1);
    });

    it('throws NotFoundException for missing post', async () => {
      mockDb.blogPost.findUnique.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.deleteBlogPost(999, 1), NotFoundException);
    });
  });
});
