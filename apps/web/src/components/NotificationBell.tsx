import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Briefcase, MessageSquare, AlertCircle, CheckCircle, Info, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { NotificationType } from '@/features/notifications/notifications.types';

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  [NotificationType.NEW_APPLICATION]: Briefcase,
  [NotificationType.APPLICATION_STATUS]: CheckCircle,
  [NotificationType.INTERVIEW_SCHEDULED]: AlertCircle,
  [NotificationType.JOB_ALERT]: MessageSquare,
  [NotificationType.SYSTEM]: Info,
};

function getNotificationIcon(type: string) {
  const Icon = TYPE_ICONS[type] ?? Bell;
  return <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />;
}

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const { t } = useTranslation('dashboard');
  const { notifications, unreadCount, markAsRead, markAllRead, connectionStatus } =
    useRealtimeNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Bell button */}
      <Button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-transparent p-0 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label={t('notifications.title', 'Notifications')}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('notifications.title', 'Notifications')}
              </h3>
              {connectionStatus === 'connected' ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-gray-400" />
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('notifications.markAllRead', 'Mark all read')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('notifications.empty', 'No notifications')}
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/50',
                    !n.read && 'bg-blue-50/50 dark:bg-blue-900/10',
                  )}
                >
                  {getNotificationIcon(n.type)}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm text-gray-700 dark:text-gray-200',
                        !n.read && 'font-medium',
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <a
              href="/candidate/notifications"
              className="block px-4 py-2.5 text-center text-xs font-medium text-blue-600 hover:bg-gray-50 dark:text-blue-400 dark:hover:bg-gray-700/50"
            >
              {t('notifications.viewAll', 'View all notifications')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
