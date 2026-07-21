import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { env } from '@/config/env';
import { BillDeskService, type TransactionResponse } from './billdesk.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billdesk: BillDeskService,
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

  /**
   * Starts a payment.
   *
   * The amount is read from the plan and copied onto the order — it is NEVER taken from the
   * client. A request body that says "amount: 1" must not buy a ₹1499 plan.
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
