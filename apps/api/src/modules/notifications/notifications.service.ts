import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  EMAIL_JOB,
  NOTIFICATIONS_QUEUE,
  SMS_JOB,
  type EmailMessage,
  type SmsMessage,
} from './notifications.types';

/**
 * Producer. Callers enqueue and return immediately — a slow or failing SMTP/SMS provider
 * must never block a request or fail it. Retries and backoff are the queue's problem.
 */
@Injectable()
export class NotificationsService {
  constructor(@InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue) {}

  async sendEmail(message: EmailMessage) {
    await this.queue.add(EMAIL_JOB, message, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    });
  }

  async sendSms(message: SmsMessage) {
    await this.queue.add(SMS_JOB, message, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    });
  }
}
