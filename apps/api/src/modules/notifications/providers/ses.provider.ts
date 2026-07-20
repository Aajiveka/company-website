import { Injectable, Logger } from '@nestjs/common';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { env } from '@/config/env';
import type { EmailMessage, EmailProvider } from '../notifications.types';

/** AWS SES v2 — sends transactional email. Uses the EC2 instance role credential chain. */
@Injectable()
export class SesEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SesEmailProvider.name);
  private readonly client = new SESv2Client({ region: env.AWS_REGION });

  async send(message: EmailMessage): Promise<void> {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: env.SES_FROM_EMAIL,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: message.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: message.text, Charset: 'UTF-8' } },
          },
        },
      }),
    );

    this.logger.log(`email sent to ${message.to} via SES`);
  }
}
