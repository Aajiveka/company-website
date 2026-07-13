import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';
import type { SmsMessage, SmsProvider } from '../notifications.types';

/** 2Factor.in — the provider the legacy app used. Only active when the API key is set. */
@Injectable()
export class TwoFactorSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwoFactorSmsProvider.name);

  async send(message: SmsMessage): Promise<void> {
    const url = `https://2factor.in/API/V1/${env.TWOFACTOR_API_KEY}/SMS/${message.to}/AUTOGEN`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`2Factor responded ${res.status}`);
    this.logger.log(`sms sent to ${message.to}`);
  }
}
