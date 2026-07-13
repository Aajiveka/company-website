import { BullModule } from '@nestjs/bullmq';
import { Global, Logger, Module } from '@nestjs/common';
import { env } from '@/config/env';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';
import { LogNotificationProvider } from './providers/log.provider';
import { SmtpEmailProvider } from './providers/smtp.provider';
import { TwoFactorSmsProvider } from './providers/twofactor.provider';
import { EMAIL_PROVIDER, NOTIFICATIONS_QUEUE, SMS_PROVIDER } from './notifications.types';

const logger = new Logger('NotificationsModule');

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [
    NotificationsService,
    NotificationsWorker,
    LogNotificationProvider,
    // Real providers are only wired up when their credentials exist. Otherwise messages
    // are logged, not silently dropped — we do not have working SMTP or 2Factor keys, and
    // the ones in the legacy Web.config must be rotated before use.
    {
      provide: EMAIL_PROVIDER,
      useFactory: (log: LogNotificationProvider) => {
        if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD) return new SmtpEmailProvider();
        logger.warn('SMTP not configured — emails will be logged, not sent');
        return log;
      },
      inject: [LogNotificationProvider],
    },
    {
      provide: SMS_PROVIDER,
      useFactory: (log: LogNotificationProvider) => {
        if (env.TWOFACTOR_API_KEY) return new TwoFactorSmsProvider();
        logger.warn('2Factor not configured — SMS will be logged, not sent');
        return log;
      },
      inject: [LogNotificationProvider],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
