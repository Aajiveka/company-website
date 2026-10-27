import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CvReferralService } from './cv-referral.service';

export const CV_EXPIRY_QUEUE = 'cv-expiry';
export const CV_EXPIRY_JOB = 'expire-stale-cvs';

/**
 * Repeatable BullMQ worker — runs hourly and returns to Q2 any CV the company has had longer
 * than 14 days without shortlisting it (tblCvReferral.expiresAt).
 *
 * The work itself lives in CvReferralService.expireStale, next to the manual return, so an
 * expired CV and a returned one go back to Q2 the same way: reason recorded, application back
 * on Q2's queue, status mail sent.
 */
@Processor(CV_EXPIRY_QUEUE)
export class CvExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(CvExpiryProcessor.name);

  constructor(private readonly referrals: CvReferralService) {
    super();
  }

  async process(): Promise<void> {
    const { expired } = await this.referrals.expireStale();
    if (expired) this.logger.log(`Expired ${expired} CV referral(s).`);
  }
}
