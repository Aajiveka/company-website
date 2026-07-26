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
  /** Called when checkout is dismissed or payment fails. */
  onFailure: (error?: { code?: string; description?: string; reason?: string }) => void;
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
      onFailure({ description: 'Could not load payment gateway. Please try again.' });
      return;
    }

    if (!window.Razorpay) {
      onFailure({ description: 'Payment gateway is not available.' });
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
          onFailure({ description: 'Payment was cancelled.' });
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
    rzp.open();
  }, [orderId, amount, currency, planName, keyId, onSuccess, onFailure, prefill]);

  useEffect(() => {
    openCheckout();
  }, [openCheckout]);

  // This component renders nothing — the Razorpay modal is an overlay.
  return null;
}
