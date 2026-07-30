import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/config/env';
import type { EmailMessage, EmailProvider } from '../notifications.types';

/**
 * Used only when SMTP_HOST/USER/PASSWORD are all configured.
 *
 * Tuned for Google Workspace / Gmail SMTP, which is the documented setup:
 *   host smtp.gmail.com, port 587, STARTTLS, App Password as the credential.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);

  /**
   * Port 465 is implicit TLS; 587 opens in the clear and upgrades with STARTTLS.
   * `requireTLS` makes that upgrade mandatory — without it nodemailer will silently
   * fall back to sending credentials over an unencrypted connection if the server
   * fails to advertise STARTTLS.
   */
  private readonly secure = env.SMTP_SECURE ?? env.SMTP_PORT === 465;

  private readonly transport: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: this.secure,
    requireTLS: !this.secure,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    // The worker sends from a long-lived process, so reuse connections instead of paying
    // a TLS handshake per message. Gmail throttles aggressively on new connections.
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    // Never let a hung socket wedge a queue worker; BullMQ retries the job instead.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      // Gmail rewrites a From it has not authenticated, so this stays on SMTP_USER unless
      // an explicitly verified alias is configured.
      from: { name: env.SMTP_FROM_NAME, address: env.SMTP_FROM || env.SMTP_USER || '' },
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
    this.logger.log(`email sent to ${message.to}`);
  }
}
