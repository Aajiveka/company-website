import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/config/env';
import type { EmailMessage, EmailProvider } from '../notifications.types';

/** Used only when SMTP_HOST/USER/PASSWORD are all configured. */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transport: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    this.logger.log(`email sent to ${message.to}`);
  }
}
