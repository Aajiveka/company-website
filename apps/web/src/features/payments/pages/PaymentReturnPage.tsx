import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button, Card, Loader } from '@/components/ui';
import { useAuth } from '@/features/auth/auth.store';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { LAST_ORDER_REF_KEY, useOrder } from '../payments.api';

const POLL_TIMEOUT_MS = 60_000;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/**
 * Landing page after the gateway redirects back. The redirect is only a hint —
 * the server-to-server webhook is what actually settles the order — so we poll
 * the order status until it resolves rather than trusting the redirect.
 */
export default function PaymentReturnPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const orderRef = useMemo(
    () => params.get('ref') ?? localStorage.getItem(LAST_ORDER_REF_KEY),
    [params],
  );
  const [timedOut, setTimedOut] = useState(false);

  const enabled = isAuthenticated && !!orderRef && !timedOut;
  const { data: order } = useOrder(orderRef, enabled);
  const status = order?.status;
  const settled = status === 'SUCCESS' || status === 'FAILED';

  // Stop polling after a while so a stuck order doesn't spin forever.
  useEffect(() => {
    if (!enabled || settled) return;
    const t = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [enabled, settled]);

  // Once the payment succeeds, drop the stashed ref and refresh the subscription.
  useEffect(() => {
    if (status === 'SUCCESS') {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.subscription });
      localStorage.removeItem(LAST_ORDER_REF_KEY);
    }
  }, [status]);

  return (
    <div className="container flex justify-center py-16">
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
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">No payment reference</h1>
          <p className="mt-2 text-sm text-gray-600">We couldn't find a payment to show. Please start again.</p>
          <Link to="/pricing" className="mt-6 inline-block">
            <Button>Back to plans</Button>
          </Link>
        </>
      );
    }

    if (!isAuthenticated) {
      return (
        <>
          <Clock className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">Log in to view your payment</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with the same account to see the status of order {orderRef}.
          </p>
          <Link to="/login" className="mt-6 inline-block">
            <Button>Log in</Button>
          </Link>
        </>
      );
    }

    if (status === 'SUCCESS') {
      return (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">Payment successful</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your {order?.plan} membership is active
            {order?.subscriptionEndsAt ? ` until ${formatDate(order.subscriptionEndsAt)}` : ''}.
          </p>
          <Link to="/candidate/subscription" className="mt-6 inline-block">
            <Button>View membership</Button>
          </Link>
        </>
      );
    }

    if (status === 'FAILED') {
      return (
        <>
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">Payment failed</h1>
          <p className="mt-2 text-sm text-gray-600">
            {order?.errorDescription || 'Your payment could not be completed.'}
          </p>
          <Link to="/pricing" className="mt-6 inline-block">
            <Button>Try again</Button>
          </Link>
        </>
      );
    }

    if (timedOut) {
      return (
        <>
          <Clock className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 font-heading text-xl font-semibold text-navy">Still processing</h1>
          <p className="mt-2 text-sm text-gray-600">
            This is taking longer than usual. Your membership will appear once the payment settles.
          </p>
          <Link to="/candidate/subscription" className="mt-6 inline-block">
            <Button variant="outline">Check membership</Button>
          </Link>
        </>
      );
    }

    return (
      <>
        <Loader />
        <h1 className="mt-4 font-heading text-xl font-semibold text-navy">Payment processing…</h1>
        <p className="mt-2 text-sm text-gray-600">Please wait while we confirm your payment.</p>
      </>
    );
  }
}
