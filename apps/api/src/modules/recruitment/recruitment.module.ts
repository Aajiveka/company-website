import { Module } from '@nestjs/common';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JobsModule } from '@/modules/jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [RecruitmentController],
  providers: [RecruitmentService, CandidatesService],
})
export class RecruitmentModule {}
