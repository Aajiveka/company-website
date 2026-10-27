import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { env } from '@/config/env';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { staffDirectory } from '@/modules/recruitment/staff-directory';
import { createStaffLogin, issuePasswordResetToken } from './staff-account';
import { Role, type RoleId } from '@/shared/roles';
import {
  JOB_STATUS_ACTIVE,
  JOB_STATUS_ARCHIVED,
  JOB_STATUS_CLOSED,
  JOB_STATUS_DRAFT,
  JobMapStatus,
} from '@/shared/status';
import type {
  AdminApplicationsQueryDto,
  AdminAuditQueryDto,
  AdminCompaniesQueryDto,
  AdminJobsQueryDto,
  AdminUsersQueryDto,
  CreateBlogPostDto,
  CreateStaffUserDto,
  JobAction,
  UpdateBlogPostDto,
  UpdateSettingsDto,
} from './dto/admin.dto';

/** tblSecUser.Active values — login accepts only '1'. */
const ACTIVE = '1';
const INACTIVE = '0';

/** A new staff member gets three days to set a password; an admin-sent reset, one hour. */
const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const JOB_STATUS_LABEL = {
  [JOB_STATUS_ACTIVE]: 'Active',
  [JOB_STATUS_CLOSED]: 'Closed',
  [JOB_STATUS_ARCHIVED]: 'Archived',
  [JOB_STATUS_DRAFT]: 'Draft',
} as const;
type JobStatusLabel = (typeof JOB_STATUS_LABEL)[keyof typeof JOB_STATUS_LABEL];
const JOB_STATUS_ID = Object.fromEntries(
  Object.entries(JOB_STATUS_LABEL).map(([id, label]) => [label, Number(id)]),
) as Record<JobStatusLabel, number>;

function labelOfJob(statusId: number | null): string {
  return JOB_STATUS_LABEL[statusId as keyof typeof JOB_STATUS_LABEL] ?? 'Unknown';
}

/** The admin transitions open from a job's current state — mirrors moderateJobs' checks. */
function jobActionsFor(statusId: number | null): JobAction[] {
  if (statusId === JOB_STATUS_ACTIVE) return ['close'];
  if (statusId === JOB_STATUS_CLOSED) return ['reopen'];
  return [];
}

/**
 * The pipeline in the order an application travels it, with the workspace that owns each
 * stage. Grouped from tblMstrJobMappingStatus ids (shared/status.ts), not from Q3's derived
 * `stageOf` in shared/hiring.ts — that one only describes applications already referred to
 * Q3, while this has to place every application, including those still with Q1/Q2.
 */
export const PIPELINE_STAGES = [
  'Screening',
  'WithQ3',
  'CompanyReview',
  'Interview',
  'Selection',
  'Joined',
  'Closed',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

const STAGE_OF_STATUS: Record<number, PipelineStage> = {
  [JobMapStatus.MAPPED]: 'Screening',
  [JobMapStatus.ON_HOLD]: 'Screening',
  [JobMapStatus.NEED_MORE_INFO]: 'Screening',
  [JobMapStatus.DUPLICATE]: 'Screening',
  [JobMapStatus.REFERRED_TO_Q3]: 'WithQ3',
  [JobMapStatus.SENT_TO_COMPANY]: 'CompanyReview',
  [JobMapStatus.SHORTLISTED]: 'CompanyReview',
  [JobMapStatus.INTERVIEW_SCHEDULED]: 'Interview',
  [JobMapStatus.INTERVIEW_ATTENDED]: 'Interview',
  [JobMapStatus.RESCHEDULE_REQUESTED]: 'Interview',
  [JobMapStatus.RESCHEDULED]: 'Interview',
  [JobMapStatus.INTERVIEW_NOT_ATTENDED]: 'Interview',
  [JobMapStatus.INTERVIEW_R1]: 'Interview',
  [JobMapStatus.INTERVIEW_R2]: 'Interview',
  [JobMapStatus.INTERVIEW_R3]: 'Interview',
  [JobMapStatus.FINAL_ROUND]: 'Interview',
  [JobMapStatus.SELECTED]: 'Selection',
  [JobMapStatus.OFFER_SENT]: 'Selection',
  [JobMapStatus.OFFER_ACCEPTED]: 'Selection',
  [JobMapStatus.JOINED]: 'Joined',
  [JobMapStatus.REJECTED]: 'Closed',
  [JobMapStatus.WITHDRAWN]: 'Closed',
  [JobMapStatus.CV_EXPIRED]: 'Closed',
};

export function stageOf(statusId: number | null | undefined): PipelineStage {
  return (statusId != null && STAGE_OF_STATUS[statusId]) || 'Screening';
}

/**
 * Where the next move on an application is made, and by whom. Links into the workspace
 * pages Admin is already allowed into (router.tsx) — never an action the panel performs.
 */
export function nextStepFor(statusId: number | null | undefined, mapId: number, jobId: number | null) {
  const stage = stageOf(statusId);
  switch (stage) {
    case 'Screening':
      return { owner: 'Q2', label: 'Match and refer in Q2', to: `/q2/applications/${mapId}` };
    case 'WithQ3':
      return { owner: 'Q3', label: 'Validate and send to company in Q3', to: '/q3/referred' };
    case 'CompanyReview':
      return statusId === JobMapStatus.SHORTLISTED
        ? { owner: 'Q3', label: 'Set up the interview in Q3', to: `/q3/scheduling/${mapId}` }
        : { owner: 'Employer', label: 'Awaiting the company’s review', to: '/q3/company-review' };
    case 'Interview':
      return { owner: 'Q3', label: 'Run interviews and decisions in Q3', to: `/q3/decisions/${mapId}` };
    case 'Selection':
      return statusId === JobMapStatus.OFFER_SENT
        ? { owner: 'Candidate', label: 'Awaiting the candidate’s answer to the offer', to: `/q3/offers/${mapId}` }
        : { owner: 'Q3', label: 'Collect documents and issue the offer in Q3', to: `/q3/documents/${mapId}` };
    case 'Joined':
    case 'Closed':
      return { owner: null, label: stage === 'Joined' ? 'Hired — nothing left to do' : 'Closed', to: jobId ? `/q2/jobs/${jobId}` : null };
  }
}

function paging(q: { page?: number; pageSize?: number }) {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, q.pageSize ?? 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function parseDetail(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const USER_SELECT = {
  userID: true,
  userName: true,
  userMail: true,
  active: true,
  pwdStatus: true,
  nodeID: true,
  subscriberID: true,
  SecMapUserRoles: { select: { roleId: true }, take: 1 },
} satisfies Prisma.SecUserSelect;
type UserRow = Prisma.SecUserGetPayload<{ select: typeof USER_SELECT }>;

const JOB_INCLUDE = {
  designation: { select: { descr: true } },
  client: { select: { clientName: true } },
  jobCity: { select: { descr: true } },
  _count: { select: { JobSubscriberMapping: true } },
} satisfies Prisma.ClientJobsInclude;

function toJobRow(j: Prisma.ClientJobsGetPayload<{ include: typeof JOB_INCLUDE }>) {
  return {
    jobId: Number(j.jobID),
    clientId: Number(j.clientID),
    designation: j.designation?.descr ?? '',
    company: j.client?.clientName ?? '',
    city: j.jobCity?.descr ?? '',
    minCtc: j.minCTC ?? 0,
    maxCtc: j.maxCTC ?? 0,
    status: labelOfJob(j.statusID),
    postedOn: j.timestampIns?.toISOString() ?? null,
    applications: j._count.JobSubscriberMapping,
    allowedActions: jobActionsFor(j.statusID),
  };
}

const APPLICATION_SELECT = {
  jobSubscriberMapID: true,
  jobID: true,
  subscriberID: true,
  jobMapStatusID: true,
  mapDate: true,
  timestampIns: true,
  timestampUpd: true,
  jobMapStatus: { select: { descr: true } },
  job: {
    select: {
      jobID: true,
      clientID: true,
      designation: { select: { descr: true } },
      client: { select: { clientName: true } },
      jobCity: { select: { descr: true } },
    },
  },
  subscriber: {
    select: {
      registrationMobileNo: true,
      SubscriberCVDetails: { select: { fullName: true, emailID: true } },
      SecUser: { select: { userID: true } },
    },
  },
} satisfies Prisma.JobSubscriberMappingSelect;

function toApplicationRow(m: Prisma.JobSubscriberMappingGetPayload<{ select: typeof APPLICATION_SELECT }>) {
  const mapId = Number(m.jobSubscriberMapID);
  const jobId = m.jobID != null ? Number(m.jobID) : null;
  return {
    mapId,
    statusId: m.jobMapStatusID,
    status: m.jobMapStatus?.descr ?? (m.jobMapStatusID != null ? `Status ${m.jobMapStatusID}` : 'Unset'),
    stage: stageOf(m.jobMapStatusID),
    nextStep: nextStepFor(m.jobMapStatusID, mapId, jobId),
    appliedAt: (m.timestampIns ?? m.mapDate)?.toISOString() ?? null,
    updatedAt: m.timestampUpd?.toISOString() ?? null,
    candidate: {
      subscriberId: m.subscriberID != null ? Number(m.subscriberID) : null,
      userId: m.subscriber?.SecUser?.userID != null ? Number(m.subscriber.SecUser.userID) : null,
      name: m.subscriber?.SubscriberCVDetails?.fullName?.trim() || 'Unnamed candidate',
      email: m.subscriber?.SubscriberCVDetails?.emailID ?? '',
      mobile: m.subscriber?.registrationMobileNo ?? '',
    },
    job: {
      jobId,
      clientId: m.job?.clientID != null ? Number(m.job.clientID) : null,
      designation: m.job?.designation?.descr ?? '',
      company: m.job?.client?.clientName ?? '',
      city: m.job?.jobCity?.descr ?? '',
    },
  };
}

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
    private readonly email: EmailService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /* ─── Platform Stats ─── */

  /**
   * Every figure is counted from the database. The previous version charted signups from
   * tblSecUser."TimestampIns" — a column that does not exist — so the query threw, was
   * swallowed, and the chart was always empty.
   */
  async stats() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      totalLogins,
      activeLogins,
      roleRows,
      totalCandidates,
      newCandidates,
      totalEmployers,
      pendingRegistrations,
      jobRows,
      applicationRows,
      statusMaster,
      revenue,
    ] = await Promise.all([
      this.db.secUser.count(),
      this.db.secUser.count({ where: { active: ACTIVE } }),
      this.db.secMapUserRoles.groupBy({ by: ['roleId'], _count: { _all: true } }),
      this.db.subscriberRegistration.count(),
      this.db.subscriberRegistration.count({ where: { registrationDateTime: { gte: since } } }),
      this.db.clientMstr.count(),
      this.db.employerRegistration.count({ where: { status: 'Pending' } }),
      this.db.clientJobs.groupBy({ by: ['statusID'], _count: { _all: true } }),
      this.db.jobSubscriberMapping.groupBy({ by: ['jobMapStatusID'], _count: { _all: true } }),
      this.db.mstrJobMappingStatus.findMany({ select: { jobMapStatusID: true, descr: true } }),
      this.db.paymentOrder.aggregate({ _sum: { amountInr: true }, _count: { _all: true }, where: { status: 'SUCCESS' } }),
    ]);

    const jobsByStatus = Object.fromEntries(
      Object.entries(JOB_STATUS_LABEL).map(([id, label]) => [
        label,
        jobRows.find((r) => r.statusID === Number(id))?._count._all ?? 0,
      ]),
    ) as Record<JobStatusLabel, number>;
    const statusName = new Map(statusMaster.map((s) => [s.jobMapStatusID, s.descr ?? `Status ${s.jobMapStatusID}`]));
    const applicationsByStatus = applicationRows
      .map((r) => ({
        statusId: r.jobMapStatusID,
        label: r.jobMapStatusID != null ? (statusName.get(r.jobMapStatusID) ?? `Status ${r.jobMapStatusID}`) : 'Unset',
        stage: stageOf(r.jobMapStatusID),
        count: r._count._all,
      }))
      .sort((a, b) => (a.statusId ?? 0) - (b.statusId ?? 0));
    const applicationsByStage = Object.fromEntries(
      PIPELINE_STAGES.map((s) => [s, applicationsByStatus.filter((r) => r.stage === s).reduce((n, r) => n + r.count, 0)]),
    ) as Record<PipelineStage, number>;

    const signupRows = await this.db.$queryRaw<{ d: Date; c: bigint }[]>`
      SELECT DATE("RegistrationDateTime") AS d, COUNT(*)::bigint AS c
      FROM "tblSubscriberRegistration"
      WHERE "RegistrationDateTime" >= ${since}
      GROUP BY DATE("RegistrationDateTime")
      ORDER BY d
    `;
    const topDesignations = await this.db.$queryRaw<{ descr: string | null; c: bigint }[]>`
      SELECT d."Descr" AS descr, COUNT(*)::bigint AS c
      FROM "tblClientJobs" j
      JOIN "tblMstrDesignation" d ON d."DesignationID" = j."DesignationID"
      GROUP BY d."Descr" ORDER BY c DESC LIMIT 8
    `;
    const topCities = await this.db.$queryRaw<{ descr: string | null; c: bigint }[]>`
      SELECT c."Descr" AS descr, COUNT(*)::bigint AS c
      FROM "tblClientJobs" j
      JOIN "tblMstrCily" c ON c."CityID" = j."JobCityID"
      GROUP BY c."Descr" ORDER BY c DESC LIMIT 8
    `;

    const recent = await this.auditLogs({ page: 1, pageSize: 10 });

    return {
      users: {
        total: totalLogins,
        active: activeLogins,
        inactive: totalLogins - activeLogins,
        byRole: roleRows
          .map((r) => ({ roleId: r.roleId, count: r._count._all }))
          .sort((a, b) => a.roleId - b.roleId),
      },
      candidates: { total: totalCandidates, last30Days: newCandidates },
      employers: { total: totalEmployers, pendingRegistrations },
      jobs: { total: jobRows.reduce((n, r) => n + r._count._all, 0), byStatus: jobsByStatus },
      applications: {
        total: applicationRows.reduce((n, r) => n + r._count._all, 0),
        byStage: applicationsByStage,
        byStatus: applicationsByStatus,
      },
      payments: { successfulOrders: revenue._count._all, revenueInr: Number(revenue._sum.amountInr ?? 0) },
      signups: signupRows.map((r) => ({ date: r.d.toISOString().slice(0, 10), count: Number(r.c) })),
      topDesignations: topDesignations.map((r) => ({ label: r.descr ?? '—', count: Number(r.c) })),
      topCities: topCities.map((r) => ({ label: r.descr ?? '—', count: Number(r.c) })),
      recentActivity: recent.items,
    };
  }

  /* ─── Users ─── */

  async users(query: AdminUsersQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const where: Prisma.SecUserWhereInput = {};
    // Role lives in tblSecMapUserRoles (what login reads), not tblSecUser.RoleID, which
    // disagrees with it for legacy users. Active is '1'/'0', again matching login.
    if (query.roleId) where.SecMapUserRoles = { some: { roleId: query.roleId } };
    if (query.isActive !== undefined) where.active = query.isActive ? ACTIVE : INACTIVE;
    const q = query.q?.trim();
    if (q) {
      // Staff names live on tblMstrPerson, which tblSecUser reaches only through the
      // polymorphic NodeID — no relation to filter through, so resolve the ids first.
      const people = await this.db.mstrPerson.findMany({
        where: {
          OR: [
            { descr: { contains: q, mode: 'insensitive' } },
            { emailID: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { personNodeID: true },
        take: 500,
      });
      where.OR = [
        { userName: { contains: q, mode: 'insensitive' } },
        { userMail: { contains: q, mode: 'insensitive' } },
        {
          subscriber: {
            SubscriberCVDetails: {
              is: {
                OR: [
                  { fullName: { contains: q, mode: 'insensitive' } },
                  { emailID: { contains: q, mode: 'insensitive' } },
                  { mobileNo1: { contains: q } },
                ],
              },
            },
          },
        },
        ...(people.length
          ? [{ subscriberID: null, nodeID: { in: people.map((p) => p.personNodeID) } }]
          : []),
      ];
    }

    const [total, rows] = await Promise.all([
      this.db.secUser.count({ where }),
      this.db.secUser.findMany({
        where,
        orderBy: { userID: 'desc' },
        skip,
        take: pageSize,
        select: USER_SELECT,
      }),
    ]);

    return { items: await this.describeUsers(rows), total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
  }

  /**
   * Name, contact and joined date for a page of logins. A candidate's come from their CV and
   * registration; everyone else's from tblMstrPerson — resolved by role, never by NodeID
   * alone, because the two id spaces overlap (see SecUser.nodeID).
   */
  private async describeUsers(rows: UserRow[]) {
    const subscriberIds = rows.flatMap((r) => (r.subscriberID != null ? [r.subscriberID] : []));
    const nodeIds = rows.flatMap((r) => (r.subscriberID == null && r.nodeID != null ? [r.nodeID] : []));
    const [cvs, regs, people] = await Promise.all([
      subscriberIds.length
        ? this.db.subscriberCVDetails.findMany({
            where: { subscriberID: { in: subscriberIds } },
            select: { subscriberID: true, fullName: true, emailID: true, mobileNo1: true },
          })
        : [],
      subscriberIds.length
        ? this.db.subscriberRegistration.findMany({
            where: { subscriberID: { in: subscriberIds } },
            select: { subscriberID: true, registrationDateTime: true, registrationMobileNo: true },
          })
        : [],
      nodeIds.length
        ? this.db.mstrPerson.findMany({
            where: { personNodeID: { in: nodeIds } },
            select: { personNodeID: true, descr: true, emailID: true, tImestampIns: true, clientID: true },
          })
        : [],
    ]);
    const cvOf = new Map(cvs.map((c) => [String(c.subscriberID), c]));
    const regOf = new Map(regs.map((r) => [String(r.subscriberID), r]));
    const personOf = new Map(people.map((p) => [String(p.personNodeID), p]));

    return rows.map((u) => {
      const roleId = u.SecMapUserRoles[0]?.roleId ?? Role.Subscriber;
      const cv = u.subscriberID != null ? cvOf.get(String(u.subscriberID)) : undefined;
      const reg = u.subscriberID != null ? regOf.get(String(u.subscriberID)) : undefined;
      const person = u.subscriberID == null && u.nodeID != null ? personOf.get(String(u.nodeID)) : undefined;
      const joined = reg?.registrationDateTime ?? person?.tImestampIns ?? null;
      return {
        userId: Number(u.userID),
        userName: u.userName ?? '',
        fullName: cv?.fullName?.trim() || person?.descr?.trim() || u.userName || '',
        email: cv?.emailID?.trim() || person?.emailID?.trim() || u.userMail?.trim() || '',
        mobile: cv?.mobileNo1 || reg?.registrationMobileNo || '',
        roleId,
        isActive: u.active === ACTIVE,
        subscriberId: u.subscriberID != null ? Number(u.subscriberID) : null,
        clientId: person?.clientID != null ? Number(person.clientID) : null,
        createdAt: joined ? joined.toISOString() : null,
      };
    });
  }

  /** One login with everything an admin needs to judge it: profile, sessions, history. */
  async userDetail(userId: number) {
    const row = await this.db.secUser.findUnique({ where: { userID: BigInt(userId) }, select: USER_SELECT });
    if (!row) throw new NotFoundException('User not found');
    const [user] = await this.describeUsers([row]);

    const [logins, activeSessions, activity, actedOn] = await Promise.all([
      this.db.secUserLogin.findMany({
        where: { userID: BigInt(userId) },
        orderBy: { loginTime: 'desc' },
        take: 10,
        select: { loginTime: true, logouttime: true, iPAddress: true, isSessionEnd: true },
      }),
      this.db.secActiveSessions.count({ where: { userID: userId } }),
      this.auditLogs({ userId, page: 1, pageSize: 10 }),
      this.auditLogs({ entity: 'SecUser', entityId: String(userId), page: 1, pageSize: 10 }),
    ]);

    let candidate: Record<string, unknown> | null = null;
    if (user.subscriberId != null) {
      const sid = BigInt(user.subscriberId);
      const [applications, screening] = await Promise.all([
        this.applications({ subscriberId: user.subscriberId, page: 1, pageSize: 20 }),
        this.db.subscriberScreening.findUnique({ where: { subscriberID: sid } }).catch(() => null),
      ]);
      candidate = { applications: applications.items, screening };
    }

    let company: { clientId: number; clientName: string } | null = null;
    if (user.clientId != null) {
      const c = await this.db.clientMstr.findUnique({
        where: { clientID: BigInt(user.clientId) },
        select: { clientID: true, clientName: true },
      });
      if (c) company = { clientId: Number(c.clientID), clientName: c.clientName };
    }

    return {
      ...user,
      mustChangePassword: row.pwdStatus === 0,
      activeSessions,
      logins: logins.map((l) => ({
        loginTime: l.loginTime.toISOString(),
        logoutTime: l.logouttime?.toISOString() ?? null,
        ipAddress: l.iPAddress ?? null,
        ended: l.isSessionEnd === 1,
      })),
      activity: activity.items,
      history: actedOn.items,
      candidate,
      company,
    };
  }

  /**
   * A staff login (QC1, QC2, Q3 or Admin). The account gets an unguessable password nobody
   * knows, and the person sets their own through the normal reset flow — an admin never
   * learns, types or mails a password. Person, login and role mapping are written in one
   * transaction so a failure cannot leave a login with no role (which login would then
   * silently treat as a candidate).
   */
  async createStaffUser(dto: CreateStaffUserDto, adminUserId: number) {
    const userId = await createStaffLogin(this.db, { ...dto, createdBy: adminUserId });
    const email = dto.email.trim().toLowerCase();
    const userName = dto.userName.trim();
    const invite = await this.issueSetPasswordLink(userId, email, INVITE_TTL_MS);
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.user_created',
      entity: 'SecUser',
      entityId: userId,
      detail: { userName, roleId: dto.roleId },
    });
    return { userId, ...invite };
  }

  /** Mails the user a set-password link — the same single-use, hashed token reset uses. */
  async sendPasswordReset(userId: number, adminUserId: number) {
    const row = await this.db.secUser.findUnique({ where: { userID: BigInt(userId) }, select: USER_SELECT });
    if (!row) throw new NotFoundException('User not found');
    if (row.active !== ACTIVE) throw new BadRequestException('Activate the account before sending a reset link');
    const [user] = await this.describeUsers([row]);
    if (!user.email) throw new BadRequestException('This account has no email address on file');

    const result = await this.issueSetPasswordLink(userId, user.email, RESET_TTL_MS);
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.password_reset_sent',
      entity: 'SecUser',
      entityId: userId,
    });
    return result;
  }

  /**
   * Writes a reset token and mails the link. When no mail transport is configured the link
   * would be logged and never arrive, so it is handed back to the admin to pass on instead
   * — otherwise a new staff member could not be onboarded at all on such a deployment.
   */
  private async issueSetPasswordLink(userId: number, email: string, ttlMs: number) {
    const token = await issuePasswordResetToken(this.db, userId, ttlMs);
    const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
    const expiresIn = ttlMs >= 24 * 60 * 60 * 1000 ? `${Math.round(ttlMs / 86_400_000)} days` : '1 hour';
    await this.email.sendPasswordReset(email, { resetUrl, expiresIn }).catch(() => {});
    const delivered = env.EMAIL_DRIVER !== 'log';
    return { emailedTo: email, delivered, ...(delivered ? {} : { setPasswordUrl: resetUrl }) };
  }

  async updateUser(userId: number, data: { roleId?: number; isActive?: boolean }, adminUserId: number) {
    if (userId === adminUserId && (data.isActive === false || (data.roleId !== undefined && data.roleId !== Role.Admin))) {
      throw new BadRequestException('You cannot deactivate or demote your own account');
    }
    await this.applyUserChanges([userId], data);
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.user_updated',
      entity: 'SecUser',
      entityId: userId,
      detail: data,
    });
    return { ok: true };
  }

  /**
   * Writes status and role where login reads them. The previous version wrote 'Y'/'N' and
   * tblSecUser.RoleID: login requires Active = '1' (so a reactivated user could never log in
   * again) and ignores RoleID (so role changes did nothing). Sessions are revoked on either
   * change so a deactivated or re-roled user cannot keep refreshing the old token.
   *
   * A role change may not cross the candidate/staff line: a login's NodeID means
   * SubscriberID on one side and PersonNodeID on the other, so the account would resolve
   * to someone else's identity. Nor may it cross the employer line: an employer's person
   * row is tied to a company, and a staff role would carry that company access with it.
   */
  private async applyUserChanges(userIds: number[], data: { roleId?: number; isActive?: boolean }) {
    const ids = userIds.map(BigInt);
    const users = await this.db.secUser.findMany({
      where: { userID: { in: ids } },
      select: { userID: true, subscriberID: true, SecMapUserRoles: { select: { roleId: true }, take: 1 } },
    });
    if (users.length !== ids.length) throw new NotFoundException('User not found');

    if (data.roleId !== undefined) {
      if (!Object.values(Role).includes(data.roleId as RoleId)) {
        throw new BadRequestException('Unknown role');
      }
      const toCandidate = data.roleId === Role.Subscriber;
      if (users.some((u) => (u.subscriberID != null) !== toCandidate)) {
        throw new BadRequestException(
          'A candidate login cannot be given a staff or employer role, or the reverse',
        );
      }
      const toClient = data.roleId === Role.Client;
      if (users.some((u) => (u.SecMapUserRoles[0]?.roleId === Role.Client) !== toClient)) {
        throw new BadRequestException('An employer login cannot be given a staff role, or the reverse');
      }
    }

    await this.db.$transaction(async (tx) => {
      if (data.isActive !== undefined) {
        await tx.secUser.updateMany({
          where: { userID: { in: ids } },
          data: { active: data.isActive ? ACTIVE : INACTIVE },
        });
      }
      if (data.roleId !== undefined) {
        await tx.secUser.updateMany({ where: { userID: { in: ids } }, data: { roleID: data.roleId } });
        await tx.secMapUserRoles.updateMany({ where: { userID: { in: ids } }, data: { roleId: data.roleId } });
      }
      if (data.isActive === false || data.roleId !== undefined) {
        await tx.secActiveSessions.deleteMany({ where: { userID: { in: userIds } } });
      }
    });
  }

  async bulkDeleteUsers(userIds: number[], adminUserId: number) {
    if (userIds.includes(adminUserId)) throw new BadRequestException('You cannot deactivate your own account');
    await this.applyUserChanges(userIds, { isActive: false });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.users_bulk_deleted',
      detail: { userIds },
    });
    return { ok: true };
  }

  async bulkUpdateUsers(userIds: number[], data: { isActive?: boolean; roleId?: number }, adminUserId: number) {
    if (userIds.includes(adminUserId) && (data.isActive === false || (data.roleId !== undefined && data.roleId !== Role.Admin))) {
      throw new BadRequestException('You cannot deactivate or demote your own account');
    }
    await this.applyUserChanges(userIds, data);
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.users_bulk_updated',
      detail: { userIds, ...data },
    });
    return { ok: true };
  }

  /* ─── Jobs ─── */

  async jobs(query: AdminJobsQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const where: Prisma.ClientJobsWhereInput = {};
    if (query.status) where.statusID = JOB_STATUS_ID[query.status as JobStatusLabel];
    if (query.clientId) where.clientID = BigInt(query.clientId);
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { designation: { descr: { contains: q, mode: 'insensitive' } } },
        { client: { clientName: { contains: q, mode: 'insensitive' } } },
        { jobCity: { descr: { contains: q, mode: 'insensitive' } } },
        ...(/^\d+$/.test(q) ? [{ jobID: BigInt(q) }] : []),
      ];
    }

    const [total, rows, counts] = await Promise.all([
      this.db.clientJobs.count({ where }),
      this.db.clientJobs.findMany({
        where,
        orderBy: { timestampIns: 'desc' },
        skip,
        take: pageSize,
        include: JOB_INCLUDE,
      }),
      this.db.clientJobs.groupBy({
        by: ['statusID'],
        _count: { _all: true },
        where: { ...where, statusID: undefined },
      }),
    ]);

    return {
      items: rows.map(toJobRow),
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      counts: Object.fromEntries(
        Object.entries(JOB_STATUS_LABEL).map(([id, label]) => [
          label,
          counts.find((c) => c.statusID === Number(id))?._count._all ?? 0,
        ]),
      ),
    };
  }

  async jobDetail(jobId: number) {
    const job = await this.db.clientJobs.findUnique({
      where: { jobID: BigInt(jobId) },
      include: {
        ...JOB_INCLUDE,
        workMode: { select: { descr: true } },
        employeeType: { select: { descr: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    const [applications, history] = await Promise.all([
      this.applications({ jobId, page: 1, pageSize: 50 }),
      this.auditLogs({ entity: 'ClientJobs', entityId: String(jobId), page: 1, pageSize: 20 }),
    ]);
    return {
      ...toJobRow(job),
      clientId: Number(job.clientID),
      workMode: job.workMode?.descr ?? '',
      employmentType: job.employeeType?.descr ?? '',
      minExp: job.minExp,
      maxExp: job.maxExp,
      openings: job.maxEmp,
      description: job.jobDescr ?? '',
      updatedAt: job.timestampUpd?.toISOString() ?? null,
      allowedActions: jobActionsFor(job.statusID),
      applicants: applications.items,
      applicationsByStage: applications.byStage,
      history: history.items,
    };
  }

  /**
   * Close or reopen jobs, refusing any job not in the state the action starts from. The
   * claim is a conditional updateMany so two admins acting at once cannot both "succeed".
   */
  async moderateJobs(jobIds: number[], action: JobAction, adminUserId: number) {
    const ids = jobIds.map(BigInt);
    const from = action === 'close' ? JOB_STATUS_ACTIVE : JOB_STATUS_CLOSED;
    const to = action === 'close' ? JOB_STATUS_CLOSED : JOB_STATUS_ACTIVE;
    const jobs = await this.db.clientJobs.findMany({ where: { jobID: { in: ids } }, select: { jobID: true, statusID: true } });
    if (jobs.length !== ids.length) throw new NotFoundException('Job not found');
    const wrong = jobs.filter((j) => j.statusID !== from);
    if (wrong.length) {
      throw new BadRequestException(
        `Only ${JOB_STATUS_LABEL[from]} jobs can be ${action === 'close' ? 'closed' : 'reopened'} ` +
          `(job ${wrong.map((j) => j.jobID).join(', ')} is ${wrong.map((j) => labelOfJob(j.statusID)).join(', ')})`,
      );
    }
    const { count } = await this.db.clientJobs.updateMany({
      where: { jobID: { in: ids }, statusID: from },
      data: { statusID: to, timestampUpd: new Date(), loginIDUpd: adminUserId },
    });
    if (count !== ids.length) throw new ConflictException('A job changed while you were acting on it — reload and retry');

    for (const id of jobIds) {
      await this.audit.record({
        userId: adminUserId,
        action: action === 'close' ? 'admin.job_closed' : 'admin.job_reopened',
        entity: 'ClientJobs',
        entityId: id,
        detail: { from: JOB_STATUS_LABEL[from], to: JOB_STATUS_LABEL[to] },
      });
    }
    return { ok: true, updated: count };
  }

  /* ─── Applications (the hiring pipeline) ─── */

  /**
   * Read-only on purpose. Every move of an application belongs to a workspace — Q1 screens,
   * Q2 matches and refers, Q3 runs interviews, documents and offers, the employer decides —
   * and each of those enforces its own preconditions, mails and audit. Admin is allowed into
   * every one of them, so the panel links there (`nextStep`) instead of growing a second,
   * weaker way to change the same rows. `PATCH /recruitment/pipeline/:id` is exactly such a
   * bypass (no log, no history, no audit) and is deliberately not used.
   */
  async applications(query: AdminApplicationsQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const where: Prisma.JobSubscriberMappingWhereInput = {};
    if (query.statusId) where.jobMapStatusID = query.statusId;
    else if (query.stage) {
      const ids = Object.entries(STAGE_OF_STATUS)
        .filter(([, stage]) => stage === query.stage)
        .map(([id]) => Number(id));
      // An unset or unknown status counts as Screening (see stageOf), so the filter must too.
      where.AND = [
        query.stage === 'Screening'
          ? { OR: [{ jobMapStatusID: { in: ids } }, { jobMapStatusID: null }, { jobMapStatusID: { notIn: Object.keys(STAGE_OF_STATUS).map(Number) } }] }
          : { jobMapStatusID: { in: ids } },
      ];
    }
    if (query.jobId) where.jobID = BigInt(query.jobId);
    if (query.subscriberId) where.subscriberID = BigInt(query.subscriberId);
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { subscriber: { SubscriberCVDetails: { is: { fullName: { contains: q, mode: 'insensitive' } } } } },
        { subscriber: { SubscriberCVDetails: { is: { emailID: { contains: q, mode: 'insensitive' } } } } },
        { subscriber: { registrationMobileNo: { contains: q } } },
        { job: { designation: { descr: { contains: q, mode: 'insensitive' } } } },
        { job: { client: { clientName: { contains: q, mode: 'insensitive' } } } },
        ...(/^\d+$/.test(q) ? [{ jobSubscriberMapID: BigInt(q) }] : []),
      ];
    }

    const [total, rows, grouped] = await Promise.all([
      this.db.jobSubscriberMapping.count({ where }),
      this.db.jobSubscriberMapping.findMany({
        where,
        orderBy: { jobSubscriberMapID: 'desc' },
        skip,
        take: pageSize,
        select: APPLICATION_SELECT,
      }),
      this.db.jobSubscriberMapping.groupBy({
        by: ['jobMapStatusID'],
        _count: { _all: true },
        // Counts for every stage tab: the stage/status filter itself is left out.
        where: { ...where, jobMapStatusID: undefined, AND: undefined },
      }),
    ]);

    const byStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<PipelineStage, number>;
    for (const g of grouped) byStage[stageOf(g.jobMapStatusID)] += g._count._all;

    return {
      items: rows.map(toApplicationRow),
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
      byStage,
      statuses: await this.statusMaster(),
    };
  }

  async applicationDetail(mapId: number) {
    const row = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: BigInt(mapId) },
      select: {
        ...APPLICATION_SELECT,
        JobSubscriberStatus: {
          orderBy: { statusID: 'asc' },
          select: { jobMapStatusID: true, mappedbyUserID: true, timestampIns: true, mappedTimestamp: true, comments: true },
        },
        CvReferral: {
          orderBy: { id: 'desc' },
          select: {
            id: true, status: true, companyReviewStatus: true, referredByQ2At: true, referredByUserID: true,
            sentToCompanyAt: true, expiresAt: true, returnedAt: true, returnReason: true, returnNote: true,
          },
        },
        InterviewRound: {
          orderBy: { roundNumber: 'asc' },
          select: { roundNumber: true, roundName: true, status: true, result: true, decision: true, scheduledAt: true, conductedAt: true },
        },
        OfferLetter: { select: { status: true, generatedAt: true, sentAt: true, candidateResponseAt: true, joiningDate: true } },
        ApplicationHiring: {
          select: { selectedAt: true, docsRequestedAt: true, docsDueAt: true, docsForwardedAt: true, docsApprovedAt: true, joinedAt: true, onHoldAt: true },
        },
        ApplicationMatchReview: { select: { status: true, decidedAt: true, decidedBy: true, decisionNote: true } },
      },
    });
    if (!row) throw new NotFoundException('Application not found');

    const statuses = await this.statusMaster();
    const statusName = new Map(statuses.map((s) => [s.statusId, s.label]));
    const staff = await staffDirectory(this.db, [
      ...row.JobSubscriberStatus.map((s) => s.mappedbyUserID),
      ...row.CvReferral.map((r) => r.referredByUserID),
      row.ApplicationMatchReview?.decidedBy,
    ]);
    const nameOf = (id: number | bigint | null | undefined) =>
      id == null || Number(id) === 0 ? 'System' : (staff.get(Number(id))?.name ?? `User ${id}`);
    const audit = await this.auditLogs({ entity: 'JobSubscriberMapping', entityId: String(mapId), page: 1, pageSize: 20 });

    const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
    return {
      ...toApplicationRow(row),
      timeline: row.JobSubscriberStatus.map((s) => ({
        statusId: s.jobMapStatusID,
        label: s.jobMapStatusID != null ? (statusName.get(s.jobMapStatusID) ?? `Status ${s.jobMapStatusID}`) : 'Unset',
        at: iso(s.mappedTimestamp ?? s.timestampIns),
        by: nameOf(s.mappedbyUserID),
        comments: s.comments ?? null,
      })),
      matchReview: row.ApplicationMatchReview
        ? {
            status: row.ApplicationMatchReview.status,
            decidedAt: iso(row.ApplicationMatchReview.decidedAt),
            decidedBy: row.ApplicationMatchReview.decidedBy != null ? nameOf(row.ApplicationMatchReview.decidedBy) : null,
            note: row.ApplicationMatchReview.decisionNote ?? null,
          }
        : null,
      referrals: row.CvReferral.map((r) => ({
        id: Number(r.id),
        status: r.status,
        companyReviewStatus: r.companyReviewStatus,
        referredAt: iso(r.referredByQ2At),
        referredBy: nameOf(r.referredByUserID),
        sentToCompanyAt: iso(r.sentToCompanyAt),
        expiresAt: iso(r.expiresAt),
        returnedAt: iso(r.returnedAt),
        returnReason: r.returnReason ?? null,
        returnNote: r.returnNote ?? null,
      })),
      rounds: row.InterviewRound.map((r) => ({
        roundNumber: r.roundNumber,
        roundName: r.roundName ?? `Round ${r.roundNumber}`,
        status: r.status,
        result: r.result,
        decision: r.decision ?? null,
        scheduledAt: iso(r.scheduledAt),
        conductedAt: iso(r.conductedAt),
      })),
      hiring: row.ApplicationHiring
        ? Object.fromEntries(Object.entries(row.ApplicationHiring).map(([k, v]) => [k, iso(v as Date | null)]))
        : null,
      offer: row.OfferLetter
        ? {
            status: row.OfferLetter.status,
            generatedAt: iso(row.OfferLetter.generatedAt),
            sentAt: iso(row.OfferLetter.sentAt),
            respondedAt: iso(row.OfferLetter.candidateResponseAt),
            joiningDate: iso(row.OfferLetter.joiningDate),
          }
        : null,
      audit: audit.items,
    };
  }

  /** Status names from tblMstrJobMappingStatus, so a label is never hardcoded twice. */
  private async statusMaster() {
    const rows = await this.db.mstrJobMappingStatus.findMany({ orderBy: { jobMapStatusID: 'asc' } });
    return rows.map((r) => ({
      statusId: r.jobMapStatusID,
      label: r.descr ?? `Status ${r.jobMapStatusID}`,
      stage: stageOf(r.jobMapStatusID),
    }));
  }

  /* ─── Companies ─── */

  async companies(query: AdminCompaniesQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const q = query.q?.trim();
    const where: Prisma.ClientMstrWhereInput = q
      ? {
          OR: [
            { clientName: { contains: q, mode: 'insensitive' } },
            { emailID: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      this.db.clientMstr.count({ where }),
      this.db.clientMstr.findMany({
        where,
        orderBy: { clientID: 'desc' },
        skip,
        take: pageSize,
        select: {
          clientID: true,
          clientName: true,
          emailID: true,
          contactNo: true,
          companyWebsite: true,
          timestampIns: true,
          city: { select: { descr: true } },
          user: { select: { userID: true, userName: true, active: true } },
          _count: { select: { ClientJobs: true } },
        },
      }),
    ]);
    const ids = rows.map((r) => r.clientID);
    const [activeJobs, applications] = ids.length
      ? await Promise.all([
          this.db.clientJobs.groupBy({
            by: ['clientID'],
            _count: { _all: true },
            where: { clientID: { in: ids }, statusID: JOB_STATUS_ACTIVE },
          }),
          this.db.$queryRaw<{ id: bigint; c: bigint }[]>`
            SELECT j."ClientID" AS id, COUNT(*)::bigint AS c
            FROM "tblJobSubscriberMapping" m JOIN "tblClientJobs" j ON j."JobID" = m."JobID"
            WHERE j."ClientID" IN (${Prisma.join(ids)})
            GROUP BY j."ClientID"
          `,
        ])
      : [[], []];
    const activeOf = new Map(activeJobs.map((a) => [String(a.clientID), a._count._all]));
    const appsOf = new Map(applications.map((a) => [String(a.id), Number(a.c)]));

    return {
      items: rows.map((c) => ({
        clientId: Number(c.clientID),
        name: c.clientName,
        email: c.emailID ?? '',
        phone: c.contactNo ?? '',
        website: c.companyWebsite ?? '',
        city: c.city?.descr ?? '',
        createdAt: c.timestampIns.toISOString(),
        login: c.user
          ? { userId: Number(c.user.userID), userName: c.user.userName ?? '', isActive: c.user.active === ACTIVE }
          : null,
        jobs: c._count.ClientJobs,
        activeJobs: activeOf.get(String(c.clientID)) ?? 0,
        applications: appsOf.get(String(c.clientID)) ?? 0,
      })),
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  }

  /* ─── Audit trail ─── */

  async auditLogs(query: AdminAuditQueryDto) {
    const { page, pageSize, skip } = paging(query);
    const where: Prisma.AuditLogWhereInput = {};
    if (query.action) where.action = { startsWith: query.action };
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityID = query.entityId;
    if (query.userId) where.userID = BigInt(query.userId);

    const [total, rows] = await Promise.all([
      this.db.auditLog.count({ where }),
      this.db.auditLog.findMany({ where, orderBy: { auditID: 'desc' }, skip, take: pageSize }),
    ]);
    const actors = await staffDirectory(this.db, rows.map((r) => r.userID));
    return {
      items: rows.map((l) => ({
        id: Number(l.auditID),
        action: l.action,
        entity: l.entity ?? null,
        entityId: l.entityID ?? null,
        userId: l.userID != null ? Number(l.userID) : null,
        actor: l.userID == null || Number(l.userID) === 0 ? 'System' : (actors.get(Number(l.userID))?.name ?? `User ${l.userID}`),
        detail: parseDetail(l.detail),
        ipAddress: l.ipAddress ?? null,
        at: l.timestampIns.toISOString(),
      })),
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
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
    if (await this.db.blogPost.findUnique({ where: { slug: dto.slug }, select: { postId: true } })) {
      throw new ConflictException('Another post already uses that slug');
    }
    const author = (await staffDirectory(this.db, [adminUserId])).get(adminUserId)?.name;
    const post = await this.db.blogPost.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt ?? null,
        body: dto.body,
        imageUrl: dto.imageUrl ?? null,
        category: dto.category ?? 'general',
        status: dto.status ?? 'Draft',
        author: author ?? `User #${adminUserId}`,
        publishedAt: dto.status === 'Published' ? new Date() : null,
      },
    });
    await this.audit.record({
      userId: adminUserId,
      action: 'admin.blog_post_created',
      entity: 'BlogPost',
      entityId: post.postId,
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

  /* ─── Employer Registrations ─── */

  async employerRegistrations(status?: string) {
    const rows = await this.db.employerRegistration.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
    });
    const reviewers = await staffDirectory(this.db, rows.map((r) => r.reviewedBy));
    const pending = rows.filter((r) => r.status === 'Pending');
    const cityOf = new Map(await Promise.all(pending.map(async (r) => [String(r.id), await this.matchCity(r.location)] as const)));
    return rows.map((r) => ({
      id: Number(r.id),
      companyName: r.companyName,
      emailCompany: r.emailCompany,
      emailHR: r.emailHR,
      contactNumberCompany: r.contactNumberCompany,
      contactNumberHR: r.contactNumberHR,
      location: r.location,
      industryType: r.industryType,
      website: r.website,
      aboutCompany: r.aboutCompany,
      status: r.status,
      adminNotes: r.adminNotes,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reviewedBy: r.reviewedBy != null ? (reviewers.get(Number(r.reviewedBy))?.name ?? null) : null,
      suggestedCityId: cityOf.get(String(r.id)) ?? null,
    }));
  }

  /**
   * The city a registration's free-text location names, if any: the whole text, or one of
   * its comma-separated parts ("Baner, Pune, Maharashtra"), against tblMstrCily.
   */
  private async matchCity(location: string | null): Promise<number | null> {
    const parts = (location ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) return null;
    const city = await this.db.mstrCily.findFirst({
      where: { OR: [location!.trim(), ...parts].map((p) => ({ descr: { equals: p, mode: 'insensitive' as const } })) },
      select: { cityID: true },
    });
    return city?.cityID ?? null;
  }

  async reviewEmployer(
    registrationId: number,
    decision: 'Approved' | 'Rejected',
    adminUserId: number,
    notes?: string,
    cityId?: number,
  ) {
    const reg = await this.db.employerRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!reg) throw new NotFoundException('Employer registration not found');
    // Answered first, so a second review gets "already approved" rather than a city or
    // username complaint. The conditional claim below still settles a race between two admins.
    if (reg.status !== 'Pending') throw new ConflictException(`This registration has already been ${reg.status.toLowerCase()}`);

    if (decision === 'Approved') {
      // Checked before the claim: approving would otherwise create a second login with an
      // existing username, and login's findFirst would pick one of the two arbitrarily.
      const clash = await this.db.secUser.findFirst({
        where: { userName: { equals: reg.emailCompany, mode: 'insensitive' } },
        select: { userID: true },
      });
      if (clash) {
        throw new ConflictException(`A login named ${reg.emailCompany} already exists — resolve it before approving`);
      }
    }

    // tblClientMstr.CityID is a required foreign key. The previous version wrote 0, which no
    // city has, so every approval failed on the constraint — after the registration had
    // already been marked Approved, leaving it stuck.
    let companyCityId: number | null = null;
    if (decision === 'Approved') {
      companyCityId = cityId ?? (await this.matchCity(reg.location));
      if (!companyCityId) {
        throw new BadRequestException(
          `Choose the company's city — "${reg.location ?? 'no location'}" does not match a city on record`,
        );
      }
      const exists = await this.db.mstrCily.findUnique({ where: { cityID: companyCityId }, select: { cityID: true } });
      if (!exists) throw new BadRequestException('Unknown city');
    }

    const tempPassword = randomBytes(12).toString('base64url');
    const passwordHash = decision === 'Approved' ? await argon2.hash(tempPassword, { type: argon2.argon2id }) : null;
    const now = new Date();

    // The claim and every row approval creates commit together. Previously they were six
    // separate writes: a failure halfway left the registration "Approved" with a company
    // and no login (or a login with no role), and it could not be retried because the claim
    // only matches Pending rows.
    await this.db.$transaction(async (tx) => {
      // Claim the pending registration atomically. Without this a second approval (a double
      // click, or two admins) created a second company and a second login with the same
      // username.
      const { count } = await tx.employerRegistration.updateMany({
        where: { id: registrationId, status: 'Pending' },
        data: {
          status: decision,
          adminNotes: notes ?? null,
          reviewedAt: now,
          reviewedBy: BigInt(adminUserId),
        },
      });
      if (!count) throw new ConflictException(`This registration has already been ${reg.status.toLowerCase()}`);
      if (decision !== 'Approved') return;

      const person = await tx.mstrPerson.create({
        data: {
          descr: reg.companyName,
          emailID: reg.emailCompany,
          flgActive: 1,
          tImestampIns: now,
          loginIDIns: adminUserId,
          clientID: null,
        },
      });
      const client = await tx.clientMstr.create({
        data: {
          clientName: reg.companyName,
          clientAddress: reg.location ?? null,
          contactNo: reg.contactNumberCompany ?? null,
          emailID: reg.emailCompany,
          companyLogo: reg.companyLogo ?? null,
          companyWebsite: reg.website ?? null,
          companyDescr: reg.aboutCompany ?? null,
          cityID: companyCityId!,
          timestampIns: now,
          loginIDIns: BigInt(adminUserId),
          userID: null,
        },
      });
      const user = await tx.secUser.create({
        data: {
          userName: reg.emailCompany,
          userMail: reg.emailCompany,
          password: passwordHash,
          active: ACTIVE,
          pwdStatus: 0, // 0 = must change on first login
          nodeID: person.personNodeID,
          nodeType: 200,
          roleID: Role.Client,
          subscriberID: null,
        },
        select: { userID: true },
      });
      await tx.secMapUserRoles.create({
        data: {
          userID: user.userID,
          roleId: Role.Client,
          userNodeId: person.personNodeID,
          userNodeType: 200,
        },
      });
      await tx.clientMstr.update({ where: { clientID: client.clientID }, data: { userID: user.userID } });
      await tx.mstrPerson.update({ where: { personNodeID: person.personNodeID }, data: { clientID: client.clientID } });
    });

    if (decision === 'Approved') {
      // The company name is the registrant's own input — escaped, or a registration could
      // put arbitrary markup in a mail sent from our domain.
      this.email
        .sendMail(
          reg.emailCompany,
          'Your Aajiveka Employer Account is Approved',
          `<p>Dear ${escapeHtml(reg.companyName)},</p>
         <p>Your employer registration has been approved. You can now log in with:</p>
         <p><strong>Username:</strong> ${escapeHtml(reg.emailCompany)}<br/>
         <strong>Temporary Password:</strong> ${tempPassword}</p>
         <p>Please change your password after your first login.</p>`,
        )
        .catch(() => {});
    }

    await this.audit.record({
      userId: adminUserId,
      action: 'admin.employer_reviewed',
      entity: 'EmployerRegistration',
      entityId: registrationId,
      detail: { decision, notes },
    });
    return { ok: true };
  }
}
