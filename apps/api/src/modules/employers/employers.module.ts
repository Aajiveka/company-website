/** Employer portal Nest module. HTTP routes remain under /clients for compatibility. */
import { Module } from '@nestjs/common';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { RecruitmentModule } from '@/modules/recruitment/recruitment.module';
import { EmployersController } from './employers.controller';
import { EmployersService } from './employers.service';

@Module({
  // RecruitmentModule for CvReferralService: a shortlist from the employer portal has to stop
  // the CV's 14-day review clock, or Q3's expiry processor sends a shortlisted candidate back
  // to Q2.
  imports: [JobsModule, RecruitmentModule],
  controllers: [EmployersController],
  providers: [EmployersService],
  exports: [EmployersService],
})
export class EmployersModule {}
