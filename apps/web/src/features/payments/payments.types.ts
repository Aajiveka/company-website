/**
 * Payment / subscription DTOs — mirror the API's payments module
 * (apps/api/src/modules/payments). Money is always whole rupees (integer).
 */

/** A row from GET /payments/plans (tblSubscriptionPlan). */
export interface Plan {
  planID: number;
  tier: string;
  tierLabel: string;
  months: number;
  priceInr: number;
  active: boolean;
}

/** Response of POST /payments/create-order — Razorpay checkout details. */
export interface RazorpayOrderResponse {
  orderRef: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planName: string;
}

/** Body for POST /payments/verify. */
export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

/** Response of POST /payments/verify. */
export interface VerifyPaymentResponse {
  orderRef: string;
  status: string;
  alreadySettled?: boolean;
}

/** Response of POST /payments/orders — where to send the browser to pay (legacy BillDesk). */
export interface CreateOrderResponse {
  orderRef: string;
  amountInr: number;
  redirectUrl: string;
}

/** The five states an order can be in (Prisma PaymentStatus enum). */
export type PaymentStatus = 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'ABORTED';

/** GET /payments/orders/:orderRef — polled by the return page. */
export interface OrderStatus {
  orderRef: string;
  status: PaymentStatus;
  amountInr: number;
  plan: string;
  transactionId: string | null;
  paymentMethod: string | null;
  errorDescription: string | null;
  subscriptionEndsAt: string | null;
}

/** GET /payments/subscription — discriminated on `active`. */
export type SubscriptionStatus =
  | { active: false }
  | { active: true; plan: string; startsAt: string; endsAt: string };

/** A single entry from GET /payments/history. */
export interface PaymentHistoryEntry {
  orderRef: string;
  status: PaymentStatus;
  amountInr: number;
  plan: string;
  transactionId: string | null;
  paymentMethod: string | null;
  createdAt: string;
  settledAt: string | null;
}
