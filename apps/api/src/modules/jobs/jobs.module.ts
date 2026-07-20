import { Module } from '@nestjs/common';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobApplicationsService } from './job-application.service';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobApplicationsService, CandidatesService],
  exports: [JobApplicationsService],
})
export class JobsModule {}
