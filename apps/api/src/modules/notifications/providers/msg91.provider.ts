import { Injectable, Logger } from '@nestjs/common';
import { env } from '@/config/env';
import type { SmsMessage, SmsProvider } from '../notifications.types';

/**
 * MSG91 — Indian SMS/OTP gateway. Handles TRAI DLT for you (the template is registered in the
 * MSG91 panel), so unlike raw AWS SNS there is no separate DLT wiring on our side.
 *
 * The app owns the OTP: it is generated and verified in Redis, and we pass THAT exact value as
 * the `otp` param so the SMS carries the code /verify-otp expects. We do NOT use MSG91's own OTP
 * generation/verification — that would mint a code the backend never sees. Only active when the
 * auth key and template id are set (SMS_DRIVER=msg91).
 */
@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  private readonly logger = new Logger(Msg91SmsProvider.name);

  async send(message: SmsMessage): Promise<void> {
    // MSG91 wants the country code without the leading '+'. Our callers pass a bare 10-digit
    // Indian mobile; anything already prefixed (91… / +91…) is normalised to 91XXXXXXXXXX.
    const digits = message.to.replace(/^\+/, '');
    const mobile = digits.startsWith('91') ? digits : `91${digits}`;

    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('template_id', env.MSG91_TEMPLATE_ID ?? '');
    url.searchParams.set('mobile', mobile);
    if (message.otp) url.searchParams.set('otp', message.otp);

    const res = await fetch(url, {
      method: 'POST',
      headers: { authkey: env.MSG91_AUTH_KEY ?? '', 'Content-Type': 'application/json' },
      // The DLT template's OTP variable is filled by the `otp` param above; no body vars needed.
      body: '{}',
    });

    // MSG91 reports failures — bad authkey, unapproved template, bad number — as HTTP 200 with
    // {"type":"error"}. Trusting the status code alone would log a success for a message that was
    // never sent, the same trap the SNS/2Factor providers had. The body is the only honest signal.
    const body = (await res.json().catch(() => null)) as
      | { type?: string; message?: string; request_id?: string }
      | null;
    if (!res.ok || body?.type !== 'success') {
      throw new Error(`MSG91 rejected the send: ${body?.message ?? `HTTP ${res.status}`}`);
    }

    this.logger.log(`sms accepted by MSG91 for ${mobile} (requestId=${body.request_id})`);
  }
}
