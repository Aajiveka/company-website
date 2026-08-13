/** Employer portal Nest module. HTTP routes remain under /clients for compatibility. */
import { Module } from '@nestjs/common';
import { JobsModule } from '@/modules/jobs/jobs.module';
import { EmployersController } from './employers.controller';
import { EmployersService } from './employers.service';

@Module({
  imports: [JobsModule],
  controllers: [EmployersController],
  providers: [EmployersService],
  exports: [EmployersService],
})
export class EmployersModule {}
