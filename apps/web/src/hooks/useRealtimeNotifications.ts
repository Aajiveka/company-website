import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuth } from '@/features/auth/auth.store';

interface Notification {
  notificationId: number;
  type: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

const MAX_NOTIFICATIONS = 50;
const POLL_INTERVAL = 30_000;
const MAX_BACKOFF = 30_000;

function playNotificationSound() {
  new Audio('/sounds/notification.mp3').play().catch(() => {});
}

export function useRealtimeNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllRead: () => void;
} {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);
  const sseFailedRef = useRef(false);

  const addNotification = useCallback(
    (notification: Notification) => {
      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.notificationId !== notification.notificationId);
        return [notification, ...filtered].slice(0, MAX_NOTIFICATIONS);
      });
      playNotificationSound();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    [queryClient],
  );

  const pollNotifications = useCallback(async () => {
    try {
      const res = await api.get<Notification[]>('/api/notifications', {
        params: { unread: true },
      });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.notificationId));
        const newOnes = res.data.filter((n) => !existingIds.has(n.notificationId));
        if (newOnes.length === 0) return prev;
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        return [...newOnes, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
    } catch {
      // Polling failure is non-critical; the next interval will retry.
    }
  }, [queryClient]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current !== null) return;
    pollNotifications();
    pollTimerRef.current = setInterval(pollNotifications, POLL_INTERVAL);
  }, [pollNotifications]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const source = new EventSource('/api/notifications/stream');
    eventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as Notification;
        addNotification(notification);
      } catch {
        // Malformed event data — skip.
      }
    };

    source.onopen = () => {
      backoffRef.current = 1000;
      sseFailedRef.current = false;
      stopPolling();
    };

    source.onerror = () => {
      source.close();
      eventSourceRef.current = null;

      if (!sseFailedRef.current) {
        sseFailedRef.current = true;
        startPolling();
      }

      const delay = Math.min(backoffRef.current, MAX_BACKOFF);
      backoffRef.current = delay * 2;
      reconnectTimerRef.current = setTimeout(connectSSE, delay);
    };
  }, [addNotification, startPolling, stopPolling]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopPolling();
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setNotifications([]);
      return;
    }

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopPolling();
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isAuthenticated, connectSSE, stopPolling]);

  const markAsRead = useCallback(
    (id: number) => {
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, read: true } : n)),
      );
      api.patch(`/api/notifications/${id}/read`).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    [queryClient],
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    api.post('/api/notifications/read-all').catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllRead };
}
