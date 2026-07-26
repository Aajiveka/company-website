import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BellOff,
  Briefcase,
  Calendar,
  CheckCheck,
  Info,
  Loader2,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { BadgeTone } from '@/components/ui/Badge';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
  useNotificationStream,
} from '@/features/notifications/notifications.api';
import { NotificationType } from '@/features/notifications/notifications.types';
import type { InAppNotification } from '@/features/notifications/notifications.types';

/* ---------- filters ---------- */
type FilterTab = 'all' | 'unread' | 'jobs' | 'interviews' | 'system';

const FILTER_TABS: FilterTab[] = ['all', 'unread', 'jobs', 'interviews', 'system'];

/* ---------- helpers ---------- */
const typeIcon = (type: string) => {
  switch (type) {
    case NotificationType.JOB_ALERT:
    case NotificationType.NEW_APPLICATION:
      return <Briefcase className="h-5 w-5 text-primary" aria-hidden />;
    case NotificationType.APPLICATION_STATUS:
      return <Bell className="h-5 w-5 text-amber-500" aria-hidden />;
    case NotificationType.INTERVIEW_SCHEDULED:
      return <Calendar className="h-5 w-5 text-purple-500" aria-hidden />;
    case NotificationType.SYSTEM:
    default:
      return <Info className="h-5 w-5 text-gray-500" aria-hidden />;
  }
};

const typeTone = (type: string): BadgeTone => {
  switch (type) {
    case NotificationType.JOB_ALERT:
    case NotificationType.NEW_APPLICATION:
      return 'blue';
    case NotificationType.APPLICATION_STATUS:
      return 'amber';
    case NotificationType.INTERVIEW_SCHEDULED:
      return 'purple';
    case NotificationType.SYSTEM:
    default:
      return 'gray';
  }
};

function filterToApiParams(tab: FilterTab): { type?: string; unread?: number } {
  switch (tab) {
    case 'unread':
      return { unread: 1 };
    case 'jobs':
      return { type: NotificationType.JOB_ALERT };
    case 'interviews':
      return { type: NotificationType.INTERVIEW_SCHEDULED };
    case 'system':
      return { type: NotificationType.SYSTEM };
    default:
      return {};
  }
}

/* ---------- notification item ---------- */
const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  formatDate,
}: {
  notification: InAppNotification;
  onMarkRead: (n: InAppNotification) => void;
  onDelete: (id: number) => void;
  formatDate: (iso: string) => string;
}) {
  const n = notification;
  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 rounded-xl p-4 shadow-card transition',
        n.read
          ? 'bg-white dark:bg-gray-800'
          : 'bg-primary/5 ring-1 ring-primary/20 dark:bg-primary/10',
      )}
    >
      <button
        onClick={() => onMarkRead(n)}
        className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
      >
        {typeIcon(n.type)}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              'text-sm font-semibold',
              n.read ? 'text-navy dark:text-white' : 'text-primary',
            )}
          >
            {n.title}
          </h3>
          <Badge tone={typeTone(n.type)}>
            {n.type.replace(/_/g, ' ').toLowerCase()}
          </Badge>
          {!n.read && (
            <span className="ml-auto h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{n.message}</p>
        <p className="mt-1.5 text-xs text-gray-400">{formatDate(n.createdAt)}</p>
      </div>
      <button
        onClick={() => onDelete(n.id)}
        className="mt-1 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"
        aria-label="Delete notification"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
});

/* ---------- component ---------- */
export default function NotificationsPage() {
  const { t } = useTranslation('dashboard');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // SSE for real-time updates
  const { status: sseStatus } = useNotificationStream();

  const filters = filterToApiParams(activeTab);
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(filters);

  const allNotifications = useMemo(
    () => data?.pages.flatMap((p) => p.rows) ?? [],
    [data],
  );

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();

  const handleMarkRead = useCallback(
    (n: InAppNotification) => {
      if (!n.read) markRead.mutate(n.id);
    },
    [markRead],
  );

  const handleDelete = useCallback(
    (id: number) => {
      deleteNotification.mutate(id);
    },
    [deleteNotification],
  );

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('notificationsPage.heading') },
        ]}
      />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold text-navy dark:text-white">
            {t('notificationsPage.heading')}
          </h1>
          {sseStatus === 'connected' ? (
            <Wifi className="h-4 w-4 text-green-500" aria-label="Live updates active" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" aria-label="Reconnecting..." />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
        >
          <CheckCheck className="mr-1.5 h-4 w-4" />
          {t('notificationsPage.markAllRead')}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition',
              activeTab === tab
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
            )}
          >
            {t(`notificationsPage.tab_${tab}`)}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl bg-white p-4 shadow-card dark:bg-gray-800">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : allNotifications.length === 0 ? (
        /* Empty state */
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-8">
            <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600" aria-hidden />
            <p className="text-navy dark:text-white">{t('notificationsPage.empty')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('notificationsPage.emptyHint')}</p>
          </div>
        </Card>
      ) : (
        /* Notifications list */
        <div className="space-y-3">
          {allNotifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              formatDate={formatDate}
            />
          ))}

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t('notificationsPage.loading')}
                  </>
                ) : (
                  t('notificationsPage.loadMore')
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
