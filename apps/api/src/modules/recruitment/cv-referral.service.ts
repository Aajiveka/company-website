import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { InterviewRoundService } from './interview-round.service';
import { JobMapStatus } from '@/shared/status';

/**
 * Q2 → Q3 → Company CV referral pipeline.
 *
 * Q2 refers approved candidates to Q3, who validates and forwards to the company.
 * Company reviews happen on a 14-day clock (enforced by the cv-expiry processor).
 */
@Injectable()
export class CvReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly applications: JobApplicationsService,
    private readonly rounds: InterviewRoundService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Q2 refers selected candidate-job mappings to Q3. */
  async referToQ3(jobSubscriberMapIds: number[], userId: number) {
    const now = new Date();
    const created: number[] = [];

    for (const mapId of jobSubscriberMapIds) {
      const existing = await this.db.cvReferral.findFirst({
        where: { jobSubscriberMapID: BigInt(mapId) },
      });
      if (existing) continue;

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
    const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    let forwarded = 0;

    for (const referralId of referralIds) {
      const referral = await this.db.cvReferral.findUnique({
        where: { id: BigInt(referralId) },
        select: { id: true, status: true, jobSubscriberMapID: true },
      });
      if (!referral || referral.status !== 'Referred') continue;

      await this.db.cvReferral.update({
        where: { id: BigInt(referralId) },
        data: {
          validatedByQ3At: now,
          validatedByUserID: BigInt(userId),
          sentToCompanyAt: now,
          expiresAt,
          status: 'SentToCompany',
        },
      });

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
