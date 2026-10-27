/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck — heavy mocking makes strict types impractical in test files
import { describe, it, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService, nextStepFor, stageOf } from './admin.service';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';

// ── Mock factories ──────────────────────────────────────────────────────────
const mockDb = {
  subscriberRegistration: { count: mock.fn(), findMany: mock.fn() },
  clientMstr: { count: mock.fn() },
  clientJobs: { count: mock.fn(), findMany: mock.fn(), findUnique: mock.fn(), update: mock.fn(), updateMany: mock.fn(), groupBy: mock.fn() },
  jobSubscriberMapping: { count: mock.fn(), groupBy: mock.fn() },
  mstrJobMappingStatus: { findMany: mock.fn() },
  mstrCily: { findFirst: mock.fn(), findUnique: mock.fn() },
  paymentOrder: { aggregate: mock.fn() },
  secUser: { count: mock.fn(), findMany: mock.fn(), findFirst: mock.fn(), findUnique: mock.fn(), update: mock.fn(), updateMany: mock.fn(), create: mock.fn() },
  secMapUserRoles: { updateMany: mock.fn(), groupBy: mock.fn(), create: mock.fn() },
  secActiveSessions: { deleteMany: mock.fn() },
  employerRegistration: { count: mock.fn(), findUnique: mock.fn(), updateMany: mock.fn() },
  mstrPerson: { create: mock.fn(), findMany: mock.fn() },
  subscriberCVDetails: { findMany: mock.fn() },
  platformSetting: { findMany: mock.fn(), upsert: mock.fn() },
  blogPost: { findMany: mock.fn(), findUnique: mock.fn(), create: mock.fn(), update: mock.fn(), delete: mock.fn() },
  auditLog: { count: mock.fn(), findMany: mock.fn() },
  $queryRaw: mock.fn(),
  $transaction: mock.fn((fn: (db: typeof mockDb) => unknown) => fn(mockDb)),
};

const mockPrisma = { get client() { return mockDb; } };
const mockAudit = { record: mock.fn() };

function resetAllMocks() {
  // Implementations are reset too, so one test's mocked rows cannot leak into the next.
  for (const table of Object.values(mockDb)) {
    if (typeof table === 'function') { (table as ReturnType<typeof mock.fn>).mock.resetCalls(); continue; }
    for (const fn of Object.values(table)) {
      (fn as ReturnType<typeof mock.fn>).mock.resetCalls();
      (fn as ReturnType<typeof mock.fn>).mock.mockImplementation(async () => undefined);
    }
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
    { sendMail: mock.fn(async () => {}), sendPasswordReset: mock.fn(async () => {}) } as any,
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
    it('counts from the database, grouping applications into pipeline stages', async () => {
      mockDb.secUser.count.mock.mockImplementation(async (a) => (a?.where?.active === '1' ? 4 : 5));
      mockDb.secMapUserRoles.groupBy.mock.mockImplementation(async () => [{ roleId: 1, _count: { _all: 3 } }]);
      mockDb.subscriberRegistration.count.mock.mockImplementation(async () => 100);
      mockDb.clientMstr.count.mock.mockImplementation(async () => 10);
      mockDb.employerRegistration.count.mock.mockImplementation(async () => 2);
      mockDb.clientJobs.groupBy.mock.mockImplementation(async () => [
        { statusID: 1, _count: { _all: 7 } },
        { statusID: 4, _count: { _all: 1 } },
      ]);
      mockDb.jobSubscriberMapping.groupBy.mock.mockImplementation(async () => [
        { jobMapStatusID: 1, _count: { _all: 5 } },
        { jobMapStatusID: 16, _count: { _all: 2 } },
        { jobMapStatusID: 17, _count: { _all: 1 } },
        { jobMapStatusID: 22, _count: { _all: 1 } },
      ]);
      mockDb.mstrJobMappingStatus.findMany.mock.mockImplementation(async () => [{ jobMapStatusID: 1, descr: 'Mapped' }]);
      mockDb.paymentOrder.aggregate.mock.mockImplementation(async () => ({ _sum: { amountInr: 50000 }, _count: { _all: 3 } }));
      mockDb.$queryRaw.mock.mockImplementation(async () => []);
      mockDb.auditLog.count.mock.mockImplementation(async () => 0);
      mockDb.auditLog.findMany.mock.mockImplementation(async () => []);

      const r = await svc.stats();
      assert.equal(r.users.inactive, 1);
      assert.equal(r.candidates.total, 100);
      assert.equal(r.employers.pendingRegistrations, 2);
      assert.deepEqual(r.jobs.byStatus, { Active: 7, Closed: 0, Archived: 0, Draft: 1 });
      assert.equal(r.applications.total, 9);
      assert.equal(r.applications.byStage.Screening, 5);
      assert.equal(r.applications.byStage.Interview, 3);
      assert.equal(r.applications.byStage.Joined, 1);
      assert.equal(r.payments.revenueInr, 50000);
    });

    // Regression: signups were charted from tblSecUser."TimestampIns", which does not exist.
    it('charts signups from the registration date', async () => {
      mockDb.secMapUserRoles.groupBy.mock.mockImplementation(async () => []);
      mockDb.clientJobs.groupBy.mock.mockImplementation(async () => []);
      mockDb.jobSubscriberMapping.groupBy.mock.mockImplementation(async () => []);
      mockDb.mstrJobMappingStatus.findMany.mock.mockImplementation(async () => []);
      mockDb.paymentOrder.aggregate.mock.mockImplementation(async () => ({ _sum: {}, _count: { _all: 0 } }));
      mockDb.$queryRaw.mock.mockImplementation(async () => []);
      mockDb.auditLog.findMany.mock.mockImplementation(async () => []);
      await svc.stats();
      const sql = mockDb.$queryRaw.mock.calls[0].arguments[0].join('?');
      assert.match(sql, /tblSubscriberRegistration/);
      assert.doesNotMatch(sql, /tblSecUser/);
    });
  });

  // ── users ──

  describe('users()', () => {
    it('returns a page of users with CV names and the joined date', async () => {
      mockDb.secUser.count.mock.mockImplementation(async () => 41);
      mockDb.secUser.findMany.mock.mockImplementation(async () => [
        { userID: 1n, userName: '9876543210', active: '1', subscriberID: 5n, nodeID: 5n, SecMapUserRoles: [{ roleId: 1 }] },
      ]);
      mockDb.subscriberCVDetails.findMany.mock.mockImplementation(async () => [
        { subscriberID: 5n, fullName: 'Test User', mobileNo1: '9876543210', emailID: 't@x.com' },
      ]);
      mockDb.subscriberRegistration.findMany.mock.mockImplementation(async () => [
        { subscriberID: 5n, registrationDateTime: new Date('2026-01-02T00:00:00Z'), registrationMobileNo: '9876543210' },
      ]);

      const result = await svc.users({ page: 2, pageSize: 20 });
      assert.equal(result.total, 41);
      assert.equal(result.pageCount, 3);
      assert.equal(mockDb.secUser.findMany.mock.calls[0].arguments[0].skip, 20);
      assert.equal(result.items[0].fullName, 'Test User');
      assert.equal(result.items[0].email, 't@x.com');
      // Regression: createdAt was '' and the page rendered "Invalid Date".
      assert.equal(result.items[0].createdAt, '2026-01-02T00:00:00.000Z');
    });

    it('resolves a staff login through tblMstrPerson, never the candidate tables', async () => {
      mockDb.secUser.count.mock.mockImplementation(async () => 1);
      mockDb.secUser.findMany.mock.mockImplementation(async () => [
        { userID: 2n, userName: 'qc2', active: '1', subscriberID: null, nodeID: 3n, SecMapUserRoles: [{ roleId: 3 }] },
      ]);
      mockDb.mstrPerson.findMany.mock.mockImplementation(async () => [
        { personNodeID: 3n, descr: 'Arjun Mehta', emailID: 'arjun@x.com', tImestampIns: null, clientID: null },
      ]);
      const result = await svc.users({});
      assert.equal(result.items[0].fullName, 'Arjun Mehta');
      assert.equal(mockDb.subscriberCVDetails.findMany.mock.callCount(), 0);
    });

    it('filters by active status', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => []);
      await svc.users({ isActive: false });
      const callArgs = mockDb.secUser.findMany.mock.calls[0].arguments[0];
      assert.equal(callArgs.where.active, '0');
    });

    // Regression: login reads the role from tblSecMapUserRoles; tblSecUser.RoleID disagrees.
    it('reports and filters the role login actually uses', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => [
        { userID: 2n, userName: 'qc2', active: '1', subscriberID: null, nodeID: null, SecMapUserRoles: [{ roleId: 3 }] },
      ]);
      const result = await svc.users({ roleId: 3 });
      assert.equal(result.items[0].roleId, 3);
      const callArgs = mockDb.secUser.findMany.mock.calls[0].arguments[0];
      assert.deepEqual(callArgs.where.SecMapUserRoles, { some: { roleId: 3 } });
    });
  });

  // ── createStaffUser ──

  describe('createStaffUser()', () => {
    it('refuses a username that is already taken, creating nothing', async () => {
      mockDb.secUser.findFirst.mock.mockImplementation(async () => ({ userID: 1n }));
      await assert.rejects(
        () => svc.createStaffUser({ userName: 'QC1', fullName: 'X', email: 'x@x.com', roleId: 2 }, 99),
        ConflictException,
      );
      assert.equal(mockDb.secUser.create.mock.callCount(), 0);
      assert.equal(mockDb.mstrPerson.create.mock.callCount(), 0);
    });
  });

  // ── updateUser ──

  describe('updateUser()', () => {
    it('will not let an admin lock themselves out', async () => {
      await assert.rejects(() => svc.updateUser(99, { isActive: false }, 99), BadRequestException);
      await assert.rejects(() => svc.updateUser(99, { roleId: 2 }, 99), BadRequestException);
      assert.equal(mockDb.secUser.updateMany.mock.callCount(), 0);
    });

    // An employer's person row is tied to a company; a staff role would carry it along.
    it('refuses to move an employer login onto a staff role', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => [
        { userID: 4n, subscriberID: null, SecMapUserRoles: [{ roleId: 4 }] },
      ]);
      await assert.rejects(() => svc.updateUser(4, { roleId: 3 }, 99), BadRequestException);
      assert.equal(mockDb.secMapUserRoles.updateMany.mock.callCount(), 0);
    });

    // Regression: 'Y'/'N' and tblSecUser.RoleID are not what login reads — a reactivated
    // user could never log in again, and role changes silently did nothing.
    it('writes the active flag and role where login reads them, and revokes sessions', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => [{ userID: 1n, subscriberID: null, SecMapUserRoles: [{ roleId: 2 }] }]);
      mockDb.secUser.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
      mockDb.secMapUserRoles.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
      mockDb.secActiveSessions.deleteMany.mock.mockImplementation(async () => ({ count: 1 }));

      const result = await svc.updateUser(1, { roleId: 5, isActive: false }, 99);
      assert.deepEqual(result, { ok: true });
      const writes = mockDb.secUser.updateMany.mock.calls.map((c) => c.arguments[0].data);
      assert.ok(writes.some((d) => d.active === '0'));
      assert.equal(mockDb.secMapUserRoles.updateMany.mock.calls[0].arguments[0].data.roleId, 5);
      assert.equal(mockDb.secActiveSessions.deleteMany.mock.callCount(), 1);
    });

    it("reactivates with '1', the only value login accepts", async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => [{ userID: 1n, subscriberID: null, SecMapUserRoles: [{ roleId: 2 }] }]);
      mockDb.secUser.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
      await svc.updateUser(1, { isActive: true }, 99);
      assert.equal(mockDb.secUser.updateMany.mock.calls[0].arguments[0].data.active, '1');
      assert.equal(mockDb.secActiveSessions.deleteMany.mock.callCount(), 0);
    });

    it('refuses to move a candidate login onto a staff role', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => [{ userID: 1n, subscriberID: 7n, SecMapUserRoles: [{ roleId: 1 }] }]);
      await assert.rejects(() => svc.updateUser(1, { roleId: 5 }, 99), BadRequestException);
      assert.equal(mockDb.secMapUserRoles.updateMany.mock.callCount(), 0);
    });

    it('throws NotFoundException for missing user', async () => {
      mockDb.secUser.findMany.mock.mockImplementation(async () => []);
      await assert.rejects(() => svc.updateUser(999, {}, 99), NotFoundException);
    });
  });

  // ── employer approvals ──

  describe('reviewEmployer()', () => {
    // Regression: approving twice created a second company and a duplicate login.
    it('refuses a registration that was already reviewed, creating nothing', async () => {
      mockDb.employerRegistration.findUnique.mock.mockImplementation(async () => ({ id: 4, status: 'Approved' }));
      await assert.rejects(() => svc.reviewEmployer(4, 'Approved', 99), ConflictException);
      assert.equal(mockDb.mstrPerson.create.mock.callCount(), 0);
      assert.equal(mockDb.employerRegistration.updateMany.mock.callCount(), 0);
    });

    // Two admins approving at once: both read Pending, only one wins the conditional claim.
    it('loses the race cleanly when another admin claimed it first', async () => {
      mockDb.employerRegistration.findUnique.mock.mockImplementation(async () => ({ id: 4, status: 'Pending', emailCompany: 'a@b.in', location: 'Pune' }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
      mockDb.mstrCily.findFirst.mock.mockImplementation(async () => ({ cityID: 413 }));
      mockDb.mstrCily.findUnique.mock.mockImplementation(async () => ({ cityID: 413 }));
      mockDb.employerRegistration.updateMany.mock.mockImplementation(async () => ({ count: 0 }));
      await assert.rejects(() => svc.reviewEmployer(4, 'Approved', 99), ConflictException);
      assert.equal(mockDb.employerRegistration.updateMany.mock.calls[0].arguments[0].where.status, 'Pending');
      assert.equal(mockDb.mstrPerson.create.mock.callCount(), 0);
    });

    it('refuses to approve when a login with that username already exists', async () => {
      mockDb.employerRegistration.findUnique.mock.mockImplementation(async () => ({ id: 5, status: 'Pending', emailCompany: 'hr@acme.in' }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => ({ userID: 9n }));
      await assert.rejects(() => svc.reviewEmployer(5, 'Approved', 99), ConflictException);
      assert.equal(mockDb.employerRegistration.updateMany.mock.callCount(), 0);
    });

    // Regression: the claim and the five creates were separate writes, so a failure halfway
    // left an "Approved" registration that could never be retried.
    it('claims and creates inside one transaction', async () => {
      mockDb.employerRegistration.findUnique.mock.mockImplementation(async () => ({ id: 6, status: 'Pending', emailCompany: 'hr@acme.in', companyName: '<b>Acme</b>' }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
      mockDb.employerRegistration.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
      mockDb.mstrCily.findUnique.mock.mockImplementation(async () => ({ cityID: 413 }));
      mockDb.mstrPerson.create.mock.mockImplementation(async () => { throw new Error('boom'); });
      const before = mockDb.$transaction.mock.callCount();
      await assert.rejects(() => svc.reviewEmployer(6, 'Approved', 99, undefined, 413), /boom/);
      assert.equal(mockDb.$transaction.mock.callCount(), before + 1);
    });
  });

  describe('reviewEmployer() city', () => {
    // Regression: CityID was written as 0, which violates tblClientMstr's foreign key, so no
    // approval could ever succeed.
    it('refuses to approve when the location matches no city and none was chosen', async () => {
      mockDb.employerRegistration.findUnique.mock.mockImplementation(async () => ({ id: 7, status: 'Pending', emailCompany: 'a@b.in', location: 'Somewhere' }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
      mockDb.mstrCily.findFirst.mock.mockImplementation(async () => null);
      await assert.rejects(() => svc.reviewEmployer(7, 'Approved', 99), BadRequestException);
      assert.equal(mockDb.employerRegistration.updateMany.mock.callCount(), 0);
    });

    it('uses the city named in the free-text location', async () => {
      mockDb.employerRegistration.findUnique.mock.mockImplementation(async () => ({ id: 8, status: 'Pending', emailCompany: 'a@b.in', companyName: 'A', location: 'Baner, Pune' }));
      mockDb.secUser.findFirst.mock.mockImplementation(async () => null);
      mockDb.mstrCily.findFirst.mock.mockImplementation(async () => ({ cityID: 413 }));
      mockDb.mstrCily.findUnique.mock.mockImplementation(async () => ({ cityID: 413 }));
      mockDb.employerRegistration.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
      mockDb.mstrPerson.create.mock.mockImplementation(async () => ({ personNodeID: 1n }));
      mockDb.clientMstr.create = mock.fn(async () => ({ clientID: 2n }));
      mockDb.clientMstr.update = mock.fn(async () => ({}));
      mockDb.mstrPerson.update = mock.fn(async () => ({}));
      mockDb.secUser.create.mock.mockImplementation(async () => ({ userID: 3n }));
      mockDb.secMapUserRoles.create.mock.mockImplementation(async () => ({}));
      await svc.reviewEmployer(8, 'Approved', 99);
      assert.equal(mockDb.clientMstr.create.mock.calls[0].arguments[0].data.cityID, 413);
    });
  });

  // ── jobs ──

  describe('jobs()', () => {
    it('returns a page of jobs with the actions open to each', async () => {
      mockDb.clientJobs.count.mock.mockImplementation(async () => 1);
      mockDb.clientJobs.groupBy.mock.mockImplementation(async () => [{ statusID: 1, _count: { _all: 1 } }]);
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => [
        {
          jobID: 1n, clientID: 3n, statusID: 1, minCTC: 300000, maxCTC: 600000,
          timestampIns: new Date('2025-01-15'),
          designation: { descr: 'Engineer' }, client: { clientName: 'ACME' },
          jobCity: { descr: 'Mumbai' }, _count: { JobSubscriberMapping: 5 },
        },
      ]);
      const result = await svc.jobs({ status: 'Active' });
      assert.equal(mockDb.clientJobs.findMany.mock.calls[0].arguments[0].where.statusID, 1);
      assert.equal(result.items[0].designation, 'Engineer');
      assert.equal(result.items[0].status, 'Active');
      assert.deepEqual(result.items[0].allowedActions, ['close']);
      assert.equal(result.counts.Active, 1);
    });
  });

  // ── moderateJobs ──

  describe('moderateJobs()', () => {
    it('closes an Active job, audited with from/to', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => [{ jobID: 1n, statusID: 1 }]);
      mockDb.clientJobs.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
      const result = await svc.moderateJobs([1], 'close', 99);
      assert.deepEqual(result, { ok: true, updated: 1 });
      const args = mockDb.clientJobs.updateMany.mock.calls[0].arguments[0];
      assert.deepEqual(args.where.statusID, 1);
      assert.equal(args.data.statusID, 2);
      assert.equal(mockAudit.record.mock.calls[0].arguments[0].action, 'admin.job_closed');
    });

    // Regression: "approve" set any job — an employer's Draft included — straight to Active.
    it('refuses to touch a Draft or Archived job', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => [{ jobID: 1n, statusID: 4 }]);
      await assert.rejects(() => svc.moderateJobs([1], 'reopen', 99), BadRequestException);
      await assert.rejects(() => svc.moderateJobs([1], 'close', 99), BadRequestException);
      assert.equal(mockDb.clientJobs.updateMany.mock.callCount(), 0);
    });

    it('reports a conflict when another admin moved the job first', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => [{ jobID: 1n, statusID: 2 }]);
      mockDb.clientJobs.updateMany.mock.mockImplementation(async () => ({ count: 0 }));
      await assert.rejects(() => svc.moderateJobs([1], 'reopen', 99), ConflictException);
    });

    it('throws NotFoundException for a missing job', async () => {
      mockDb.clientJobs.findMany.mock.mockImplementation(async () => []);
      await assert.rejects(() => svc.moderateJobs([999], 'close', 99), NotFoundException);
    });
  });

  // ── pipeline stages ──

  describe('stageOf() / nextStepFor()', () => {
    it('places every status id in the order an application travels', () => {
      assert.equal(stageOf(1), 'Screening');
      assert.equal(stageOf(11), 'Screening');
      assert.equal(stageOf(14), 'WithQ3');
      assert.equal(stageOf(15), 'CompanyReview');
      assert.equal(stageOf(18), 'Interview');
      assert.equal(stageOf(20), 'Selection');
      assert.equal(stageOf(22), 'Joined');
      assert.equal(stageOf(23), 'Closed');
      for (let id = 1; id <= 23; id++) assert.ok(stageOf(id));
    });

    it('sends the next step to the workspace that owns it', () => {
      assert.equal(nextStepFor(1, 7, 3).to, '/q2/applications/7');
      assert.equal(nextStepFor(2, 7, 3).to, '/q3/scheduling/7');
      assert.equal(nextStepFor(16, 7, 3).owner, 'Q3');
      assert.equal(nextStepFor(20, 7, 3).owner, 'Candidate');
      assert.equal(nextStepFor(5, 7, 3).owner, null);
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
      mockDb.blogPost.findUnique.mock.mockImplementation(async () => null);
      mockDb.secUser.findMany.mock.mockImplementation(async () => []);
      mockDb.blogPost.create.mock.mockImplementation(async () => ({ postId: 42 }));
      const result = await svc.createBlogPost({ title: 'T', slug: 's', body: 'b' } as any, 1);
      assert.equal(result.postId, 42);
      assert.equal(mockAudit.record.mock.calls[0].arguments[0].action, 'admin.blog_post_created');
    });

    it('answers 409 for a slug already in use, instead of a database 500', async () => {
      mockDb.blogPost.findUnique.mock.mockImplementation(async () => ({ postId: 1 }));
      await assert.rejects(() => svc.createBlogPost({ title: 'T', slug: 's', body: 'b' } as any, 1), ConflictException);
      assert.equal(mockDb.blogPost.create.mock.callCount(), 0);
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
