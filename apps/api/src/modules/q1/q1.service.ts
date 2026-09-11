import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { AuditService } from '@/modules/audit/audit.service';
import {
  CHECKLIST_ITEMS,
  OFF_QUEUE_STATUSES,
  ScreeningStatus,
  checklistColumn,
  derivePriority,
  type ChecklistKey,
  type ScreeningStatusValue,
} from '@/shared/screening';
import type {
  ContactCandidateDto,
  QueueQueryDto,
  QueueTab,
  SetAllChecklistDto,
  UpdateChecklistDto,
  UpdateScreeningStatusDto,
} from './dto/q1.dto';

/** Tab -> the statuses it shows. `all` is every status. */
const TAB_STATUS: Record<QueueTab, ScreeningStatusValue[] | null> = {
  all: null,
  new: [ScreeningStatus.NEW],
  screening: [ScreeningStatus.SCREENING],
  incomplete: [ScreeningStatus.INCOMPLETE],
  'follow-up': [ScreeningStatus.FOLLOW_UP],
  'no-response': [ScreeningStatus.NO_RESPONSE],
  verified: [ScreeningStatus.VERIFIED],
  'not-interested': [ScreeningStatus.NOT_INTERESTED],
};

/**
 * The eight profile requirements the Q1 designs judge completeness on, in the order the
 * "What's missing" list prints them. The percentage is simply how many are satisfied — which
 * reproduces the Figma's own numbers: Jatinder has all eight (100%) and Anuranjan is missing
 * CV, salary, notice period and LinkedIn (4/8 = 50%).
 */
type Requirement = { key: string; label: string; ok: boolean };

export interface ScreeningProfileFacts {
  hasCv: boolean;
  expectedSalary: number | null;
  noticePeriod: number | null;
  linkedInUrl: string | null;
  dateOfBirth: Date | null;
  cityId: number | null;
  educationCount: number;
  skillCount: number;
}

export function requirementsFor(f: ScreeningProfileFacts): Requirement[] {
  return [
    { key: 'cv', label: 'Missing CV', ok: f.hasCv },
    { key: 'salary', label: 'Missing salary information', ok: f.expectedSalary != null },
    { key: 'noticePeriod', label: 'Notice period not provided', ok: f.noticePeriod != null },
    { key: 'linkedIn', label: 'LinkedIn URL missing', ok: !!f.linkedInUrl?.trim() },
    { key: 'dob', label: 'Date of birth missing', ok: f.dateOfBirth != null },
    { key: 'location', label: 'Current location missing', ok: f.cityId != null },
    { key: 'education', label: 'Education details missing', ok: f.educationCount > 0 },
    { key: 'skills', label: 'Skills not listed', ok: f.skillCount > 0 },
  ];
}

export function completenessOf(f: ScreeningProfileFacts): number {
  const reqs = requirementsFor(f);
  return Math.round((reqs.filter((r) => r.ok).length / reqs.length) * 100);
}

/** Q1's screening workspace. */
@Injectable()
export class Q1Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Facts + screening row
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The eight completeness inputs for one candidate.
   *
   * LinkedIn has no column on the candidate profile — the only LinkedInUrl in this schema is
   * on tblJobApplicationDetail, the per-application snapshot — so the newest application's
   * value is used. A candidate who has never applied therefore has no LinkedIn, which is
   * correct rather than merely convenient: there is nowhere else it could have been entered.
   */
  private async factsFor(subscriberId: number): Promise<ScreeningProfileFacts> {
    const [cv, extra, uploaded, education, application] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: { dOB: true, cityID: true, currentCityID: true, noticePeriod: true },
      }),
      this.db.subscriberProfileExtra.findUnique({
        where: { subscriberID: subscriberId },
        select: { preferredSalary: true, keySkills: true },
      }),
      this.db.subscriberCVUploaded.findUnique({ where: { subscriberID: subscriberId } }),
      this.db.subscriberEducation.count({ where: { subscriberID: subscriberId } }),
      this.db.jobApplicationDetail.findFirst({
        where: { mapping: { subscriberID: BigInt(subscriberId) } },
        orderBy: { jobSubscriberMapID: 'desc' },
        select: { linkedInUrl: true },
      }),
    ]);

    const skillCount = extra?.keySkills
      ? extra.keySkills.split(',').filter((s) => s.trim()).length
      : await this.db.subscriberTags.count({ where: { subscriberID: subscriberId } });

    return {
      hasCv: !!uploaded,
      expectedSalary: extra?.preferredSalary != null ? Number(extra.preferredSalary) : null,
      noticePeriod: cv?.noticePeriod ?? null,
      linkedInUrl: application?.linkedInUrl ?? null,
      dateOfBirth: cv?.dOB ?? null,
      cityId: cv?.currentCityID ?? cv?.cityID ?? null,
      educationCount: education,
      skillCount,
    };
  }

  /**
   * The screening row, created on first touch.
   *
   * Registrations predate this table by the entire life of the app, so a row cannot be
   * assumed to exist; every read path goes through here. A brand-new row starts at New, or
   * Incomplete when the profile already has gaps — which is what puts Anuranjan on the
   * Incomplete tab without anyone having screened him.
   */
  private async ensureRow(subscriberId: number) {
    const existing = await this.db.subscriberScreening.findUnique({
      where: { subscriberID: subscriberId },
    });
    if (existing) return existing;

    const registration = await this.db.subscriberRegistration.findUnique({
      where: { subscriberID: subscriberId },
      select: { subscriberID: true },
    });
    if (!registration) throw new NotFoundException('Candidate not found');

    const facts = await this.factsFor(subscriberId);
    const completeness = completenessOf(facts);
    const status: ScreeningStatusValue =
      completeness < 100 ? ScreeningStatus.INCOMPLETE : ScreeningStatus.NEW;

    return this.db.subscriberScreening.create({
      data: {
        subscriberID: BigInt(subscriberId),
        status,
        priority: derivePriority(completeness, status),
        // The CV checkbox is a fact, not a judgement, so it starts already reflecting reality.
        chkCvAvailable: facts.hasCv,
      },
    });
  }

  /**
   * Re-derives stored priority after anything that can move completeness or status, and
   * returns the updated row.
   *
   * Returning it matters: callers build their response DTO from this, not from the row they
   * updated a moment earlier. Reading the pre-sync row sent back the old priority, so a
   * candidate who had just been parked or verified still came back as High until the next
   * refetch — visible in the queue as a Low-status row wearing a High priority dot.
   */
  private async syncPriority(subscriberId: number, status: ScreeningStatusValue) {
    const completeness = completenessOf(await this.factsFor(subscriberId));
    return this.db.subscriberScreening.update({
      where: { subscriberID: subscriberId },
      data: { priority: derivePriority(completeness, status) },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Dashboard
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The five cards on the Q1 dashboard.
   *
   * "New Candidates" counts registrations that have never been screened, which includes every
   * candidate with no screening row at all — so the card is right from the first day, before
   * this table has a single row in it.
   */
  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalRegistrations, rows, newToday, verifiedToday, followUpsDueToday] =
      await Promise.all([
        this.db.subscriberRegistration.count(),
        this.db.subscriberScreening.groupBy({ by: ['status'], _count: { _all: true } }),
        this.db.subscriberRegistration.count({
          where: { registrationDateTime: { gte: startOfToday } },
        }),
        this.db.subscriberScreening.count({ where: { verifiedAt: { gte: startOfToday } } }),
        this.db.subscriberScreening.count({
          where: { status: ScreeningStatus.FOLLOW_UP, followUpDate: { lte: new Date() } },
        }),
      ]);

    const byStatus = new Map(rows.map((r) => [r.status, r._count._all]));
    const tracked = rows.reduce((sum, r) => sum + r._count._all, 0);
    const count = (s: ScreeningStatusValue) => byStatus.get(s) ?? 0;

    return {
      // Untracked registrations have never been screened, so they are New by definition.
      newCandidates: count(ScreeningStatus.NEW) + Math.max(0, totalRegistrations - tracked),
      newToday,
      pendingScreening: count(ScreeningStatus.SCREENING) + count(ScreeningStatus.INCOMPLETE),
      followUpsDue: count(ScreeningStatus.FOLLOW_UP),
      followUpsDueToday,
      verified: count(ScreeningStatus.VERIFIED),
      verifiedToday,
      notInterested: count(ScreeningStatus.NOT_INTERESTED),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Candidate queue
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The Candidate Queue table.
   *
   * Candidates are read from tblSubscriberRegistration rather than from the screening table,
   * so one who has never been screened still appears — with a synthesised New row — instead
   * of the queue being empty until someone seeds it.
   */
  async queue(q: QueueQueryDto) {
    const search = q.search?.trim();
    const statuses = TAB_STATUS[q.tab];

    const where = {
      ...(search
        ? {
            OR: [
              { SubscriberCVDetails: { fullName: { contains: search, mode: 'insensitive' as const } } },
              {
                SubscriberCVDetails: {
                  subFunction: { descr: { contains: search, mode: 'insensitive' as const } },
                },
              },
              {
                SubscriberEmployer: {
                  some: { employer: { contains: search, mode: 'insensitive' as const } },
                },
              },
            ],
          }
        : {}),
      ...(statuses
        ? q.tab === 'new'
          ? // "New" must also catch candidates with no screening row yet.
            { OR: [{ SubscriberScreening: { status: ScreeningStatus.NEW } }, { SubscriberScreening: null }] }
          : { SubscriberScreening: { status: { in: statuses } } }
        : {}),
      ...(q.priority !== 'all'
        ? {
            SubscriberScreening: {
              priority: q.priority.charAt(0).toUpperCase() + q.priority.slice(1),
            },
          }
        : {}),
      ...(q.experience !== 'all' ? { SubscriberCVDetails: this.expFilter(q.experience) } : {}),
      ...(q.cvOnly ? { SubscriberCVUploaded: { isNot: null } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.subscriberRegistration.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { registrationDateTime: 'desc' },
        include: {
          SubscriberCVDetails: {
            include: {
              city: { select: { descr: true } },
              currentCity: { select: { descr: true } },
              subFunction: { select: { descr: true } },
            },
          },
          SubscriberScreening: true,
          SubscriberCVUploaded: { select: { subscriberID: true } },
          SubscriberEmployer: {
            where: { flgCurrent: 1 },
            take: 1,
            select: { employer: true },
          },
        },
      }),
      this.db.subscriberRegistration.count({ where }),
    ]);

    const enriched = await Promise.all(
      rows.map(async (s) => {
        const id = Number(s.subscriberID);
        const cv = s.SubscriberCVDetails;
        const screening = s.SubscriberScreening;
        const completeness = completenessOf(await this.factsFor(id));
        const status = (screening?.status ?? ScreeningStatus.NEW) as ScreeningStatusValue;
        return {
          subscriberId: id,
          fullName: cv?.fullName?.trim() || s.registrationMobileNo,
          designation: cv?.subFunction?.descr ?? '',
          city: cv?.currentCity?.descr ?? cv?.city?.descr ?? '',
          totalExperience: cv?.totalExp ?? null,
          currentCompany: s.SubscriberEmployer[0]?.employer ?? '',
          profileCompleteness: completeness,
          cvAvailable: !!s.SubscriberCVUploaded,
          receivedAt: s.registrationDateTime?.toISOString() ?? null,
          priority: screening?.priority ?? derivePriority(completeness, status),
          status,
        };
      }),
    );

    // "sorted by priority" — High first, then newest. Done here rather than in SQL because a
    // candidate with no screening row has no stored priority to order by.
    const rank = { High: 0, Medium: 1, Low: 2 } as Record<string, number>;
    enriched.sort(
      (a, b) =>
        (rank[a.priority] ?? 1) - (rank[b.priority] ?? 1) ||
        (b.receivedAt ?? '').localeCompare(a.receivedAt ?? ''),
    );

    return { rows: enriched, total };
  }

  private expFilter(band: string) {
    switch (band) {
      case 'fresher':
        return { OR: [{ totalExp: 0 }, { totalExp: null }] };
      case '1-3':
        return { totalExp: { gte: 1, lte: 3 } };
      case '4-7':
        return { totalExp: { gte: 4, lte: 7 } };
      case '8+':
        return { totalExp: { gte: 8 } };
      default:
        return {};
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Candidate profile
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The Candidate Profile screen.
   *
   * Opening a New candidate's profile is what starts screening — the design has no explicit
   * "begin" action, and the Pending Screening card is described as "currently being reviewed".
   */
  async profile(subscriberId: number, userId?: number) {
    const base = await this.candidates.profile(subscriberId);
    let row = await this.ensureRow(subscriberId);

    // Opening a profile is the review. The status only advances out of New — an Incomplete
    // candidate stays Incomplete until their data changes — but the timestamp is stamped
    // either way, because "when did Q1 first look at this candidate" is the same question
    // regardless of what state they were in. Stamping it only for New candidates left
    // FirstReviewedAt null for every Incomplete one, which zeroed Candidates screened,
    // Avg. screening time and the funnel's Reviewed step.
    if (!row.firstReviewedAt || row.status === ScreeningStatus.NEW) {
      row = await this.db.subscriberScreening.update({
        where: { subscriberID: subscriberId },
        data: {
          ...(row.status === ScreeningStatus.NEW ? { status: ScreeningStatus.SCREENING } : {}),
          firstReviewedAt: row.firstReviewedAt ?? new Date(),
          timestampUpd: new Date(),
          loginIDUpd: userId ? BigInt(userId) : null,
        },
      });
    }

    const facts = await this.factsFor(subscriberId);
    const [cv, extra] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: { dOB: true },
      }),
      this.db.subscriberProfileExtra.findUnique({
        where: { subscriberID: subscriberId },
        select: { profileSummary: true, preferredSalary: true, resumeHeadline: true },
      }),
    ]);

    const reqs = requirementsFor(facts);
    const completeness = completenessOf(facts);
    // Previous companies are every employer that is not the current one.
    const previousCompanies = base.experience
      .filter((e) => e.to !== 'Present')
      .map((e) => e.company)
      .filter(Boolean);

    return {
      ...base,
      dateOfBirth: cv?.dOB ? cv.dOB.toISOString().slice(0, 10) : null,
      linkedInUrl: facts.linkedInUrl,
      profileSummary: extra?.profileSummary ?? '',
      professionalTitle: extra?.resumeHeadline || base.designation,
      expectedSalary: facts.expectedSalary,
      previousCompanies,
      relevantExpMonths: row.relevantExpMonths,
      profileCompleteness: completeness,
      missingItems: reqs.filter((r) => !r.ok).map((r) => r.label),
      screening: this.toScreeningDto(row),
    };
  }

  private toScreeningDto(row: {
    status: string;
    priority: string;
    relevantExpMonths: number | null;
    followUpDate: Date | null;
    followUpTime: string | null;
    contactAttempts: number;
    nextAttemptAt: Date | null;
    notInterestedReason: string | null;
    verifiedAt: Date | null;
  } & Record<string, unknown>) {
    const checklist = Object.fromEntries(
      CHECKLIST_ITEMS.map((k) => [k, Boolean(row[checklistColumn(k)])]),
    ) as Record<ChecklistKey, boolean>;
    const done = Object.values(checklist).filter(Boolean).length;
    return {
      status: row.status,
      priority: row.priority,
      checklist,
      checklistDone: done,
      checklistTotal: CHECKLIST_ITEMS.length,
      checklistPercent: Math.round((done / CHECKLIST_ITEMS.length) * 100),
      followUpDate: row.followUpDate ? row.followUpDate.toISOString().slice(0, 10) : null,
      followUpTime: row.followUpTime,
      contactAttempts: row.contactAttempts,
      nextAttemptAt: row.nextAttemptAt ? row.nextAttemptAt.toISOString().slice(0, 10) : null,
      notInterestedReason: row.notInterestedReason,
      verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Screening actions
  // ──────────────────────────────────────────────────────────────────────────

  async setChecklistItem(subscriberId: number, dto: UpdateChecklistDto, userId?: number) {
    await this.ensureRow(subscriberId);
    const row = await this.db.subscriberScreening.update({
      where: { subscriberID: subscriberId },
      data: {
        [checklistColumn(dto.item)]: dto.checked,
        timestampUpd: new Date(),
        loginIDUpd: userId ? BigInt(userId) : null,
      },
    });
    return this.toScreeningDto(row);
  }

  async setAllChecklist(subscriberId: number, dto: SetAllChecklistDto, userId?: number) {
    await this.ensureRow(subscriberId);
    const row = await this.db.subscriberScreening.update({
      where: { subscriberID: subscriberId },
      data: {
        ...Object.fromEntries(CHECKLIST_ITEMS.map((k) => [checklistColumn(k), dto.checked])),
        timestampUpd: new Date(),
        loginIDUpd: userId ? BigInt(userId) : null,
      },
    });
    return this.toScreeningDto(row);
  }

  /** "Mark as Verified" — the green CTA on a complete profile. */
  async verify(subscriberId: number, userId?: number) {
    await this.ensureRow(subscriberId);
    await this.db.subscriberScreening.update({
      where: { subscriberID: subscriberId },
      data: {
        status: ScreeningStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedBy: userId ? BigInt(userId) : null,
        // Verification ends any parked state.
        followUpDate: null,
        followUpTime: null,
        nextAttemptAt: null,
        notInterestedReason: null,
        timestampUpd: new Date(),
        loginIDUpd: userId ? BigInt(userId) : null,
      },
    });
    const synced = await this.syncPriority(subscriberId, ScreeningStatus.VERIFIED);
    await this.audit.record({
      userId,
      action: 'q1.candidate_verified',
      entity: 'SubscriberScreening',
      entityId: subscriberId,
    });
    return this.toScreeningDto(synced);
  }

  /**
   * Contact Candidate, Request Profile Update and Request CV all land here: the same log row
   * with a different `kind`. None of them changes the screening status — in the designs the
   * status change is a separate, explicit step ("Update Status →" opens its own modal).
   */
  async contact(
    subscriberId: number,
    dto: ContactCandidateDto,
    kind: 'Contact' | 'ProfileUpdateRequest' | 'CvRequest',
    userId?: number,
  ) {
    await this.ensureRow(subscriberId);
    const facts = await this.factsFor(subscriberId);
    const missing = requirementsFor(facts)
      .filter((r) => !r.ok)
      .map((r) => r.label);

    await this.db.screeningContactLog.create({
      data: {
        subscriberID: BigInt(subscriberId),
        kind,
        channel: dto.channel,
        reason: dto.reason?.slice(0, 500) ?? null,
        missingItems: missing.join(', ').slice(0, 1000) || null,
        internalNote: dto.internalNote?.slice(0, 2000) ?? null,
        contactedBy: userId ? BigInt(userId) : null,
      },
    });

    await this.audit.record({
      userId,
      action: 'q1.candidate_contacted',
      entity: 'ScreeningContactLog',
      entityId: subscriberId,
      detail: { kind, channel: dto.channel },
    });

    return { contacted: true, missingItems: missing };
  }

  /** The contact history shown under the profile. */
  async contactLog(subscriberId: number) {
    const rows = await this.db.screeningContactLog.findMany({
      where: { subscriberID: BigInt(subscriberId) },
      orderBy: { contactedAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: Number(r.id),
      kind: r.kind,
      channel: r.channel,
      reason: r.reason,
      missingItems: r.missingItems ? r.missingItems.split(', ').filter(Boolean) : [],
      internalNote: r.internalNote,
      contactedAt: r.contactedAt.toISOString(),
    }));
  }

  /**
   * Save & Update Status. Each branch clears the other two branches' fields, so a candidate
   * who moves from Follow-up to Not Interested does not keep a stale follow-up date that
   * would put them back on the Follow-ups screen.
   */
  async updateStatus(subscriberId: number, dto: UpdateScreeningStatusDto, userId?: number) {
    await this.ensureRow(subscriberId);

    const cleared = {
      followUpDate: null as Date | null,
      followUpTime: null as string | null,
      nextAttemptAt: null as Date | null,
      notInterestedReason: null as string | null,
    };

    const branch =
      dto.status === 'FollowUp'
        ? {
            ...cleared,
            followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
            followUpTime: dto.followUpTime ?? null,
          }
        : dto.status === 'NoResponse'
          ? {
              ...cleared,
              contactAttempts: dto.contactAttempts ?? 0,
              nextAttemptAt: dto.nextAttemptAt ? new Date(dto.nextAttemptAt) : null,
            }
          : { ...cleared, notInterestedReason: dto.notInterestedReason ?? null };

    await this.db.subscriberScreening.update({
      where: { subscriberID: subscriberId },
      data: {
        status: dto.status,
        ...branch,
        timestampUpd: new Date(),
        loginIDUpd: userId ? BigInt(userId) : null,
      },
    });
    const synced = await this.syncPriority(subscriberId, dto.status as ScreeningStatusValue);

    await this.audit.record({
      userId,
      action: 'q1.status_updated',
      entity: 'SubscriberScreening',
      entityId: subscriberId,
      detail: { status: dto.status },
    });

    return this.toScreeningDto(synced);
  }

  /** Sidebar counts: Candidates (the live queue) and Follow-ups. */
  async navCounts() {
    const [tracked, total, followUps] = await Promise.all([
      this.db.subscriberScreening.count({ where: { status: { in: OFF_QUEUE_STATUSES } } }),
      this.db.subscriberRegistration.count(),
      this.db.subscriberScreening.count({ where: { status: ScreeningStatus.FOLLOW_UP } }),
    ]);
    return { candidates: Math.max(0, total - tracked), followUps };
  }
}
