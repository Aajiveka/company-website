import { useCallback, useEffect, useRef } from 'react';

/** Razorpay Checkout script URL. */
const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpayCheckoutProps {
  /** Razorpay order ID from the API. */
  orderId: string;
  /** Amount in paise (smallest currency unit). */
  amount: number;
  /** Currency code (e.g. "INR"). */
  currency: string;
  /** Display name for the plan being purchased. */
  planName: string;
  /** Razorpay key ID (public). */
  keyId: string;
  /** Called with razorpay_order_id, razorpay_payment_id, razorpay_signature. */
  onSuccess: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  /** Called when checkout is dismissed or payment fails. The `retry` flag indicates whether retrying is advisable. */
  onFailure: (error?: { code?: string; description?: string; reason?: string; retry?: boolean }) => void;
  /** Optional prefill data. */
  prefill?: { name?: string; email?: string; contact?: string };
}

/** Loads the Razorpay Checkout.js script once. */
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${RAZORPAY_SCRIPT_URL}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      close: () => void;
      on: (event: string, handler: (response: Record<string, unknown>) => void) => void;
    };
  }
}

/**
 * Razorpay Checkout component.
 *
 * Loads the Razorpay script dynamically and opens the payment modal immediately
 * when mounted. The caller should render this component only when ready to pay
 * (i.e., after `createOrder` succeeds).
 */
export function RazorpayCheckout({
  orderId,
  amount,
  currency,
  planName,
  keyId,
  onSuccess,
  onFailure,
  prefill,
}: RazorpayCheckoutProps) {
  const openedRef = useRef(false);

  const openCheckout = useCallback(async () => {
    if (openedRef.current) return;
    openedRef.current = true;

    try {
      await loadRazorpayScript();
    } catch {
      onFailure({
        code: 'SCRIPT_LOAD_ERROR',
        description: 'Could not load the payment gateway. Please check your internet connection and try again.',
        reason: 'network',
        retry: true,
      });
      return;
    }

    if (!window.Razorpay) {
      onFailure({
        code: 'GATEWAY_UNAVAILABLE',
        description: 'Payment gateway is not available. This may be due to a browser extension blocking scripts. Please disable ad-blockers and try again.',
        reason: 'blocked',
        retry: true,
      });
      return;
    }

    const options: Record<string, unknown> = {
      key: keyId,
      amount,
      currency,
      name: 'Aajiveka',
      description: planName,
      order_id: orderId,
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        onSuccess(response);
      },
      modal: {
        ondismiss: () => {
          onFailure({
            code: 'PAYMENT_CANCELLED',
            description: 'Payment was cancelled. You can try again whenever you are ready.',
            reason: 'dismissed',
            retry: true,
          });
        },
        escape: true,
        confirm_close: true,
      },
      prefill: prefill ?? {},
      theme: {
        color: '#1e3a5f',
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on('payment.failed', (resp: Record<string, unknown>) => {
      const meta = (resp.error ?? {}) as Record<string, string>;
      const code = meta.code ?? 'PAYMENT_FAILED';
      const reason = meta.reason ?? 'unknown';
      const desc = meta.description ?? 'Payment could not be completed.';

      // Provide user-friendly descriptions for common failure reasons
      let userMessage: string;
      switch (reason) {
        case 'payment_cancelled':
          userMessage = 'You cancelled the payment. You can try again whenever you are ready.';
          break;
        case 'payment_failed':
          userMessage = `Payment failed: ${desc}. Please try with a different payment method or contact your bank.`;
          break;
        default:
          userMessage = `Payment failed: ${desc}. Please try again or use a different payment method.`;
      }

      onFailure({ code, description: userMessage, reason, retry: true });
    });

    rzp.open();
  }, [orderId, amount, currency, planName, keyId, onSuccess, onFailure, prefill]);

  useEffect(() => {
    openCheckout();
  }, [openCheckout]);

  // This component renders nothing — the Razorpay modal is an overlay.
  return null;
}
