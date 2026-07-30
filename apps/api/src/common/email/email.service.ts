import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { welcomeTemplate, type WelcomeEmailData } from './templates/welcome.template';
import { passwordResetTemplate, type PasswordResetEmailData } from './templates/password-reset.template';
import { emailOtpTemplate, type EmailOtpData } from './templates/email-otp.template';
import { jobAlertTemplate, type JobAlertEmailData } from './templates/job-alert.template';
import {
  applicationStatusTemplate,
  type ApplicationStatusEmailData,
} from './templates/application-status.template';
import {
  interviewScheduledTemplate,
  type InterviewScheduledEmailData,
} from './templates/interview-scheduled.template';
import { paymentReceiptTemplate, type PaymentReceiptEmailData } from './templates/payment-receipt.template';

/**
 * High-level email service that pairs HTML templates with the queue-based
 * NotificationsService. Each method renders a template and enqueues the
 * message — the actual sending (SMTP / SES / log) is handled by the
 * notification worker.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly notifications: NotificationsService) {}

  /**
   * Send an arbitrary email. Prefer the typed helper methods below for
   * transactional emails — this is a fallback for ad-hoc messages.
   */
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    await this.notifications.sendEmail({ to, subject, text: stripHtml(html), html });
    // Recipient only — never the subject. A one-time code reads naturally as a subject
    // ("123456 is your Aajiveka verification code"), and logging it put live OTPs in plain
    // text in the container logs, which defeats storing only their hash in Redis.
    this.logger.debug(`Queued email to ${to}`);
  }

  /** Welcome email after successful registration. */
  async sendWelcome(to: string, data: WelcomeEmailData): Promise<void> {
    await this.sendMail(to, 'Welcome to Aajiveka!', welcomeTemplate(data));
  }

  /**
   * Email-verification OTP sent during registration.
   *
   * Deliberately NOT fire-and-forget at the call site: registration cannot report success
   * unless the message is at least enqueued, otherwise the candidate is left staring at a
   * code screen for a code nobody will ever send.
   */
  async sendEmailOtp(to: string, data: EmailOtpData): Promise<void> {
    await this.sendMail(to, `${data.code} is your Aajiveka verification code`, emailOtpTemplate(data));
  }

  /** Password-reset email with a link. */
  async sendPasswordReset(to: string, data: PasswordResetEmailData): Promise<void> {
    await this.sendMail(to, 'Reset your Aajiveka password', passwordResetTemplate(data));
  }

  /** New job matching alert. */
  async sendJobAlert(to: string, data: JobAlertEmailData): Promise<void> {
    await this.sendMail(to, `New job match: ${data.jobTitle}`, jobAlertTemplate(data));
  }

  /** Application status change notification. */
  async sendApplicationStatus(to: string, data: ApplicationStatusEmailData): Promise<void> {
    const STATUS_SUBJECTS: Record<string, string> = {
      applied: 'Application Received',
      shortlisted: 'You Have Been Shortlisted!',
      selected: 'Congratulations — You Are Selected!',
      rejected: 'Application Update',
    };
    const subject = STATUS_SUBJECTS[data.status] ?? 'Application Update';
    await this.sendMail(to, subject, applicationStatusTemplate(data));
  }

  /** Interview scheduled notification. */
  async sendInterviewScheduled(to: string, data: InterviewScheduledEmailData): Promise<void> {
    await this.sendMail(
      to,
      `Interview Scheduled: ${data.jobTitle} at ${data.companyName}`,
      interviewScheduledTemplate(data),
    );
  }

  /** Payment confirmation receipt. */
  async sendPaymentReceipt(to: string, data: PaymentReceiptEmailData): Promise<void> {
    await this.sendMail(to, `Payment Receipt — ${data.planName}`, paymentReceiptTemplate(data));
  }
}

/**
 * Minimal HTML-to-plain-text conversion for the text fallback.
 * Strips tags and decodes common entities. Good enough for a fallback —
 * the HTML body is the primary content.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
