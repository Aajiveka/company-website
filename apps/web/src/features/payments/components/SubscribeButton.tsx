import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/lib/axios';
import { Button, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/auth.store';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { LAST_ORDER_REF_KEY, useCreateRazorpayOrder, useVerifyPayment } from '../payments.api';
import type { RazorpayOrderResponse } from '../payments.types';
import { RazorpayCheckout } from './RazorpayCheckout';

interface SubscribeButtonProps {
  planId: number;
  highlighted?: boolean;
}


/**
 * The plan-card CTA. Starts a Razorpay payment: creates an order and opens
 * the Razorpay Checkout modal. Guests are sent to log in first (paying
 * requires a Subscriber login linked to a candidate profile).
 */
export function SubscribeButton({ planId, highlighted }: SubscribeButtonProps) {
  const { isAuthenticated } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const createOrder = useCreateRazorpayOrder();
  const verifyPayment = useVerifyPayment();
  const [orderData, setOrderData] = useState<RazorpayOrderResponse | null>(null);

  const onClick = () => {
    if (!isAuthenticated) {
      notify('Please log in to subscribe.', 'info');
      navigate('/login', { state: { from: location } });
      return;
    }
    createOrder.mutate(planId, {
      onSuccess: (data) => {
        localStorage.setItem(LAST_ORDER_REF_KEY, data.orderRef);
        setOrderData(data);
      },
      onError: (err) => notify(getErrorMessage(err, 'Could not start the payment.'), 'error'),
    });
  };

  const handleSuccess = useCallback(
    (response: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      verifyPayment.mutate(
        {
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        },
        {
          onSuccess: () => {
            localStorage.removeItem(LAST_ORDER_REF_KEY);
            queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscription });
            notify('Payment successful! Your membership is now active.', 'success');
            navigate('/payment/return?ref=' + (orderData?.orderRef ?? ''));
          },
          onError: (err) => {
            notify(getErrorMessage(err), 'error');
            setOrderData(null);
          },
        },
      );
    },
    [verifyPayment, notify, navigate, orderData?.orderRef],
  );

  const handleFailure = useCallback(
    (error?: { description?: string }) => {
      setOrderData(null);
      if (error?.description && error.description !== 'Payment was cancelled.') {
        notify(error.description, 'error');
      }
    },
    [notify],
  );

  return (
    <>
      <Button
        variant={highlighted ? 'accent' : 'primary'}
        className="mt-6 w-full"
        isLoading={createOrder.isPending || verifyPayment.isPending}
        onClick={onClick}
      >
        Subscribe Now
      </Button>
      {orderData && (
        <RazorpayCheckout
          orderId={orderData.razorpayOrderId}
          amount={orderData.amount}
          currency={orderData.currency}
          planName={orderData.planName}
          keyId={orderData.keyId}
          onSuccess={handleSuccess}
          onFailure={handleFailure}
        />
      )}
    </>
  );
}
