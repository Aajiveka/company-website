import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CvReferralService } from '@/modules/recruitment/cv-referral.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { staffDirectory } from '@/modules/recruitment/staff-directory';
import { Q2Service } from '@/modules/q2/q2.service';
import { completenessOf } from '@/modules/q1/q1.service';
import { JobMapStatus } from '@/shared/status';
import {
  EXPIRING_WITHIN_DAYS,
  Q3ActivityKind,
  REVIEW_WINDOW_DAYS,
  RoundStatus,
  addDays,
  companyReviewState,
  modeId,
  q2ReturnState,
  reviewDay,
  reviewDaysLeft,
  startOfDay,
  type CompanyReviewState,
} from '@/shared/hiring';
import { Q3ReadService, candidateOf, jobOf, roundView } from './q3-read.service';
import type { CompanyReviewTab, ReturnDto, ReturnedTab, RoundSetupDto } from './dto/q3.dto';

/** The tab each Company Review state is counted under. */
const TAB_OF: Record<CompanyReviewState, Exclude<CompanyReviewTab, 'all'>> = {
  InReview: 'inReview',
  Expiring: 'expiring',
  Shortlisted: 'shortlisted',
  SlotsAwaited: 'shortlisted',
  AutoExpired: 'expired',
};

/** How far back Returned to Q2 and the Company Review "Auto-expired" tab look. */
const RETURNED_LOOKBACK_DAYS = 30;

/**
 * Q3's referral screens (Figma "Q3" 02, 03 and 07): validating what Q2 referred, tracking the
 * company's 14-day review, capturing a shortlist, and the CVs that went back to Q2.
 *
 * The referral lifecycle itself — forward, return, expire, shortlist — is CvReferralService's,
 * so that the employer portal and the expiry processor move a CV exactly the way Q3 does.
 */
@Injectable()
export class Q3ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly read: Q3ReadService,
    private readonly referrals: CvReferralService,
    private readonly applications: JobApplicationsService,
    private readonly q2: Q2Service,
    private readonly email: EmailService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 02 · Referred CVs
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * CVs awaiting validation, as batches. Q2 refers one application at a time, so a batch is
   * every pending referral for the same job — the designs' header reads "For Zentrix Labs —
   * Frontend Engineer", one company and one role per batch.
   */
  async referred() {
    const apps = await this.read.loadApps({ CvReferral: { some: { status: 'Referred' } } });
    const pending = apps.filter((a) => a.CvReferral[0]?.status === 'Referred');
    const [facts, staff] = await Promise.all([
      this.q2.factsFor(pending.map((a) => Number(a.subscriberID)).filter(Number.isFinite)),
      staffDirectory(this.db, pending.map((a) => a.CvReferral[0].referredByUserID)),
    ]);

    const byJob = new Map<number, typeof pending>();
    for (const a of pending) {
      const jobId = Number(a.job?.jobID ?? 0);
      byJob.set(jobId, [...(byJob.get(jobId) ?? []), a]);
    }

    const batches = [...byJob.entries()].map(([jobId, group]) => {
      const latest = group.reduce((x, y) =>
        y.CvReferral[0].referredByQ2At > x.CvReferral[0].referredByQ2At ? y : x,
      );
      const j = jobOf(latest);
      const referrer = latest.CvReferral[0].referredByUserID;
      return {
        batchId: `REF-Q2-${jobId}`,
        jobId,
        company: j.company,
        jobTitle: j.title,
        referredBy: referrer != null ? (staff.get(Number(referrer))?.name ?? 'Q2') : 'Q2',
        referredAt: latest.CvReferral[0].referredByQ2At.toISOString(),
        rows: group
          .map((a) => {
            const c = candidateOf(a);
            const f = facts.get(c.subscriberId);
            return {
              referralId: Number(a.CvReferral[0].id),
              mapId: Number(a.jobSubscriberMapID),
              name: c.name,
              designation: c.designation,
              totalExp: c.totalExp,
              hasCv: c.hasCv,
              contactVerified: c.contactVerified,
              profileCompleteness: f ? completenessOf(f) : 0,
            };
          })
          .sort((x, y) => Number(y.hasCv) - Number(x.hasCv) || x.name.localeCompare(y.name)),
      };
    });
    batches.sort((x, y) => y.referredAt.localeCompare(x.referredAt));
    return { batches };
  }

  /**
   * Forward to the company. A CV with no resume cannot go — the designs offer only "Return to
   * Q2" on that row — and the server enforces it rather than trusting the disabled checkbox.
   */
  async forward(referralIds: number[], userId: number) {
    const refs = await this.db.cvReferral.findMany({
      where: { id: { in: referralIds.map((id) => BigInt(id)) } },
      select: {
        id: true,
        status: true,
        mapping: { select: { subscriber: { select: { SubscriberCVUploaded: { select: { latestCVPath: true } } } } } },
      },
    });
    if (refs.length !== referralIds.length) throw new NotFoundException('Referral not found');
    const missingCv = refs.filter((r) => !r.mapping?.subscriber?.SubscriberCVUploaded?.latestCVPath);
    if (missingCv.length) {
      throw new BadRequestException('A CV is missing — return that candidate to Q2 instead of forwarding');
    }
    if (refs.every((r) => r.status !== 'Referred')) {
      throw new ConflictException('These CVs have already been forwarded or returned');
    }
    return this.referrals.forwardToCompany(referralIds, userId);
  }

  async returnToQ2(dto: ReturnDto, userId: number) {
    const result = await this.referrals.returnToQ2(dto.items, { note: dto.note, emailQ2: dto.emailQ2 }, userId);
    if (!result.returned) throw new ConflictException('These CVs have already been forwarded or returned');
    return result;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 03 · Company Review
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The review window tracker: every CV with a company now, plus the ones that auto-expired
   * in the last 30 days. A shortlisted CV stays here until its first round is confirmed, so
   * "Slots awaited" is visible.
   */
  async companyReview(tab: CompanyReviewTab, now = new Date()) {
    const since = addDays(now, -RETURNED_LOOKBACK_DAYS);
    const apps = await this.read.loadApps({
      CvReferral: {
        some: {
          OR: [{ status: 'SentToCompany' }, { status: 'Expired', returnedAt: { gte: since } }],
        },
      },
    });

    const rows = apps
      .filter((a) => {
        const ref = a.CvReferral[0];
        if (ref.status === 'Expired') return true;
        if (ref.status !== 'SentToCompany') return false;
        // Off the tracker once Round 1 is booked — from then on it lives in Interviews.
        const first = a.InterviewRound[0];
        return !first || first.status === RoundStatus.PENDING;
      })
      .map((a) => {
        const ref = a.CvReferral[0];
        const first = a.InterviewRound[0];
        const state = companyReviewState(ref, !!first?.slots.some((s) => !s.isUnavailable), now);
        const c = candidateOf(a);
        return {
          mapId: Number(a.jobSubscriberMapID),
          referralId: Number(ref.id),
          name: c.name,
          designation: c.designation,
          company: jobOf(a).company,
          forwardedAt: ref.sentToCompanyAt?.toISOString() ?? null,
          day: ref.sentToCompanyAt ? reviewDay(ref.sentToCompanyAt, now) : REVIEW_WINDOW_DAYS,
          daysLeft: ref.sentToCompanyAt ? reviewDaysLeft(ref.sentToCompanyAt, now) : 0,
          state,
        };
      });

    const counts = { all: rows.length, inReview: 0, shortlisted: 0, expiring: 0, expired: 0 };
    for (const r of rows) counts[TAB_OF[r.state]]++;
    // The tracker reads most-urgent first: shortlisted (act now), then by days left.
    const rank: Record<CompanyReviewState, number> = { Shortlisted: 0, SlotsAwaited: 1, Expiring: 2, InReview: 3, AutoExpired: 4 };
    const visible = (tab === 'all' ? rows : rows.filter((r) => TAB_OF[r.state] === tab)).sort(
      (x, y) => rank[x.state] - rank[y.state] || x.daysLeft - y.daysLeft || x.name.localeCompare(y.name),
    );
    return { counts, rows: visible };
  }

  /**
   * "Reminders sent to 3 companies · CVs expiring within 2 days" — one mail per company,
   * listing every CV of theirs that auto-returns to Q2 within two days unless shortlisted.
   * Each CV gets a Nudge on its activity log, so the reminder is on record per candidate.
   */
  async remindExpiring(userId: number, now = new Date()) {
    const apps = await this.read.loadApps({
      CvReferral: { some: { status: 'SentToCompany', companyShortlistedAt: null } },
    });
    const expiring = apps.filter((a) => {
      const ref = a.CvReferral[0];
      return (
        ref?.status === 'SentToCompany' &&
        !ref.companyShortlistedAt &&
        ref.sentToCompanyAt &&
        reviewDaysLeft(ref.sentToCompanyAt, now) <= EXPIRING_WITHIN_DAYS
      );
    });
    if (!expiring.length) throw new ConflictException('No CVs are expiring within 2 days');

    const byCompany = new Map<string, typeof expiring>();
    for (const a of expiring) {
      const key = String(a.job?.client?.clientID ?? jobOf(a).company);
      byCompany.set(key, [...(byCompany.get(key) ?? []), a]);
    }

    let companies = 0;
    const unreachable: string[] = [];
    for (const group of byCompany.values()) {
      const j = jobOf(group[0]);
      if (!j.companyEmail) {
        unreachable.push(j.company);
        continue;
      }
      const lines = group.map((a) => {
        const c = candidateOf(a);
        const ref = a.CvReferral[0];
        const left = reviewDaysLeft(ref.sentToCompanyAt!, now);
        return `• ${c.name} — ${jobOf(a).title} (${left === 0 ? 'last day' : `${left} day${left === 1 ? '' : 's'} left`})`;
      });
      this.email
        .sendQ3Notice(j.companyEmail, `Review window closing: ${group.length} CV${group.length === 1 ? '' : 's'}`, {
          previewText: `${group.length} referred CV${group.length === 1 ? '' : 's'} expire within ${EXPIRING_WITHIN_DAYS} days`,
          paragraphs: [
            `The ${REVIEW_WINDOW_DAYS}-day review window is about to close for these candidates we shared with ${j.company}:`,
            lines.join('\n'),
            'Shortlist anyone you would like to interview and reply with three or four interview slots. CVs that are not shortlisted return to our pool automatically.',
          ],
        })
        .catch(() => undefined);
      await this.db.q3Activity.createMany({
        data: group.map((a) => ({
          jobSubscriberMapID: a.jobSubscriberMapID,
          kind: Q3ActivityKind.NUDGE,
          channel: 'Mail',
          note: `Review-window reminder sent to ${j.company}`,
          createdBy: BigInt(userId),
        })),
      });
      companies++;
    }

    if (!companies) {
      throw new BadRequestException(`No email on file for ${unreachable.join(', ')}`);
    }
    await this.audit.record({
      userId,
      action: 'q3.review_window_reminders',
      entity: 'CvReferral',
      entityId: 0,
      detail: { companies, cvs: expiring.length, unreachable },
    });
    return { companies, cvs: expiring.length, unreachable };
  }

  /** The right-hand panel: what the company sent back for one CV, or that it has not yet. */
  async shortlist(mapId: number) {
    const a = await this.read.loadApp(mapId);
    if (!a) throw new NotFoundException('Application not found');
    const ref = a.CvReferral[0];
    const c = candidateOf(a);
    const round = a.InterviewRound.find((r) => r.status === RoundStatus.PENDING) ?? a.InterviewRound[0] ?? null;
    const view = round ? roundView(round) : null;
    return {
      mapId,
      referralStatus: ref.status,
      shortlistedAt: ref.companyShortlistedAt?.toISOString() ?? null,
      forwardedAt: ref.sentToCompanyAt?.toISOString() ?? null,
      day: ref.sentToCompanyAt ? reviewDay(ref.sentToCompanyAt) : null,
      company: jobOf(a).company,
      candidate: { name: c.name, designation: c.designation, totalExp: c.totalExp },
      round: view,
    };
  }

  /**
   * "Capture shortlist details from companies" — the Edit action on Company Review, and the
   * way a later round's slots are recorded once the company sends them.
   *
   * Without a `roundId` this is the shortlist itself: it marks the CV shortlisted (stopping
   * its review clock) and creates Round 1. With one, it updates that round, which must still
   * be pending — a confirmed round is rescheduled, not edited. Unselected slots are replaced;
   * a slot the candidate already picked is kept.
   */
  async setupRound(mapId: number, dto: RoundSetupDto, userId: number) {
    const a = await this.read.loadApp(mapId);
    if (!a) throw new NotFoundException('Application not found');
    const ref = a.CvReferral[0];
    if (ref.status !== 'SentToCompany') {
      throw new ConflictException('This CV is no longer with the company');
    }

    const now = new Date();
    const slots = [...new Set(dto.slots)].map((s) => new Date(s));
    if (slots.some((s) => s.getTime() < now.getTime() - 60_000)) {
      throw new BadRequestException('Interview slots must be in the future');
    }
    const interviewers = dto.interviewers.map((i) => ({
      name: i.name.trim(),
      title: i.title?.trim() || undefined,
      email: i.email?.trim() || undefined,
    }));
    const data = {
      roundName: dto.roundName?.trim() || null,
      interviewers: JSON.stringify(interviewers),
      interviewerName: interviewers[0]?.name ?? null,
      interviewerEmail: interviewers[0]?.email ?? null,
      hrName: dto.hrName?.trim() || null,
      hrTitle: dto.hrTitle?.trim() || null,
      hrEmail: dto.hrEmail?.trim() || null,
      interviewModeID: modeId(dto.mode),
      durationMins: dto.durationMins ?? 45,
      updatedAt: now,
      ...(slots.length ? { slotsSharedAt: now } : {}),
    };

    let roundId: bigint;
    if (dto.roundId) {
      const round = a.InterviewRound.find((r) => Number(r.id) === dto.roundId);
      if (!round) throw new NotFoundException('Interview round not found');
      if (
        round.status !== RoundStatus.PENDING &&
        round.status !== RoundStatus.NO_SHOW &&
        round.status !== RoundStatus.RESCHEDULE_REQUESTED
      ) {
        throw new ConflictException('This round is already confirmed — reschedule it instead');
      }
      roundId = round.id;
      await this.db.interviewRound.update({ where: { id: round.id }, data });
    } else {
      if (a.InterviewRound.length) {
        throw new ConflictException('Round 1 already exists — edit it instead');
      }
      const created = await this.db.interviewRound.create({
        data: { jobSubscriberMapID: a.jobSubscriberMapID, roundNumber: 1, status: RoundStatus.PENDING, result: 'Pending', ...data },
      });
      roundId = created.id;
      await this.referrals.markShortlisted(mapId, now);
      await this.applications.transitionStatus(mapId, JobMapStatus.SHORTLISTED, userId);
    }

    await this.db.$transaction([
      this.db.interviewSlot.deleteMany({ where: { interviewRoundID: roundId, isSelected: false } }),
      this.db.interviewSlot.createMany({
        data: slots.map((slotDateTime) => ({ interviewRoundID: roundId, slotDateTime, isSelected: false })),
      }),
    ]);

    await this.audit.record({
      userId,
      action: dto.roundId ? 'q3.round_updated' : 'q3.shortlist_captured',
      entity: 'InterviewRound',
      entityId: Number(roundId),
      detail: { slots: dto.slots.length, mode: dto.mode },
    });
    return { roundId: Number(roundId) };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 07 · Returned to Q2
  // ──────────────────────────────────────────────────────────────────────────

  async returned(tab: ReturnedTab, now = new Date()) {
    const since = addDays(startOfDay(now), -RETURNED_LOOKBACK_DAYS);
    const refs = await this.db.cvReferral.findMany({
      where: { status: { in: ['Returned', 'Expired'] }, returnedAt: { gte: since } },
      orderBy: { returnedAt: 'desc' },
      include: {
        mapping: {
          select: {
            jobSubscriberMapID: true,
            subscriber: { select: { SubscriberCVDetails: { select: { fullName: true, subFunction: { select: { descr: true } } } } } },
            job: { select: { designation: { select: { descr: true } }, client: { select: { clientName: true } } } },
          },
        },
      },
    });

    const rows = refs.map((r) => ({
      referralId: Number(r.id),
      mapId: Number(r.jobSubscriberMapID),
      name: r.mapping?.subscriber?.SubscriberCVDetails?.fullName ?? 'Candidate',
      designation: r.mapping?.subscriber?.SubscriberCVDetails?.subFunction?.descr ?? '',
      company: r.mapping?.job?.client?.clientName ?? '',
      jobTitle: r.mapping?.job?.designation?.descr ?? '',
      returnedAt: r.returnedAt!.toISOString(),
      expired: r.status === 'Expired',
      reason: r.returnReason ?? (r.status === 'Expired' ? 'Auto-expired' : ''),
      note: r.returnNote,
      mailSentAt: r.q2MailSentAt?.toISOString() ?? null,
      q2: q2ReturnState(r),
    }));

    const today = startOfDay(now);
    const awaiting = rows.filter((r) => r.q2 === 'Awaiting');
    const counts = {
      all: rows.length,
      awaiting: awaiting.length,
      expired: rows.filter((r) => r.expired).length,
      returned: rows.filter((r) => !r.expired).length,
    };
    const kpis = {
      awaiting: { value: awaiting.length, today: awaiting.filter((r) => new Date(r.returnedAt) >= today).length },
      expired: { value: counts.expired },
      returnedAtValidation: { value: counts.returned },
    };
    const visible =
      tab === 'awaiting'
        ? awaiting
        : tab === 'expired'
          ? rows.filter((r) => r.expired)
          : tab === 'returned'
            ? rows.filter((r) => !r.expired)
            : rows;
    return { kpis, counts, rows: visible };
  }

  /** "View mail" — who the status mail went to, and what it said. */
  async returnMail(referralId: number) {
    const r = await this.db.cvReferral.findUnique({
      where: { id: BigInt(referralId) },
      include: {
        mapping: {
          select: {
            subscriber: { select: { SubscriberCVDetails: { select: { fullName: true } } } },
            job: { select: { designation: { select: { descr: true } }, client: { select: { clientName: true } } } },
          },
        },
      },
    });
    if (!r || (r.status !== 'Returned' && r.status !== 'Expired')) throw new NotFoundException('Returned CV not found');
    const staff = await staffDirectory(this.db, [r.referredByUserID]);
    const to = r.referredByUserID != null ? staff.get(Number(r.referredByUserID)) : undefined;
    return {
      referralId,
      to: { name: to?.name ?? 'Q2', email: to?.email ?? null },
      sentAt: r.q2MailSentAt?.toISOString() ?? null,
      candidate: r.mapping?.subscriber?.SubscriberCVDetails?.fullName ?? 'Candidate',
      company: r.mapping?.job?.client?.clientName ?? '',
      jobTitle: r.mapping?.job?.designation?.descr ?? '',
      reason: r.returnReason ?? '',
      note: r.returnNote,
      q2: q2ReturnState(r),
    };
  }

  async resendMail(referralId: number, userId: number) {
    const sent = await this.referrals.resendQ2Mail(referralId, userId);
    if (!sent) throw new BadRequestException('Q2 has no email address on file, so the mail could not be sent');
    return { sent: true };
  }
}
