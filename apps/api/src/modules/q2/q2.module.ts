import { Module } from '@nestjs/common';
import { Q2Controller } from './q2.controller';
import { Q2Service } from './q2.service';
import { Q2AnalyticsService } from './q2-analytics.service';
import { RecruitmentModule } from '@/modules/recruitment/recruitment.module';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { StorageModule } from '@/modules/storage/storage.module';

/**
 * RecruitmentModule is imported rather than its services re-provided: it already exports
 * ScoringService (the seven-criteria engine and its weights) and CvReferralService (the
 * Q2 → Q3 CV hand-off). Re-providing them here would give Q2 a second instance and a second
 * place for the weights to drift.
 */
@Module({
  imports: [RecruitmentModule, JobsModule, StorageModule],
  controllers: [Q2Controller],
  providers: [Q2Service, Q2AnalyticsService],
  exports: [Q2Service],
})
export class Q2Module {}
