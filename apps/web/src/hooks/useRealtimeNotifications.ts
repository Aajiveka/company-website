import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuth } from '@/features/auth/auth.store';
import { useNotificationStream, notificationKeys } from '@/features/notifications/notifications.api';
import type { InAppNotification } from '@/features/notifications/notifications.types';

const MAX_NOTIFICATIONS = 50;

function playNotificationSound() {
  new Audio('/sounds/notification.mp3').play().catch(() => {});
}

/**
 * Drop-in replacement for the old useRealtimeNotifications hook.
 * Now backed by SSE via useNotificationStream, with a local notification
 * list that updates in real time.
 */
export function useRealtimeNotifications(): {
  notifications: InAppNotification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllRead: () => void;
  connectionStatus: string;
} {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const onNotification = useCallback(
    (notification: InAppNotification) => {
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.id !== notification.id);
        return [notification, ...filtered].slice(0, MAX_NOTIFICATIONS);
      });
      playNotificationSound();
    },
    [],
  );

  const { status } = useNotificationStream(isAuthenticated ? onNotification : undefined);

  const markAsRead = useCallback(
    (id: number) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      api.patch(`/notifications/${id}/read`).catch(() => {});
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    [queryClient],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.patch('/notifications/read-all').catch(() => {});
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  }, [queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllRead, connectionStatus: status };
}
