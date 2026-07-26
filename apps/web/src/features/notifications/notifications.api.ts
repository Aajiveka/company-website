import { useEffect } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuth } from '@/features/auth/auth.store';
import { useSSE } from '@/hooks/useSSE';
import type { InAppNotification, NotificationsPage } from './notifications.types';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: unknown) => ['notifications', 'list', params] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useNotifications(filters?: { type?: string; unread?: number }) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, string | number> = { page: pageParam };
      if (filters?.type) params.type = filters.type;
      if (filters?.unread !== undefined) params.unread = filters.unread;
      const { data } = await api.get<NotificationsPage>('/notifications', { params });
      return data;
    },
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
    initialPageParam: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

/* ------------------------------------------------------------------ */
/*  SSE stream hook                                                    */
/* ------------------------------------------------------------------ */

/**
 * Subscribes to the SSE notification stream. On every new event it
 * invalidates the notifications query cache so lists stay fresh, and
 * optionally invokes `onNotification`.
 */
export function useNotificationStream(onNotification?: (n: InAppNotification) => void) {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  const { status, lastEvent } = useSSE<InAppNotification>({
    url: '/notifications/stream',
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!lastEvent) return;
    qc.invalidateQueries({ queryKey: notificationKeys.all });
    onNotification?.(lastEvent);
  }, [lastEvent, qc, onNotification]);

  return { status, lastEvent };
}
