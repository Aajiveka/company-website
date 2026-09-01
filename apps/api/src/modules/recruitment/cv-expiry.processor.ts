import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { JobMapStatus } from '@/shared/status';

export const CV_EXPIRY_QUEUE = 'cv-expiry';
export const CV_EXPIRY_JOB = 'expire-stale-cvs';

/**
 * Repeatable BullMQ worker — runs hourly and expires any CVs that have been
 * with a company longer than 14 days (tblCvReferral.expiresAt).
 */
@Processor(CV_EXPIRY_QUEUE)
export class CvExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(CvExpiryProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly applications: JobApplicationsService,
  ) {
    super();
  }

  async process(): Promise<void> {
    const now = new Date();
    const expired = await this.prisma.client.cvReferral.findMany({
      where: {
        status: 'SentToCompany',
        expiresAt: { lt: now },
      },
      select: { id: true, jobSubscriberMapID: true },
    });

    if (!expired.length) return;

    this.logger.log(`Expiring ${expired.length} CV referral(s)…`);

    for (const ref of expired) {
      await this.prisma.client.cvReferral.update({
        where: { id: ref.id },
        data: { status: 'Expired' },
      });

      await this.applications.transitionStatus(
        Number(ref.jobSubscriberMapID),
        JobMapStatus.CV_EXPIRED,
        0, // system action
      ).catch((err) => {
        this.logger.warn(`Could not transition mapping ${ref.jobSubscriberMapID}: ${err.message}`);
      });
    }

    this.logger.log(`Expired ${expired.length} CV referral(s).`);
  }
}
