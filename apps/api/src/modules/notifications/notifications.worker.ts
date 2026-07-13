import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  EMAIL_JOB,
  EMAIL_PROVIDER,
  NOTIFICATIONS_QUEUE,
  SMS_JOB,
  SMS_PROVIDER,
  type EmailMessage,
  type EmailProvider,
  type SmsMessage,
  type SmsProvider,
} from './notifications.types';

/** Consumer. Throwing hands the job back to BullMQ, which retries with backoff. */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsWorker extends WorkerHost {
  private readonly logger = new Logger(NotificationsWorker.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly email: EmailProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {
    super();
  }

  async process(job: Job<EmailMessage | SmsMessage>): Promise<void> {
    switch (job.name) {
      case EMAIL_JOB:
        await this.email.send(job.data as EmailMessage);
        return;
      case SMS_JOB:
        await this.sms.send(job.data as SmsMessage);
        return;
      default:
        this.logger.warn(`unknown job "${job.name}"`);
    }
  }
}
