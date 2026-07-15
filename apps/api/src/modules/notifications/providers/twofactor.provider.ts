import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';
import type { SmsMessage, SmsProvider } from '../notifications.types';

/** 2Factor.in — the provider the legacy app used. Only active when the API key is set. */
@Injectable()
export class TwoFactorSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwoFactorSmsProvider.name);

  async send(message: SmsMessage): Promise<void> {
    // The app owns the OTP (generated + verified locally), so we must send THAT exact code —
    // the `.../SMS/{phone}/{otp}/{template}` form. AUTOGEN would make 2Factor mint its own code,
    // which would never match what verify-otp checks. Fall back to AUTOGEN only for non-OTP texts.
    const otpSegment = message.otp ? `${encodeURIComponent(message.otp)}/OTP1` : 'AUTOGEN';
    const url = `https://2factor.in/API/V1/${env.TWOFACTOR_API_KEY}/SMS/${message.to}/${otpSegment}`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) throw new Error(`2Factor responded ${res.status}`);
    this.logger.log(`sms sent to ${message.to}`);
  }
}
