import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider, SmsMessage, SmsProvider } from '../notifications.types';

/**
 * The default in development: writes the message to the log instead of sending it.
 *
 * This exists because we do NOT have working email or SMS credentials. The legacy
 * Web.config carried an SMTP password and a 2Factor API key in plaintext, and those must
 * be rotated before anything is sent for real. Logging is the honest behaviour until then
 * — the alternative is an app that silently pretends to have sent a reset link.
 */
@Injectable()
export class LogNotificationProvider implements EmailProvider, SmsProvider {
  private readonly logger = new Logger('Notifications');

  async send(message: EmailMessage | SmsMessage): Promise<void> {
    const subject = 'subject' in message ? ` subject="${message.subject}"` : '';
    this.logger.warn(
      `NOT SENT (no provider configured) -> to=${message.to}${subject} body=${message.text}`,
    );
  }
}
