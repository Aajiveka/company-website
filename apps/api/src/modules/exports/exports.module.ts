import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { RecruitmentService } from '@/modules/recruitment/recruitment.service';
import { EmployersService } from '@/modules/employers/employers.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, RecruitmentService, EmployersService, CandidatesService, JobApplicationsService],
})
export class ExportsModule {}
