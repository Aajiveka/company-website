import { Module } from '@nestjs/common';
import { RecruitmentModule } from '@/modules/recruitment/recruitment.module';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { Q2Module } from '@/modules/q2/q2.module';
import { Q3Controller } from './q3.controller';
import { Q3ReadService } from './q3-read.service';
import { Q3ReferralsService } from './q3-referrals.service';
import { Q3InterviewsService } from './q3-interviews.service';
import { Q3DocumentsService } from './q3-documents.service';

/**
 * RecruitmentModule is imported rather than its services re-provided, for the same reason
 * Q2Module does: CvReferralService owns the referral lifecycle (forward, return, expire,
 * shortlist) and OfferLetterService the offer. A second instance here would be a second place
 * for those rules to drift — and the employer portal and expiry processor use the originals.
 *
 * Q2Module for its batched profile-completeness loader, so the PROFILE column on Referred CVs
 * reads the same percentage Q2 saw for the same candidate.
 */
@Module({
  imports: [RecruitmentModule, JobsModule, StorageModule, Q2Module],
  controllers: [Q3Controller],
  providers: [Q3ReadService, Q3ReferralsService, Q3InterviewsService, Q3DocumentsService],
})
export class Q3Module {}
