import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
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
}
