import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { RecruitmentService } from '@/modules/recruitment/recruitment.service';
import { ClientsService } from '@/modules/clients/clients.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, RecruitmentService, ClientsService, CandidatesService],
})
export class ExportsModule {}
