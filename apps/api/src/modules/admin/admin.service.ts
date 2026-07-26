import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JOB_STATUS_ACTIVE } from '@/shared/status';
import type {
  AdminJobsQueryDto,
  AdminUsersQueryDto,
  CreateBlogPostDto,
  UpdateBlogPostDto,
  UpdateSettingsDto,
} from './dto/admin.dto';

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: 'Aajiveka',
  tagline: 'Empowering Careers',
  supportEmail: '',
  tollFreeNumber: '',
  enableJobAlerts: 'true',
  enableAssessments: 'false',
  enableReferrals: 'false',
  enableMessaging: 'false',
  maintenanceMode: 'false',
  registrationOpen: 'true',
  enableEmailNotifications: 'true',
  smtpHost: '',
  smtpPort: '587',
  senderEmail: '',
  senderName: '',
  maxJobsPerEmployer: '50',
  maxApplicationsPerCandidate: '100',
  maxFileUploadSizeMb: '5',
};

const BOOL_KEYS = new Set([
  'enableJobAlerts', 'enableAssessments', 'enableReferrals', 'enableMessaging',
  'maintenanceMode', 'registrationOpen', 'enableEmailNotifications',
]);
const NUM_KEYS = new Set(['smtpPort', 'maxJobsPerEmployer', 'maxApplicationsPerCandidate', 'maxFileUploadSizeMb']);

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /* ─── Platform Stats ─── */

  async stats() {
    const [totalCandidates, totalEmployers, totalJobs, activeJobs, totalApplications] =
      await Promise.all([
        this.db.subscriberRegistration.count(),
        this.db.clientMstr.count(),
        this.db.clientJobs.count(),
        this.db.clientJobs.count({ where: { statusID: JOB_STATUS_ACTIVE } }),
        this.db.jobSubscriberMapping.count(),
      ]);

    let totalRevenue = 0;
    try {
      const result = await this.db.paymentOrder.aggregate({
        _sum: { amountInr: true },
        where: { status: 'SUCCESS' },
      });
      totalRevenue = Number(result._sum?.amountInr ?? 0);
    } catch {
      // paymentOrder may not have data
    }

    // Recent signups (last 30 days) — use raw query for date grouping
    let recentSignups: { date: string; count: number }[] = [];
    try {
      const rows = await this.db.$queryRaw<{ d: Date; c: bigint }[]>`
        SELECT DATE("TimestampIns") as d, COUNT(*)::bigint as c
        FROM "tblSecUser"
        WHERE "TimestampIns" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("TimestampIns")
        ORDER BY d
      `;
      recentSignups = rows.map((r) => ({
        date: r.d.toISOString().slice(0, 10),
        count: Number(r.c),
      }));
    } catch {
      // table may be empty
    }

    // Top designations
    let topDesignations: { designation: string; count: number }[] = [];
    try {
      const rows = await this.db.$queryRaw<{ descr: string; c: bigint }[]>`
        SELECT d."Descr" as descr, COUNT(*)::bigint as c
        FROM "tblClientJobs" j
        JOIN "tblMstrDesignation" d ON d."DesignationID" = j."DesignationID"
        GROUP BY d."Descr"
        ORDER BY c DESC
        LIMIT 10
      `;
      topDesignations = rows.map((r) => ({ designation: r.descr ?? '', count: Number(r.c) }));
    } catch {
      // ignore
    }

    // Top cities
    let topCities: { city: string; count: number }[] = [];
    try {
      const rows = await this.db.$queryRaw<{ descr: string; c: bigint }[]>`
        SELECT c."Descr" as descr, COUNT(*)::bigint as c
        FROM "tblClientJobs" j
        JOIN "tblMstrCily" c ON c."CityID" = j."JobCityID"
        GROUP BY c."Descr"
        ORDER BY c DESC
        LIMIT 10
      `;
      topCities = rows.map((r) => ({ city: r.descr ?? '', count: Number(r.c) }));
    } catch {
      // ignore
    }

    // Recent activity from audit log
    let recentActivity: { id: number; type: string; description: string; actor: string; timestamp: string }[] = [];
    try {
      const logs = await this.db.auditLog.findMany({
        take: 20,
        orderBy: { timestampIns: 'desc' },
      });
      recentActivity = logs.map((l) => ({
        id: Number(l.auditID),
        type: l.action?.includes('login') ? 'user_signup' : l.action?.includes('job') ? 'job_posted' : 'application',
        description: l.action ?? '',
        actor: `User #${l.userID ?? 'system'}`,
        timestamp: l.timestampIns?.toISOString() ?? '',
      }));
    } catch {
      // ignore
    }

    return {
      totalCandidates,
      totalEmployers,
      totalJobs,
      activeJobs,
      totalApplications,
      totalRevenue,
      recentSignups,
      topDesignations,
      topCities,
      recentActivity,
    };
  }

  /* ─── Users ─── */

  async users(query: AdminUsersQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.roleId) where.roleID = query.roleId;
    if (query.isActive !== undefined) where.active = query.isActive ? 'Y' : 'N';
    if (query.q) {
      where.userName = { contains: query.q, mode: 'insensitive' };
    }

    const rows = await this.db.secUser.findMany({
      where,
      orderBy: { userID: 'desc' },
      select: {
        userID: true,
        userName: true,
        roleID: true,
        active: true,
        subscriberID: true,
      },
    });

    // Batch-load subscriber names for candidates
    const subscriberIds = rows
      .filter((r) => r.subscriberID != null)
      .map((r) => Number(r.subscriberID));
    const cvMap = new Map<number, { fullName: string | null; mobileNo1: string | null }>();
    if (subscriberIds.length) {
      const cvs = await this.db.subscriberCVDetails.findMany({
        where: { subscriberID: { in: subscriberIds } },
        select: { subscriberID: true, fullName: true, mobileNo1: true },
      });
      for (const cv of cvs) cvMap.set(Number(cv.subscriberID), cv);
    }

    return rows.map((u) => {
      const cv = u.subscriberID ? cvMap.get(Number(u.subscriberID)) : null;
      return {
        userId: Number(u.userID),
        userName: u.userName ?? '',
        fullName: cv?.fullName?.trim() || u.userName || '',
        email: u.userName ?? '',
        mobile: cv?.mobileNo1 ?? '',
        roleId: u.roleID ?? 1,
        isActive: u.active === 'Y',
        createdAt: '',
      };
    });
  }

  async updateUser(userId: number, data: { roleId?: number; isActive?: boolean }, adminUserId: number) {
    const user = await this.db.secUser.findUnique({ where: { userID: BigInt(userId) } });
    if (!user) throw new NotFoundException('User not found');

    const update: Record<string, unknown> = {};
    if (data.roleId !== undefined) update.roleID = data.roleId;
    if (data.isActive !== undefined) update.active = data.isActive ? 'Y' : 'N';

    await this.db.secUser.update({ where: { userID: BigInt(userId) }, data: update });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.user_updated',
      entity: 'SecUser',
      entityId: userId,
      detail: data,
    });
    return { ok: true };
  }

  async bulkDeleteUsers(userIds: number[], adminUserId: number) {
    await this.db.secUser.updateMany({
      where: { userID: { in: userIds.map(BigInt) } },
      data: { active: 'N' },
    });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.users_bulk_deleted',
      detail: { userIds },
    });
    return { ok: true };
  }

  async bulkUpdateUsers(userIds: number[], data: { isActive?: boolean; roleId?: number }, adminUserId: number) {
    const update: Record<string, unknown> = {};
    if (data.roleId !== undefined) update.roleID = data.roleId;
    if (data.isActive !== undefined) update.active = data.isActive ? 'Y' : 'N';

    await this.db.secUser.updateMany({
      where: { userID: { in: userIds.map(BigInt) } },
      data: update,
    });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.users_bulk_updated',
      detail: { userIds, ...data },
    });
    return { ok: true };
  }

  /* ─── Jobs ─── */

  async jobs(query: AdminJobsQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.status === 'Active') where.statusID = JOB_STATUS_ACTIVE;
    else if (query.status === 'Closed') where.statusID = 2;

    const rows = await this.db.clientJobs.findMany({
      where,
      orderBy: { timestampIns: 'desc' },
      include: {
        designation: { select: { descr: true } },
        client: { select: { clientName: true } },
        jobCity: { select: { descr: true } },
        _count: { select: { JobSubscriberMapping: true } },
      },
    });

    let result = rows.map((j) => ({
      jobId: Number(j.jobID),
      designation: j.designation?.descr ?? '',
      company: j.client?.clientName ?? '',
      city: j.jobCity?.descr ?? '',
      minCtc: j.minCTC ?? 0,
      maxCtc: j.maxCTC ?? 0,
      status: j.statusID === JOB_STATUS_ACTIVE ? 'Active' : 'Closed',
      postedOn: j.timestampIns?.toISOString().slice(0, 10) ?? '',
      views: 0,
      applications: j._count.JobSubscriberMapping,
    }));

    if (query.q) {
      const q = query.q.toLowerCase();
      result = result.filter(
        (j) =>
          j.designation.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.city.toLowerCase().includes(q),
      );
    }
    if (query.company) {
      result = result.filter((j) => j.company === query.company);
    }

    return result;
  }

  async approveJob(jobId: number, adminUserId: number) {
    const job = await this.db.clientJobs.findUnique({ where: { jobID: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    await this.db.clientJobs.update({
      where: { jobID: jobId },
      data: { statusID: JOB_STATUS_ACTIVE, timestampUpd: new Date(), loginIDUpd: adminUserId },
    });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.job_approved',
      entity: 'ClientJobs',
      entityId: jobId,
    });
    return { ok: true };
  }

  async rejectJob(jobId: number, adminUserId: number) {
    const job = await this.db.clientJobs.findUnique({ where: { jobID: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    await this.db.clientJobs.update({
      where: { jobID: jobId },
      data: { statusID: 2, timestampUpd: new Date(), loginIDUpd: adminUserId },
    });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.job_rejected',
      entity: 'ClientJobs',
      entityId: jobId,
    });
    return { ok: true };
  }

  async bulkModerateJobs(jobIds: number[], action: 'approve' | 'reject', adminUserId: number) {
    const statusID = action === 'approve' ? JOB_STATUS_ACTIVE : 2;
    await this.db.clientJobs.updateMany({
      where: { jobID: { in: jobIds } },
      data: { statusID, timestampUpd: new Date(), loginIDUpd: adminUserId },
    });
    await this.audit.record({
      userId: adminUserId,
      action: `admin.jobs_bulk_${action}`,
      detail: { jobIds },
    });
    return { ok: true };
  }

  /* ─── Settings ─── */

  async getSettings() {
    const rows = await this.db.platformSetting.findMany();
    const stored = new Map(rows.map((r) => [r.key, r.value]));

    const result: Record<string, unknown> = {};
    for (const [key, defaultVal] of Object.entries(DEFAULT_SETTINGS)) {
      const raw = stored.get(key) ?? defaultVal;
      if (BOOL_KEYS.has(key)) result[key] = raw === 'true';
      else if (NUM_KEYS.has(key)) result[key] = Number(raw);
      else result[key] = raw;
    }
    return result;
  }

  async updateSettings(dto: UpdateSettingsDto, adminUserId: number) {
    const entries = Object.entries(dto).filter(([, v]) => v !== undefined);
    const now = new Date();

    for (const [key, value] of entries) {
      const strVal = String(value);
      await this.db.platformSetting.upsert({
        where: { key },
        create: { key, value: strVal, updatedAt: now, updatedBy: adminUserId },
        update: { value: strVal, updatedAt: now, updatedBy: adminUserId },
      });
    }

    await this.audit.record({
      userId: adminUserId,
      action: 'admin.settings_updated',
      detail: dto,
    });
    return { ok: true };
  }

  /* ─── Blog Posts ─── */

  async blogPosts() {
    const rows = await this.db.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((p) => ({
      postId: p.postId,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? '',
      body: p.body,
      imageUrl: p.imageUrl ?? '',
      category: p.category,
      status: p.status,
      author: p.author ?? '',
      createdAt: p.createdAt?.toISOString() ?? '',
      publishedAt: p.publishedAt?.toISOString() ?? null,
    }));
  }

  async createBlogPost(dto: CreateBlogPostDto, adminUserId: number) {
    const post = await this.db.blogPost.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt ?? null,
        body: dto.body,
        imageUrl: dto.imageUrl ?? null,
        category: dto.category ?? 'general',
        status: dto.status ?? 'Draft',
        author: `User #${adminUserId}`,
        publishedAt: dto.status === 'Published' ? new Date() : null,
      },
    });
    return { postId: post.postId };
  }

  async updateBlogPost(id: number, dto: UpdateBlogPostDto, adminUserId: number) {
    const post = await this.db.blogPost.findUnique({ where: { postId: id } });
    if (!post) throw new NotFoundException('Blog post not found');

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'Published' && !post.publishedAt) data.publishedAt = new Date();
    }

    await this.db.blogPost.update({ where: { postId: id }, data });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.blog_post_updated',
      entity: 'BlogPost',
      entityId: id,
    });
    return { ok: true };
  }

  async deleteBlogPost(id: number, adminUserId: number) {
    const post = await this.db.blogPost.findUnique({ where: { postId: id } });
    if (!post) throw new NotFoundException('Blog post not found');

    await this.db.blogPost.delete({ where: { postId: id } });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.blog_post_deleted',
      entity: 'BlogPost',
      entityId: id,
    });
    return { ok: true };
  }
}
