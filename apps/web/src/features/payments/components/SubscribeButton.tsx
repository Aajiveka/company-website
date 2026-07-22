import { useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/lib/axios';
import { Button, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/auth.store';
import { LAST_ORDER_REF_KEY, useCreateOrder } from '../payments.api';

interface SubscribeButtonProps {
  planId: number;
  highlighted?: boolean;
}


/**
 * The plan-card CTA. Starts a real payment: creates an order and hands the
 * browser to the BillDesk hosted page. Guests are sent to log in first (paying
 * requires a Subscriber login linked to a candidate profile).
 */
export function SubscribeButton({ planId, highlighted }: SubscribeButtonProps) {
  const { isAuthenticated } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const createOrder = useCreateOrder();

  const onClick = () => {
    if (!isAuthenticated) {
      notify('Please log in to subscribe.', 'info');
      navigate('/login', { state: { from: location } });
      return;
    }
    createOrder.mutate(planId, {
      onSuccess: ({ orderRef, redirectUrl }) => {
        // Persist the ref before leaving so the return page can recover it.
        localStorage.setItem(LAST_ORDER_REF_KEY, orderRef);
        window.location.assign(redirectUrl);
      },
      onError: (err) => notify(getErrorMessage(err, 'Could not start the payment.'), 'error'),
    });
  };

  return (
    <Button
      variant={highlighted ? 'accent' : 'primary'}
      className="mt-6 w-full"
      isLoading={createOrder.isPending}
      onClick={onClick}
    >
      Subscribe Now
    </Button>
  );
}
