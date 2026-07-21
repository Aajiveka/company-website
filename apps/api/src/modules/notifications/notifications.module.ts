import { BullModule } from '@nestjs/bullmq';
import { Global, Logger, Module } from '@nestjs/common';
import { env } from '@/config/env';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';
import { LogNotificationProvider } from './providers/log.provider';
import { SesEmailProvider } from './providers/ses.provider';
import { SmtpEmailProvider } from './providers/smtp.provider';
import { SnsSmsProvider } from './providers/sns.provider';
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
    {
      provide: SMS_PROVIDER,
      useFactory: (log: LogNotificationProvider) => {
        switch (env.SMS_DRIVER) {
          case 'sns':
            logger.log('SMS driver: AWS SNS');
            return new SnsSmsProvider();
          case 'twofactor':
            logger.log('SMS driver: 2Factor.in');
            return new TwoFactorSmsProvider();
          default:
            logger.warn('SMS_DRIVER=log — SMS will be logged, not sent');
            return log;
        }
      },
      inject: [LogNotificationProvider],
    },
    {
      provide: EMAIL_PROVIDER,
      useFactory: (log: LogNotificationProvider) => {
        switch (env.EMAIL_DRIVER) {
          case 'ses':
            logger.log('Email driver: AWS SES');
            return new SesEmailProvider();
          case 'smtp':
            logger.log('Email driver: SMTP');
            return new SmtpEmailProvider();
          default:
            logger.warn('EMAIL_DRIVER=log — emails will be logged, not sent');
            return log;
        }
      },
      inject: [LogNotificationProvider],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
