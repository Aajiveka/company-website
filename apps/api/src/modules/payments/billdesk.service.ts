import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '@/config/env';

/**
 * BillDesk PG (ve1_2).
 *
 * The legacy integration lived only in the C# we did not recover — the DLL has
 * Payment+<CreateOrder>d__8 and PaymentResponse, but no source. So this is written against
 * BillDesk's documented ve1_2 contract, NOT ported:
 *
 *   - Requests and responses are JWS (compact JWT), HMAC-SHA256, signed with the merchant
 *     secret. Content-Type is application/jose.
 *   - The JOSE header carries `clientid`; the request carries BD-Traceid and BD-Timestamp.
 *   - auth_status "0300" means the payment succeeded. Anything else did not.
 *
 * IMPORTANT: this has NOT been exercised against BillDesk. We have no sandbox credentials,
 * and the ones in the legacy Web.config are compromised. The signing, verification, order
 * lifecycle and idempotency are proved end-to-end against a local stub that implements the
 * contract above (see tests/billdesk-stub.mjs) — which proves our side, not that BillDesk
 * agrees with our reading of its spec. A sandbox run is still required before go-live.
 */
const AUTH_STATUS_SUCCESS = '0300';

export interface CreateOrderResult {
  bdOrderId: string;
  /** Where to send the browser to pay. */
  redirectUrl: string;
}

export interface TransactionResponse {
  orderid: string;
  transactionid?: string;
  auth_status: string;
  amount?: string;
  payment_method_type?: string;
  transaction_error_desc?: string;
  [key: string]: unknown;
}

@Injectable()
export class BillDeskService {
  private readonly logger = new Logger(BillDeskService.name);

  get configured() {
    return !!(env.BILLDESK_SECRET_KEY && env.BILLDESK_CLIENT_ID && env.BILLDESK_MERCHANT_ID);
  }

  private b64url(input: Buffer | string) {
    return Buffer.from(input)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private fromB64url(input: string) {
    return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  }

  /** Compact JWS: base64url(header).base64url(payload).base64url(HMAC-SHA256). */
  sign(payload: object): string {
    const header = this.b64url(
      JSON.stringify({ alg: 'HS256', clientid: env.BILLDESK_CLIENT_ID }),
    );
    const body = this.b64url(JSON.stringify(payload));
    const mac = createHmac('sha256', env.BILLDESK_SECRET_KEY!)
      .update(`${header}.${body}`)
      .digest();
    return `${header}.${body}.${this.b64url(mac)}`;
  }

  /**
   * Verifies the signature BEFORE looking at the payload. An unverified BillDesk response is
   * just a string from the internet — acting on it would let anyone mark any order paid.
   */
  verify<T>(jws: string): T {
    const parts = jws.trim().split('.');
    if (parts.length !== 3) throw new BadRequestException('Malformed BillDesk response');

    const [header, body, signature] = parts;
    const expected = createHmac('sha256', env.BILLDESK_SECRET_KEY!)
      .update(`${header}.${body}`)
      .digest();
    const actual = this.fromB64url(signature);

    // Constant-time: a byte-by-byte compare leaks the signature through timing.
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(new Uint8Array(actual), new Uint8Array(expected))
    ) {
      throw new BadRequestException('BillDesk signature verification failed');
    }
    return JSON.parse(this.fromB64url(body).toString('utf8')) as T;
  }

  isSuccessful(auth_status: string) {
    return auth_status === AUTH_STATUS_SUCCESS;
  }

  /** POST /payments/ve1_2/orders/create */
  async createOrder(input: {
    orderRef: string;
    amountInr: number;
    returnUrl: string;
  }): Promise<CreateOrderResult> {
    const traceId = randomUUID().replace(/-/g, '').slice(0, 32);
    // BillDesk wants local time with an offset, not a Z-suffixed UTC instant.
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 14);

    const jws = this.sign({
      mercid: env.BILLDESK_MERCHANT_ID,
      orderid: input.orderRef,
      // BillDesk expects a decimal string, and rupees are whole numbers here.
      amount: input.amountInr.toFixed(2),
      order_date: new Date().toISOString(),
      currency: '356', // ISO-4217 numeric for INR
      ru: input.returnUrl,
      itemcode: 'DIRECT',
      device: { init_channel: 'internet' },
    });

    // A refused/timed-out connection makes fetch REJECT (TypeError: fetch failed) before any
    // status exists — the !res.ok guard below only covers responses. Without this catch that
    // rejection becomes a raw 500; translate it into a clean 503 the caller can show.
    let res: Response;
    try {
      res = await fetch(`${env.BILLDESK_BASE_URL}/payments/ve1_2/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/jose',
          Accept: 'application/jose',
          'BD-Traceid': traceId,
          'BD-Timestamp': timestamp,
        },
        body: jws,
      });
    } catch (err) {
      this.logger.error(`BillDesk create-order unreachable at ${env.BILLDESK_BASE_URL}: ${String(err)}`);
      throw new ServiceUnavailableException(
        'The payment gateway is not responding. Please try again shortly.',
      );
    }

    const text = await res.text();
    if (!res.ok) {
      this.logger.error(`BillDesk create-order failed: ${res.status} ${text.slice(0, 200)}`);
      throw new BadRequestException('Could not start the payment. Please try again.');
    }

    const payload = this.verify<{
      bdorderid?: string;
      links?: { rel?: string; href?: string; parameters?: { bdOrderID?: string } }[];
    }>(text);

    const redirect = payload.links?.find((l) => l.rel === 'redirect');
    const bdOrderId = payload.bdorderid ?? redirect?.parameters?.bdOrderID;
    if (!bdOrderId || !redirect?.href) {
      throw new BadRequestException('BillDesk did not return a payment link');
    }
    return { bdOrderId, redirectUrl: redirect.href };
  }
}
