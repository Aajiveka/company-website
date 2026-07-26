import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { env } from '@/config/env';

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

/**
 * Thin wrapper around the Razorpay Orders API.
 *
 * Uses `fetch` directly against the Razorpay REST API instead of the `razorpay`
 * npm package so we don't add a runtime dependency for three HTTP calls.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  get configured(): boolean {
    return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  }

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
  }

  /**
   * POST /v1/orders — create a Razorpay order.
   *
   * Amount is in **paise** (INR smallest unit). The caller passes whole rupees;
   * this method multiplies by 100.
   */
  async createOrder(input: {
    orderRef: string;
    amountInr: number;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrderResult> {
    const amountPaise = input.amountInr * 100;

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: input.orderRef,
        notes: input.notes ?? {},
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Razorpay create-order failed: ${res.status} ${text.slice(0, 300)}`);
      throw new Error('Could not create Razorpay order');
    }

    const data = (await res.json()) as { id: string; amount: number; currency: string };
    return {
      razorpayOrderId: data.id,
      amount: data.amount,
      currency: data.currency,
    };
  }

  /**
   * Verify the payment signature returned by Razorpay Checkout.
   *
   * Razorpay signs `order_id|payment_id` with the key secret using HMAC-SHA256.
   * The checkout returns this signature; we recompute and compare.
   */
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');
    return expected === signature;
  }

  /**
   * Verify webhook signature.
   *
   * Razorpay signs the raw request body with the webhook secret using HMAC-SHA256.
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — cannot verify webhook');
      return false;
    }
    const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    return expected === signature;
  }
}
