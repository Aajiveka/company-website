import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { RecruitmentService } from '@/modules/recruitment/recruitment.service';
import { EmployersModule } from '@/modules/employers/employers.module';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';

@Module({
  // EmployersService comes from its own module, which also brings in RecruitmentModule —
  // EmployersService needs CvReferralService (a company shortlist stops the CV review clock).
  imports: [EmployersModule],
  controllers: [ExportsController],
  providers: [ExportsService, RecruitmentService, CandidatesService, JobApplicationsService],
})
export class ExportsModule {}
