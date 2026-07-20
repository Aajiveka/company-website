import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { queryKeys } from '@/lib/queryClient';
import type { CreateOrderResponse, OrderStatus, Plan, SubscriptionStatus } from './payments.types';

/**
 * The order reference is stashed here just before we hand the browser to the
 * gateway, so the return page can recover it if the redirect back doesn't carry
 * a `?ref=` query param.
 */
export const LAST_ORDER_REF_KEY = 'aaj.lastOrderRef';

/** GET the active subscription plans (public — tblSubscriptionPlan). */
export function usePlans() {
  return useQuery({
    queryKey: queryKeys.payments.plans,
    // Plans rarely change; keep them cached for the session.
    staleTime: 5 * 60_000,
    queryFn: () => api.get<Plan[]>('/payments/plans').then((r) => r.data),
  });
}

/** Start a payment: POST /payments/orders { planId } → BillDesk redirect URL. */
export function useCreateOrder() {
  return useMutation({
    mutationFn: (planId: number) =>
      api.post<CreateOrderResponse>('/payments/orders', { planId }).then((r) => r.data),
  });
}

/**
 * Poll a single order's status on the return page. Polling stops once the
 * webhook has settled the order (SUCCESS / FAILED); until then the browser can
 * race ahead of the server-to-server callback, so we keep refetching.
 */
export function useOrder(orderRef: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.payments.order(orderRef ?? ''),
    enabled: enabled && !!orderRef,
    queryFn: () => api.get<OrderStatus>(`/payments/orders/${orderRef}`).then((r) => r.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'SUCCESS' || status === 'FAILED' ? false : 2_000;
    },
  });
}

/** GET the caller's active subscription, if any. */
export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.payments.subscription,
    queryFn: () => api.get<SubscriptionStatus>('/payments/subscription').then((r) => r.data),
  });
}
