import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BillDeskService } from './billdesk.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, BillDeskService, CandidatesService],
})
export class PaymentsModule {}
