import { Injectable, Logger } from '@nestjs/common';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { env } from '@/config/env';
import type { SmsMessage, SmsProvider } from '../notifications.types';

/** AWS SNS — sends transactional SMS (OTP). Uses the EC2 instance role credential chain. */
@Injectable()
export class SnsSmsProvider implements SmsProvider {
  private readonly logger = new Logger(SnsSmsProvider.name);
  private readonly client = new SNSClient({ region: env.AWS_REGION });

  async send(message: SmsMessage): Promise<void> {
    const phone = message.to.startsWith('+') ? message.to : `+91${message.to}`;

    const result = await this.client.send(
      new PublishCommand({
        Message: message.text,
        PhoneNumber: phone,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
          ...(env.SNS_SENDER_ID && {
            'AWS.SNS.SMS.SenderID': {
              DataType: 'String',
              StringValue: env.SNS_SENDER_ID,
            },
          }),
          ...(env.SNS_DLT_ENTITY_ID && {
            'AWS.MM.SMS.EntityId': {
              DataType: 'String',
              StringValue: env.SNS_DLT_ENTITY_ID,
            },
          }),
          ...(env.SNS_DLT_TEMPLATE_ID && {
            'AWS.MM.SMS.TemplateId': {
              DataType: 'String',
              StringValue: env.SNS_DLT_TEMPLATE_ID,
            },
          }),
        },
      }),
    );

    // A MessageId means SNS ACCEPTED the message — not that the handset received it. Carrier
    // rejections (SMS sandbox, missing India DLT registration) never surface here; they land in
    // the CloudWatch group sns/<region>/<account-id>/DirectPublishToPhoneNumber/Failure, and only
    // if delivery status logging is on. Logging "sent" here once hid three such failures behind a
    // success line, so this says "accepted" and records the id you need to correlate with them.
    this.logger.log(`sms accepted by SNS for ${phone} (messageId=${result.MessageId})`);
  }
}
