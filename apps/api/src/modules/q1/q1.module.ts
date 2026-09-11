import { Module } from '@nestjs/common';
import { Q1Controller } from './q1.controller';
import { Q1Service } from './q1.service';
import { Q1AnalyticsService } from './q1-analytics.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';

@Module({
  controllers: [Q1Controller],
  providers: [Q1Service, Q1AnalyticsService, CandidatesService],
  exports: [Q1Service],
})
export class Q1Module {}
