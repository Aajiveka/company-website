import { useMemo, useState } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';

type Category = 'All' | 'Applicants' | 'Jobs' | 'Billing' | 'System';

type Notification = {
  id: number;
  title: string;
  body: string;
  time: string;
  category: Exclude<Category, 'All'>;
  read: boolean;
};

const initial: Notification[] = [
  {
    id: 1,
    title: 'New applicant',
    body: 'Rahul Sharma applied to Senior Frontend Engineer.',
    time: '12 min ago',
    category: 'Applicants',
    read: false,
  },
  {
    id: 2,
    title: 'Interview reminder',
    body: 'Ananya Mehta interview starts in 2 hours.',
    time: '1 hr ago',
    category: 'Applicants',
    read: false,
  },
  {
    id: 3,
    title: 'Job published',
    body: 'Product Designer is now live.',
    time: '3 hr ago',
    category: 'Jobs',
    read: true,
  },
  {
    id: 4,
    title: 'Invoice due',
    body: 'INV-218 is outstanding. Pay to avoid interruption.',
    time: 'Yesterday',
    category: 'Billing',
    read: false,
  },
  {
    id: 5,
    title: 'Profile verification',
    body: 'Your company documents are under review.',
    time: '2 days ago',
    category: 'System',
    read: true,
  },
];

export function NotificationsPage() {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Category>('All');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const visible = useMemo(() => {
    return items.filter((n) => {
      if (filter !== 'All' && n.category !== filter) return false;
      if (unreadOnly && n.read) return false;
      return true;
    });
  }, [items, filter, unreadOnly]);

  const markRead = (id: number) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const categories: Category[] = ['All', 'Applicants', 'Jobs', 'Billing', 'System'];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Stay on top of applicants, jobs, billing, and system alerts."
        actions={
          <>
            <SecondaryButton onClick={() => setUnreadOnly((v) => !v)}>
              <Filter className="h-4 w-4" />
              {unreadOnly ? 'Show all' : 'Unread only'}
            </SecondaryButton>
            <PrimaryButton onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </PrimaryButton>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              filter === c
                ? 'bg-[#1A56DB] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No notifications" description="You’re all caught up for this filter." />
      ) : (
        <ul className="space-y-1.5">
          {visible.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-2 rounded-xl border p-2.5 shadow-sm transition ${
                n.read
                  ? 'border-slate-200/80 bg-white'
                  : 'border-[#1A56DB]/20 bg-[#EBF2FF]/40'
              }`}
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EBF2FF] text-[#1A56DB]">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                  <EmployerBadge tone="primary">{n.category}</EmployerBadge>
                  {!n.read && <EmployerBadge tone="warning">Unread</EmployerBadge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{n.body}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{n.time}</p>
              </div>
              {!n.read && (
                <SecondaryButton className="shrink-0 !px-2 !py-1 text-xs" onClick={() => markRead(n.id)}>
                  Mark read
                </SecondaryButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
