import { EmptyState, PageHeader } from '@/employer/components/Cards/ui';

export function NotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" subtitle="Persistent notifications are not available in this release." />
      <EmptyState
        title="No notifications yet"
        description="Hiring alerts will show here when the notification service is connected for employers."
      />
    </div>
  );
}
