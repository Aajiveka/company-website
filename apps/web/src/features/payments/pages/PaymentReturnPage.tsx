import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Loader } from '@/components/ui';
import { useAuth } from '@/features/auth/auth.store';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { LAST_ORDER_REF_KEY, useOrder, useVerifyPayment } from '../payments.api';

const POLL_TIMEOUT_MS = 60_000;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Landing page after payment completes. For Razorpay, the checkout modal
 * redirects here with `?ref=<orderRef>`. The page polls the order status
 * until it resolves.
 *
 * If Razorpay query params are present (`razorpay_order_id`, `razorpay_payment_id`,
 * `razorpay_signature`), we also trigger server-side verification as a fallback
 * in case the checkout handler's verify call didn't complete.
 */
export default function PaymentReturnPage() {
  const { t } = useTranslation('common');
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const orderRef = useMemo(
    () => params.get('ref') ?? localStorage.getItem(LAST_ORDER_REF_KEY),
    [params],
  );
  const [timedOut, setTimedOut] = useState(false);
  const [verifyAttempted, setVerifyAttempted] = useState(false);

  const verifyPayment = useVerifyPayment();

  // If Razorpay params are on the URL, attempt verification as a fallback.
  const razorpayOrderId = params.get('razorpay_order_id');
  const razorpayPaymentId = params.get('razorpay_payment_id');
  const razorpaySignature = params.get('razorpay_signature');

  useEffect(() => {
    if (
      isAuthenticated &&
      razorpayOrderId &&
      razorpayPaymentId &&
      razorpaySignature &&
      !verifyAttempted
    ) {
      setVerifyAttempted(true);
      verifyPayment.mutate({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });
    }
  }, [isAuthenticated, razorpayOrderId, razorpayPaymentId, razorpaySignature, verifyAttempted, verifyPayment]);

  const enabled = isAuthenticated && !!orderRef && !timedOut;
  const { data: order } = useOrder(orderRef, enabled);
  const status = order?.status;
  const settled = status === 'SUCCESS' || status === 'FAILED';

  // Stop polling after a while so a stuck order doesn't spin forever.
  useEffect(() => {
    if (!enabled || settled) return;
    const timer = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [enabled, settled]);

  // Once the payment succeeds, drop the stashed ref and refresh the subscription.
  useEffect(() => {
    if (status === 'SUCCESS') {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscription });
      localStorage.removeItem(LAST_ORDER_REF_KEY);
    }
  }, [status]);

  return (
    <div className="container flex justify-center py-10 sm:py-16">
      <Card className="w-full max-w-md text-center">{renderBody()}</Card>
    </div>
  );

  function renderBody() {
    if (authLoading) {
      return <Loader />;
    }

    if (!orderRef) {
      return (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('payments.noPaymentRef')}</h1>
          <p className="mt-2 text-sm text-gray-600">{t('payments.noPaymentRefDesc')}</p>
          <Link to="/pricing" className="mt-6 inline-block">
            <Button>{t('actions.backToPlans')}</Button>
          </Link>
        </>
      );
    }

    if (!isAuthenticated) {
      return (
        <>
          <Clock className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('payments.loginToView')}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('payments.loginToViewDesc', { orderRef })}
          </p>
          <Link to="/login" className="mt-6 inline-block">
            <Button>{t('actions.logIn')}</Button>
          </Link>
        </>
      );
    }

    if (status === 'SUCCESS') {
      return (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('payments.paymentSuccessful')}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('payments.membershipActive', { plan: order?.plan })}
            {order?.subscriptionEndsAt ? t('payments.membershipActiveUntil', { date: formatDate(order.subscriptionEndsAt) }) : ''}.
          </p>
          <Link to="/candidate/subscription" className="mt-6 inline-block">
            <Button>{t('actions.viewMembership')}</Button>
          </Link>
        </>
      );
    }

    if (status === 'FAILED') {
      return (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('payments.paymentFailed')}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {order?.errorDescription || t('payments.paymentFailedDefault')}
          </p>
          <Link to="/pricing" className="mt-6 inline-block">
            <Button>{t('actions.tryAgain')}</Button>
          </Link>
        </>
      );
    }

    if (timedOut) {
      return (
        <>
          <Clock className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('payments.stillProcessing')}</h1>
          <p className="mt-2 text-sm text-gray-600">
            {t('payments.stillProcessingDesc')}
          </p>
          <Link to="/candidate/subscription" className="mt-6 inline-block">
            <Button variant="outline">{t('actions.checkMembership')}</Button>
          </Link>
        </>
      );
    }

    return (
      <>
        <Loader />
        <h1 className="mt-4 font-heading text-xl font-semibold text-navy">{t('payments.paymentProcessing')}</h1>
        <p className="mt-2 text-sm text-gray-600">{t('payments.paymentProcessingDesc')}</p>
      </>
    );
  }
}
