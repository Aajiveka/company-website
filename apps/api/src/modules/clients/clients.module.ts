import { Module } from '@nestjs/common';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [JobsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
