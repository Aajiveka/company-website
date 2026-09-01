import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { ScoringService } from './scoring.service';
import { CvReferralService } from './cv-referral.service';
import { InterviewRoundService } from './interview-round.service';
import { OfferLetterService } from './offer-letter.service';
import { CvExpiryProcessor, CV_EXPIRY_QUEUE, CV_EXPIRY_JOB } from './cv-expiry.processor';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JobsModule } from '@/modules/jobs/jobs.module';

@Module({
  imports: [
    JobsModule,
    BullModule.registerQueue({ name: CV_EXPIRY_QUEUE }),
  ],
  controllers: [RecruitmentController],
  providers: [
    RecruitmentService,
    ScoringService,
    CvReferralService,
    InterviewRoundService,
    OfferLetterService,
    CvExpiryProcessor,
    CandidatesService,
  ],
  exports: [ScoringService, CvReferralService, InterviewRoundService, OfferLetterService],
})
export class RecruitmentModule implements OnModuleInit {
  constructor(@InjectQueue(CV_EXPIRY_QUEUE) private readonly expiryQueue: Queue) {}

  async onModuleInit() {
    // Schedule the expiry check to run every hour
    await this.expiryQueue.upsertJobScheduler(
      CV_EXPIRY_JOB,
      { every: 60 * 60 * 1000 }, // 1 hour
      { name: CV_EXPIRY_JOB },
    );
  }
}
