import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
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

  /**
   * Without this a delivery failure was completely silent: process() throws so BullMQ can
   * retry, and once the attempts ran out the job sat in the `failed` set with nothing in the
   * application log. A registration OTP that never arrives looked identical to one that did —
   * the only way to find out was reading Redis by hand.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<EmailMessage | SmsMessage> | undefined, err: Error) {
    const to = (job?.data as { to?: string } | undefined)?.to ?? 'unknown recipient';
    const attempts = job?.attemptsMade ?? 0;
    const max = job?.opts?.attempts ?? 0;
    const exhausted = attempts >= max;
    // Recipient and reason only — the payload carries the OTP and must never be logged.
    const message = `${job?.name ?? 'job'} to ${to} failed (attempt ${attempts}/${max}): ${err.message}`;
    if (exhausted) this.logger.error(`GIVING UP — ${message}`);
    else this.logger.warn(message);
  }
}
