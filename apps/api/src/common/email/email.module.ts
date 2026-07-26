import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Provides the high-level EmailService globally. Depends on NotificationsModule
 * (which is also @Global) for queue-based delivery.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
