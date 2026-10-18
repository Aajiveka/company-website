import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { RecruitmentService } from '@/modules/recruitment/recruitment.service';
import { EmployersModule } from '@/modules/employers/employers.module';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';

@Module({
  imports: [EmployersModule],
  controllers: [ExportsController],
  providers: [ExportsService, RecruitmentService, CandidatesService, JobApplicationsService],
})
export class ExportsModule {}
