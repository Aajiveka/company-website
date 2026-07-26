import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { env } from '@/config/env';
import { BillDeskService, type TransactionResponse } from './billdesk.service';
import { RazorpayService } from './razorpay.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billdesk: BillDeskService,
    private readonly razorpay: RazorpayService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  plans() {
    return this.db.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: [{ tier: 'asc' }, { months: 'asc' }],
    });
  }

  // ---------------------------------------------------------------------------
  // Razorpay flow
  // ---------------------------------------------------------------------------

  /**
   * Creates a Razorpay order for the given plan.
   *
   * The amount is read from the plan and copied onto the order — it is NEVER taken from the
   * client. A request body that says "amount: 1" must not buy a 1499 plan.
   */
  async createRazorpayOrder(subscriberId: number, planId: number) {
    if (!this.razorpay.configured) {
      throw new BadRequestException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }

    const plan = await this.db.subscriptionPlan.findFirst({
      where: { planID: planId, active: true },
    });
    if (!plan) throw new NotFoundException('Unknown plan');

    const orderRef = `AAJ${Date.now().toString(36).toUpperCase()}${randomBytes(5).toString('hex').toUpperCase()}`;

    const order = await this.db.paymentOrder.create({
      data: {
        orderRef,
        subscriberID: subscriberId,
        planID: plan.planID,
        amountInr: plan.priceInr,
        status: PaymentStatus.CREATED,
      },
    });

    const { razorpayOrderId, amount, currency } = await this.razorpay.createOrder({
      orderRef,
      amountInr: plan.priceInr,
      notes: { planId: String(planId), subscriberId: String(subscriberId) },
    });

    await this.db.paymentOrder.update({
      where: { orderID: order.orderID },
      data: { bdOrderId: razorpayOrderId, status: PaymentStatus.PENDING },
    });

    await this.audit.record({
      action: 'payment.order_created',
      entity: 'PaymentOrder',
      entityId: orderRef,
      detail: { planId, amountInr: plan.priceInr, gateway: 'razorpay' },
    });

    return {
      orderRef,
      razorpayOrderId,
      amount,
      currency,
      keyId: env.RAZORPAY_KEY_ID!,
      planName: `${plan.tierLabel} — ${plan.months} month(s)`,
    };
  }

  /**
   * Verifies the Razorpay checkout signature and activates the subscription.
   *
   * The signature proves the payment was captured by Razorpay — the client sends
   * `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` from the
   * Checkout callback.
   */
  async verifyRazorpayPayment(
    subscriberId: number,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const valid = this.razorpay.verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
    if (!valid) {
      throw new BadRequestException('Payment signature verification failed');
    }

    // Find the order by the Razorpay order ID stored in bdOrderId.
    const order = await this.db.paymentOrder.findFirst({
      where: { bdOrderId: razorpayOrderId, subscriberID: subscriberId },
      include: { plan: true, subscription: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.subscription) {
      this.logger.log(`duplicate verify for ${order.orderRef}, ignoring`);
      return { orderRef: order.orderRef, status: order.status, alreadySettled: true };
    }

    await this.db.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { orderID: order.orderID },
        data: {
          status: PaymentStatus.SUCCESS,
          transactionId: razorpayPaymentId,
          authStatus: 'captured',
          rawResponse: JSON.stringify({ razorpayOrderId, razorpayPaymentId, razorpaySignature }),
          settledAt: new Date(),
        },
      });

      const current = await tx.subscription.findFirst({
        where: { subscriberID: order.subscriberID, endsAt: { gt: new Date() } },
        orderBy: { endsAt: 'desc' },
      });
      const startsAt = current?.endsAt ?? new Date();
      const endsAt = new Date(startsAt);
      endsAt.setMonth(endsAt.getMonth() + order.plan.months);

      await tx.subscription.create({
        data: {
          subscriberID: order.subscriberID,
          planID: order.planID,
          orderID: order.orderID,
          startsAt,
          endsAt,
        },
      });
    });

    await this.audit.record({
      action: 'payment.succeeded',
      entity: 'PaymentOrder',
      entityId: order.orderRef,
      detail: { razorpayPaymentId, gateway: 'razorpay' },
    });

    return { orderRef: order.orderRef, status: 'SUCCESS' };
  }

  /**
   * Handles Razorpay webhook events (server-to-server).
   *
   * `payment.captured` activates the subscription (idempotent — if the verify
   * endpoint already did it, the unique constraint on Subscription.orderID
   * prevents a duplicate).
   *
   * `payment.failed` marks the order as failed.
   */
  async handleRazorpayWebhook(body: string, signature: string) {
    const valid = this.razorpay.verifyWebhookSignature(body, signature);
    if (!valid) {
      throw new BadRequestException('Webhook signature verification failed');
    }

    const event = JSON.parse(body) as {
      event: string;
      payload: {
        payment: {
          entity: {
            id: string;
            order_id: string;
            amount: number;
            currency: string;
            status: string;
            method: string;
            error_description?: string;
          };
        };
      };
    };

    const payment = event.payload.payment.entity;
    const order = await this.db.paymentOrder.findFirst({
      where: { bdOrderId: payment.order_id },
      include: { plan: true, subscription: true },
    });

    if (!order) {
      this.logger.warn(`webhook for unknown razorpay order ${payment.order_id}`);
      return { status: 'ignored', reason: 'unknown order' };
    }

    if (event.event === 'payment.captured') {
      if (order.subscription) {
        this.logger.log(`duplicate webhook capture for ${order.orderRef}, ignoring`);
        return { orderRef: order.orderRef, status: order.status, alreadySettled: true };
      }

      const settledPaise = payment.amount;
      const expectedPaise = order.amountInr * 100;
      if (settledPaise !== expectedPaise) {
        this.logger.error(
          `AMOUNT MISMATCH on ${order.orderRef}: expected ${expectedPaise}p, settled ${settledPaise}p`,
        );
        await this.audit.record({
          action: 'payment.amount_mismatch',
          entity: 'PaymentOrder',
          entityId: order.orderRef,
          detail: { expectedPaise, settledPaise },
        });
        return { orderRef: order.orderRef, status: 'AMOUNT_MISMATCH' };
      }

      await this.db.$transaction(async (tx) => {
        await tx.paymentOrder.update({
          where: { orderID: order.orderID },
          data: {
            status: PaymentStatus.SUCCESS,
            transactionId: payment.id,
            authStatus: 'captured',
            paymentMethod: payment.method ?? null,
            rawResponse: body,
            settledAt: new Date(),
          },
        });

        const current = await tx.subscription.findFirst({
          where: { subscriberID: order.subscriberID, endsAt: { gt: new Date() } },
          orderBy: { endsAt: 'desc' },
        });
        const startsAt = current?.endsAt ?? new Date();
        const endsAt = new Date(startsAt);
        endsAt.setMonth(endsAt.getMonth() + order.plan.months);

        await tx.subscription.create({
          data: {
            subscriberID: order.subscriberID,
            planID: order.planID,
            orderID: order.orderID,
            startsAt,
            endsAt,
          },
        });
      });

      await this.audit.record({
        action: 'payment.succeeded',
        entity: 'PaymentOrder',
        entityId: order.orderRef,
        detail: { razorpayPaymentId: payment.id, gateway: 'razorpay', source: 'webhook' },
      });

      return { orderRef: order.orderRef, status: 'SUCCESS' };
    }

    if (event.event === 'payment.failed') {
      await this.db.paymentOrder.update({
        where: { orderID: order.orderID },
        data: {
          status: PaymentStatus.FAILED,
          transactionId: payment.id,
          authStatus: 'failed',
          paymentMethod: payment.method ?? null,
          errorDescription:
            payment.error_description?.trim() || 'Payment failed',
          rawResponse: body,
          settledAt: new Date(),
        },
      });

      await this.audit.record({
        action: 'payment.failed',
        entity: 'PaymentOrder',
        entityId: order.orderRef,
        detail: { razorpayPaymentId: payment.id, gateway: 'razorpay', source: 'webhook' },
      });

      return { orderRef: order.orderRef, status: 'FAILED' };
    }

    this.logger.log(`unhandled razorpay webhook event: ${event.event}`);
    return { status: 'ignored', event: event.event };
  }

  /**
   * Payment history for the given subscriber.
   */
  async paymentHistory(subscriberId: number) {
    const orders = await this.db.paymentOrder.findMany({
      where: { subscriberID: subscriberId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    return orders.map((o) => ({
      orderRef: o.orderRef,
      status: o.status,
      amountInr: o.amountInr,
      plan: `${o.plan.tierLabel} — ${o.plan.months} month(s)`,
      transactionId: o.transactionId,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      settledAt: o.settledAt,
    }));
  }

  // ---------------------------------------------------------------------------
  // BillDesk flow (legacy — kept for existing orders)
  // ---------------------------------------------------------------------------

  /**
   * Starts a payment.
   *
   * The amount is read from the plan and copied onto the order — it is NEVER taken from the
   * client. A request body that says "amount: 1" must not buy a 1499 plan.
   */
  async createOrder(subscriberId: number, planId: number) {
    if (!this.billdesk.configured) {
      throw new BadRequestException(
        'Payments are not configured. Set BILLDESK_* — see deploy/DEPLOYMENT.md.',
      );
    }

    const plan = await this.db.subscriptionPlan.findFirst({
      where: { planID: planId, active: true },
    });
    if (!plan) throw new NotFoundException('Unknown plan');

    // Unguessable: the order ref goes to BillDesk and comes back in the redirect, so a
    // sequential id would let anyone probe other people's orders.
    const orderRef = `AAJ${Date.now().toString(36).toUpperCase()}${randomBytes(5).toString('hex').toUpperCase()}`;

    const order = await this.db.paymentOrder.create({
      data: {
        orderRef,
        subscriberID: subscriberId,
        planID: plan.planID,
        amountInr: plan.priceInr,
        status: PaymentStatus.CREATED,
      },
    });

    const { bdOrderId, redirectUrl } = await this.billdesk.createOrder({
      orderRef,
      amountInr: plan.priceInr,
      returnUrl: `${env.APP_URL}/payment/return`,
    });

    await this.db.paymentOrder.update({
      where: { orderID: order.orderID },
      data: { bdOrderId, status: PaymentStatus.PENDING },
    });
    await this.audit.record({
      action: 'payment.order_created',
      entity: 'PaymentOrder',
      entityId: orderRef,
      detail: { planId, amountInr: plan.priceInr },
    });

    return { orderRef, amountInr: plan.priceInr, redirectUrl };
  }

  /**
   * Settles an order from a BillDesk transaction response.
   *
   * This is the ONLY place a subscription is activated, and it runs from the server-to-server
   * webhook. The browser redirect is treated as a UI hint and nothing more: it arrives via
   * the user's own browser, so acting on it would let anyone mark their own order paid.
   *
   * Idempotent. BillDesk can deliver the same webhook more than once, and a retry must not
   * extend a subscription twice — the unique constraint on Subscription.orderID enforces
   * that even if two deliveries race.
   */
  async settle(signedResponse: string) {
    // Verify BEFORE reading. An unverified payload is just a string from the internet.
    const txn = this.billdesk.verify<TransactionResponse>(signedResponse);

    const order = await this.db.paymentOrder.findUnique({
      where: { orderRef: txn.orderid },
      include: { plan: true, subscription: true },
    });
    if (!order) {
      this.logger.warn(`webhook for unknown order ${txn.orderid}`);
      throw new NotFoundException('Unknown order');
    }

    if (order.subscription) {
      // Already settled — replay.
      this.logger.log(`duplicate webhook for ${order.orderRef}, ignoring`);
      return { orderRef: order.orderRef, status: order.status, alreadySettled: true };
    }

    const success = this.billdesk.isSuccessful(txn.auth_status);

    // The amount BillDesk settled must match what we asked for. If it does not, this is not
    // a payment for this order — fail it rather than hand over a subscription.
    const settledPaise = Math.round(Number(txn.amount ?? 0) * 100);
    const expectedPaise = order.amountInr * 100;
    const amountMatches = settledPaise === expectedPaise;

    if (success && !amountMatches) {
      this.logger.error(
        `AMOUNT MISMATCH on ${order.orderRef}: expected ${expectedPaise}p, settled ${settledPaise}p`,
      );
      await this.audit.record({
        action: 'payment.amount_mismatch',
        entity: 'PaymentOrder',
        entityId: order.orderRef,
        detail: { expectedPaise, settledPaise },
      });
    }

    const settled = success && amountMatches;

    await this.db.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { orderID: order.orderID },
        data: {
          status: settled ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
          transactionId: txn.transactionid ?? null,
          authStatus: txn.auth_status,
          paymentMethod: txn.payment_method_type ?? null,
          // ?? would let an empty string through — BillDesk sends transaction_error_desc: ''
          // on success — and a failed order with a blank reason is useless in a dispute.
          errorDescription: settled
            ? null
            : !amountMatches
              ? `Amount mismatch: expected ${expectedPaise / 100}, settled ${settledPaise / 100}`
              : txn.transaction_error_desc?.trim() || `Payment failed (auth_status ${txn.auth_status})`,
          rawResponse: JSON.stringify(txn),
          settledAt: new Date(),
        },
      });

      if (settled) {
        // A renewal extends from the current expiry, not from today, so a user who renews
        // early does not lose the time they already paid for.
        const current = await tx.subscription.findFirst({
          where: { subscriberID: order.subscriberID, endsAt: { gt: new Date() } },
          orderBy: { endsAt: 'desc' },
        });
        const startsAt = current?.endsAt ?? new Date();
        const endsAt = new Date(startsAt);
        endsAt.setMonth(endsAt.getMonth() + order.plan.months);

        await tx.subscription.create({
          data: {
            subscriberID: order.subscriberID,
            planID: order.planID,
            orderID: order.orderID,
            startsAt,
            endsAt,
          },
        });
      }
    });

    await this.audit.record({
      action: settled ? 'payment.succeeded' : 'payment.failed',
      entity: 'PaymentOrder',
      entityId: order.orderRef,
      detail: { authStatus: txn.auth_status, transactionId: txn.transactionid },
    });

    return { orderRef: order.orderRef, status: settled ? 'SUCCESS' : 'FAILED' };
  }

  /** What the return page reads. It shows status; it never sets it. */
  async orderStatus(subscriberId: number, orderRef: string) {
    const order = await this.db.paymentOrder.findFirst({
      where: { orderRef, subscriberID: subscriberId },
      include: { plan: true, subscription: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    return {
      orderRef: order.orderRef,
      status: order.status,
      amountInr: order.amountInr,
      plan: `${order.plan.tierLabel} — ${order.plan.months} month(s)`,
      transactionId: order.transactionId,
      paymentMethod: order.paymentMethod,
      errorDescription: order.errorDescription,
      subscriptionEndsAt: order.subscription?.endsAt ?? null,
    };
  }

  /** The caller's current subscription, if any. */
  async mySubscription(subscriberId: number) {
    const sub = await this.db.subscription.findFirst({
      where: { subscriberID: subscriberId, endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
      include: { plan: true },
    });
    if (!sub) return { active: false as const };
    return {
      active: true as const,
      plan: `${sub.plan.tierLabel} — ${sub.plan.months} month(s)`,
      startsAt: sub.startsAt,
      endsAt: sub.endsAt,
    };
  }
}
