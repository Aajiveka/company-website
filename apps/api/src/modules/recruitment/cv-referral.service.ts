import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { InterviewRoundService } from './interview-round.service';
import { JobMapStatus } from '@/shared/status';
import { MatchReviewStatus } from '@/shared/matching';
import {
  Q3ActivityKind,
  REVIEW_WINDOW_DAYS,
  ReturnReason,
  type ReturnReasonValue,
} from '@/shared/hiring';
import { staffDirectory } from './staff-directory';

/** One CV going back to Q2, with the reason the Returned to Q2 screen will print for it. */
export interface ReturnItem {
  referralId: number;
  reason: ReturnReasonValue;
}

/**
 * Q2 → Q3 → Company CV referral pipeline.
 *
 * Q2 refers approved candidates to Q3, who validates and forwards to the company — or returns
 * them to Q2. Company reviews happen on a 14-day clock (enforced by the cv-expiry processor);
 * a CV the company has not shortlisted by Day 14 goes back to Q2 automatically.
 */
@Injectable()
export class CvReferralService {
  private readonly logger = new Logger(CvReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly applications: JobApplicationsService,
    private readonly email: EmailService,
    private readonly rounds: InterviewRoundService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /**
   * Q2 refers selected candidate-job mappings to Q3.
   *
   * A mapping that is already in the pipeline is skipped. One that came back — returned by Q3
   * or expired at the company — can be referred again: "Once Q2 fixes the issue and re-refers,
   * the candidate re-enters at Referred CVs with a fresh 14-day window." The old referral is
   * kept (it is the history the Returned to Q2 screen reads) and marked re-referred.
   */
  async referToQ3(jobSubscriberMapIds: number[], userId: number) {
    const now = new Date();
    const created: number[] = [];

    for (const mapId of jobSubscriberMapIds) {
      const existing = await this.db.cvReferral.findFirst({
        where: { jobSubscriberMapID: BigInt(mapId) },
        orderBy: { referredByQ2At: 'desc' },
      });
      const cameBack = existing && (existing.status === 'Returned' || existing.status === 'Expired');
      if (existing && !cameBack) continue;

      if (existing && cameBack) {
        await this.db.cvReferral.update({
          where: { id: existing.id },
          data: { reReferredAt: now },
        });
      }

      const referral = await this.db.cvReferral.create({
        data: {
          jobSubscriberMapID: BigInt(mapId),
          referredByQ2At: now,
          referredByUserID: BigInt(userId),
          status: 'Referred',
        },
      });
      created.push(Number(referral.id));

      await this.applications.transitionStatus(
        mapId,
        JobMapStatus.REFERRED_TO_Q3,
        userId,
      );
    }

    await this.audit.record({
      userId,
      action: 'cv.referred_to_q3',
      entity: 'CvReferral',
      entityId: 0,
      detail: { jobSubscriberMapIds, createdCount: created.length },
    });

    return { referred: created.length };
  }

  /** Q3 validates and forwards CVs to the company. Sets a 14-day expiry. */
  async forwardToCompany(referralIds: number[], userId: number) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    let forwarded = 0;

    for (const referralId of referralIds) {
      const referral = await this.db.cvReferral.findUnique({
        where: { id: BigInt(referralId) },
        select: { id: true, status: true, jobSubscriberMapID: true },
      });
      if (!referral || referral.status !== 'Referred') continue;

      // Conditional on the status still being Referred, so two Q3 users forwarding the same
      // batch at once cannot both count it — or both send the CV to the company.
      const { count } = await this.db.cvReferral.updateMany({
        where: { id: BigInt(referralId), status: 'Referred' },
        data: {
          validatedByQ3At: now,
          validatedByUserID: BigInt(userId),
          sentToCompanyAt: now,
          expiresAt,
          status: 'SentToCompany',
        },
      });
      if (!count) continue;

      await this.applications.transitionStatus(
        Number(referral.jobSubscriberMapID),
        JobMapStatus.SENT_TO_COMPANY,
        userId,
      );
      forwarded++;
    }

    await this.audit.record({
      userId,
      action: 'cv.forwarded_to_company',
      entity: 'CvReferral',
      entityId: 0,
      detail: { referralIds, forwardedCount: forwarded },
    });

    return { forwarded };
  }

  /**
   * Q3 returns referred CVs to Q2 at validation (Figma "Return CVs to Q2").
   *
   * Each CV goes back with its own reason, and the application re-enters Q2's queue: its
   * match review is reset to New, which is what Q2's All Applicants list and its Forward
   * action both key on. Only CVs still awaiting validation can be returned — once forwarded,
   * the company's review window decides.
   */
  async returnToQ2(
    items: ReturnItem[],
    opts: { note?: string; emailQ2: boolean },
    userId: number,
  ) {
    if (!items.length) throw new BadRequestException('Pick at least one CV to return');
    const now = new Date();
    const returned: Array<{ referralId: number; mapId: number; referredBy: bigint | null; reason: string }> = [];

    for (const item of items) {
      const referral = await this.db.cvReferral.findUnique({
        where: { id: BigInt(item.referralId) },
        select: { id: true, status: true, jobSubscriberMapID: true, referredByUserID: true },
      });
      if (!referral || referral.status !== 'Referred') continue;

      const { count } = await this.db.cvReferral.updateMany({
        where: { id: referral.id, status: 'Referred' },
        data: {
          status: 'Returned',
          returnedAt: now,
          returnedBy: BigInt(userId),
          returnReason: item.reason,
          returnNote: opts.note?.trim() || null,
        },
      });
      if (!count) continue;

      const mapId = Number(referral.jobSubscriberMapID);
      await this.reopenForQ2(mapId, userId, `Returned by Q3: ${item.reason}`);
      returned.push({
        referralId: item.referralId,
        mapId,
        referredBy: referral.referredByUserID,
        reason: item.reason,
      });
    }

    if (opts.emailQ2 && returned.length) {
      await this.mailQ2(returned, opts.note, userId);
    }

    await this.audit.record({
      userId,
      action: 'cv.returned_to_q2',
      entity: 'CvReferral',
      entityId: 0,
      detail: { items, returnedCount: returned.length },
    });

    return { returned: returned.length };
  }

  /**
   * The cv-expiry processor's work: every forwarded CV past Day 14 that the company has not
   * shortlisted goes back to Q2 with "Auto-expired" and a status mail.
   *
   * A shortlisted CV is never expired. The designs' flow is "14-day review → not shortlisted:
   * auto-expire · shortlisted: company submits slots"; expiring on the date alone used to pull
   * candidates out from under their own interview schedule.
   */
  async expireStale(now = new Date()) {
    // A company that answered — shortlisted, hired or rejected — is not "no response". The
    // rejection path never set companyShortlistedAt, so without the review-status filter a
    // rejected (or directly hired) CV was pulled back to Q2 on day 14.
    const stale = await this.db.cvReferral.findMany({
      where: { status: 'SentToCompany', expiresAt: { lt: now }, companyShortlistedAt: null, companyReviewStatus: 'Pending' },
      select: { id: true, jobSubscriberMapID: true, referredByUserID: true },
    });
    const expired: Array<{ referralId: number; mapId: number; referredBy: bigint | null; reason: string }> = [];

    for (const ref of stale) {
      const { count } = await this.db.cvReferral.updateMany({
        where: { id: ref.id, status: 'SentToCompany', companyShortlistedAt: null, companyReviewStatus: 'Pending' },
        data: { status: 'Expired', returnedAt: now, returnReason: ReturnReason.AUTO_EXPIRED },
      });
      if (!count) continue;

      const mapId = Number(ref.jobSubscriberMapID);
      try {
        await this.applications.transitionStatus(mapId, JobMapStatus.CV_EXPIRED, 0);
        await this.reopenForQ2(mapId, 0);
      } catch (err) {
        this.logger.warn(`Could not move mapping ${mapId} back to Q2: ${(err as Error).message}`);
      }
      expired.push({ referralId: Number(ref.id), mapId, referredBy: ref.referredByUserID, reason: ReturnReason.AUTO_EXPIRED });
    }

    if (expired.length) await this.mailQ2(expired, undefined, 0);
    return { expired: expired.length };
  }

  /**
   * The company shortlisted a forwarded CV — from the employer portal, by creating its first
   * interview round, or as captured by Q3. Stops the review clock.
   */
  async markShortlisted(mapId: number, at = new Date()) {
    await this.db.cvReferral.updateMany({
      where: { jobSubscriberMapID: BigInt(mapId), status: 'SentToCompany', companyShortlistedAt: null },
      data: { companyShortlistedAt: at, companyReviewStatus: 'Selected' },
    });
  }

  /** The company turned a forwarded CV down. */
  async markCompanyRejected(mapId: number) {
    await this.db.cvReferral.updateMany({
      where: { jobSubscriberMapID: BigInt(mapId), status: 'SentToCompany' },
      data: { companyReviewStatus: 'Rejected' },
    });
  }

  /**
   * Re-send the status mail for one returned CV ("View mail" on Returned to Q2).
   * Returns false when Q2 has no address on file.
   */
  async resendQ2Mail(referralId: number, userId: number) {
    const ref = await this.db.cvReferral.findUnique({
      where: { id: BigInt(referralId) },
      select: { id: true, jobSubscriberMapID: true, referredByUserID: true, returnReason: true, returnNote: true, status: true },
    });
    if (!ref || (ref.status !== 'Returned' && ref.status !== 'Expired')) return false;
    const sent = await this.mailQ2(
      [{ referralId, mapId: Number(ref.jobSubscriberMapID), referredBy: ref.referredByUserID, reason: ref.returnReason ?? '' }],
      ref.returnNote ?? undefined,
      userId,
    );
    return sent > 0;
  }

  /** Put the application back on Q2's queue. */
  private async reopenForQ2(mapId: number, userId: number, comment?: string) {
    const now = new Date();
    await this.db.applicationMatchReview.upsert({
      where: { jobSubscriberMapID: BigInt(mapId) },
      create: { jobSubscriberMapID: BigInt(mapId), status: MatchReviewStatus.NEW },
      update: {
        status: MatchReviewStatus.NEW,
        decidedAt: null,
        decidedBy: null,
        timestampUpd: now,
        loginIDUpd: userId ? BigInt(userId) : null,
      },
    });
    if (userId) {
      await this.applications.transitionStatus(mapId, JobMapStatus.MAPPED, userId, undefined, comment);
    }
  }

  /**
   * One status mail per Q2 user, listing every CV of theirs that came back and why. Stamps
   * Q2MailSentAt on each referral it covered and logs the mail against each application.
   * Returns how many referrals a mail went out for.
   */
  private async mailQ2(
    rows: Array<{ referralId: number; mapId: number; referredBy: bigint | null; reason: string }>,
    note: string | undefined,
    userId: number,
  ) {
    const staff = await staffDirectory(this.db, rows.map((r) => r.referredBy));
    const mappings = await this.db.jobSubscriberMapping.findMany({
      where: { jobSubscriberMapID: { in: rows.map((r) => BigInt(r.mapId)) } },
      select: {
        jobSubscriberMapID: true,
        subscriber: { select: { SubscriberCVDetails: { select: { fullName: true } } } },
        job: { select: { designation: { select: { descr: true } }, client: { select: { clientName: true } } } },
      },
    });
    const labelOf = new Map(
      mappings.map((m) => [
        Number(m.jobSubscriberMapID),
        `${m.subscriber?.SubscriberCVDetails?.fullName ?? 'Candidate'} — ${m.job?.client?.clientName ?? ''} · ${m.job?.designation?.descr ?? ''}`,
      ]),
    );

    const byUser = new Map<number, typeof rows>();
    for (const r of rows) {
      const k = r.referredBy != null ? Number(r.referredBy) : -1;
      byUser.set(k, [...(byUser.get(k) ?? []), r]);
    }

    let mailed = 0;
    const now = new Date();
    for (const [uid, group] of byUser) {
      const to = staff.get(uid)?.email;
      if (!to) continue;
      const lines = group.map((r) => `${labelOf.get(r.mapId) ?? `Application ${r.mapId}`}: ${r.reason}`);
      await this.email
        .sendQ3Notice(to, `${group.length} CV${group.length === 1 ? '' : 's'} returned to Q2`, {
          previewText: `${group.length} referred CV${group.length === 1 ? '' : 's'} came back from Q3`,
          greetingName: staff.get(uid)?.name,
          paragraphs: [
            `These referrals came back from Q3. Each is back on your queue; fix what is listed and re-refer, and the candidate re-enters with a fresh ${REVIEW_WINDOW_DAYS}-day window.`,
            lines.join('\n'),
            ...(note?.trim() ? [`Note from Q3: ${note.trim()}`] : []),
          ],
        })
        .catch((err: Error) => this.logger.warn(`Q2 status mail to ${to} failed: ${err.message}`));

      await this.db.cvReferral.updateMany({
        where: { id: { in: group.map((r) => BigInt(r.referralId)) } },
        data: { q2MailSentAt: now },
      });
      await this.db.q3Activity.createMany({
        data: group.map((r) => ({
          jobSubscriberMapID: BigInt(r.mapId),
          kind: Q3ActivityKind.Q2_MAIL,
          channel: 'Mail',
          note: `Status mail to ${staff.get(uid)?.name ?? 'Q2'}: ${r.reason}`,
          createdBy: userId ? BigInt(userId) : null,
        })),
      });
      mailed += group.length;
    }
    return mailed;
  }

  /** List referrals — Q2 sees their own, Q3 sees all. */
  async listReferrals(filters?: { status?: string }) {
    const where = filters?.status ? { status: filters.status } : {};
    const rows = await this.db.cvReferral.findMany({
      where,
      orderBy: { referredByQ2At: 'desc' },
      include: {
        mapping: {
          include: {
            subscriber: { include: { SubscriberCVDetails: { select: { fullName: true } } } },
            job: {
              include: {
                designation: { select: { descr: true } },
                client: { select: { clientName: true } },
              },
            },
          },
        },
      },
    });

    return rows.map((r) => ({
      referralId: Number(r.id),
      jobSubscriberMapId: Number(r.jobSubscriberMapID),
      candidate: r.mapping?.subscriber?.SubscriberCVDetails?.fullName ?? '',
      designation: r.mapping?.job?.designation?.descr ?? '',
      company: r.mapping?.job?.client?.clientName ?? '',
      status: r.status,
      referredAt: r.referredByQ2At?.toISOString() ?? '',
      sentToCompanyAt: r.sentToCompanyAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
    }));
  }

  /**
   * Company reviews a forwarded CV within the 14-day window.
   * shortlist → create Interview R1 + slots; reject → return status to Q2.
   */
  async companyReview(
    referralId: number,
    userId: number,
    clientId: number,
    input: {
      action: 'shortlist' | 'reject';
      interviewerName?: string;
      interviewerEmail?: string;
      hrName?: string;
      hrEmail?: string;
      interviewMode?: string;
      meetingLink?: string;
      slots?: string[];
    },
  ) {
    const referral = await this.db.cvReferral.findUnique({
      where: { id: BigInt(referralId) },
      include: {
        mapping: { include: { job: { select: { clientID: true } } } },
      },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.status !== 'SentToCompany') {
      throw new BadRequestException('Referral is not awaiting company review');
    }
    if (Number(referral.mapping?.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Referral not found');
    }

    const mapId = Number(referral.jobSubscriberMapID);

    if (input.action === 'reject') {
      await this.db.cvReferral.update({
        where: { id: referral.id },
        data: {
          companyReviewStatus: 'Rejected',
          status: 'Returned',
          expiresAt: null,
        },
      });
      await this.applications.transitionStatus(mapId, JobMapStatus.REJECTED, userId);
      await this.audit.record({
        userId,
        action: 'cv.company_rejected',
        entity: 'CvReferral',
        entityId: referralId,
      });
      return { ok: true, action: 'reject' as const };
    }

    if (!input.interviewMode || !input.slots?.length) {
      throw new BadRequestException('Shortlist requires interviewMode and at least one slot');
    }
    if (input.slots.length < 3 || input.slots.length > 4) {
      throw new BadRequestException('Provide 3–4 interview slots');
    }
    if (!input.interviewerName?.trim() || !input.interviewerEmail?.trim()) {
      throw new BadRequestException('Interviewer name and email are required');
    }
    if (!input.hrName?.trim() || !input.hrEmail?.trim()) {
      throw new BadRequestException('HR name and email are required');
    }

    await this.db.cvReferral.update({
      where: { id: referral.id },
      data: {
        companyReviewStatus: 'Selected',
        status: 'SentToCompany',
        expiresAt: null,
      },
    });
    // Stamp when, too: Q3's company-review tracker reads companyShortlistedAt.
    await this.markShortlisted(mapId);

    const round = await this.rounds.createRound({
      jobSubscriberMapId: mapId,
      roundNumber: 1,
      roundName: 'Round 1',
      interviewerName: input.interviewerName,
      interviewerEmail: input.interviewerEmail,
      hrName: input.hrName,
      hrEmail: input.hrEmail,
      interviewMode: input.interviewMode,
      meetingLink: input.meetingLink,
      slots: input.slots,
      userId,
    });

    await this.audit.record({
      userId,
      action: 'cv.company_shortlisted',
      entity: 'CvReferral',
      entityId: referralId,
      detail: { interviewRoundId: round.interviewRoundId },
    });

    return { ok: true, action: 'shortlist' as const, interviewRoundId: round.interviewRoundId };
  }
}
