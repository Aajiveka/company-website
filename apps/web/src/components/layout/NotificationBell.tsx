import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  FileCheck,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';
import { useAppliedJobs } from '@/features/candidates/candidate.api';
import type { AppliedJob } from '@/features/candidates/candidate.types';

interface Notification {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  time: string;
  to: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Shortlisted: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
  Interview: <CalendarCheck className="h-4 w-4 text-purple-500" />,
  Selected: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  Rejected: <XCircle className="h-4 w-4 text-red-500" />,
  Verified: <FileCheck className="h-4 w-4 text-green-500" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Derive notifications from applied jobs status history. */
function deriveFromAppliedJobs(jobs: AppliedJob[], t: (key: string, opts?: Record<string, unknown>) => string): Notification[] {
  const notifications: Notification[] = [];
  for (const job of jobs) {
    // Add notifications for status changes beyond "Applied"
    for (const entry of job.statusHistory) {
      if (entry.status === 'Applied' || entry.status === 'Mapped') continue;
      notifications.push({
        id: `${job.jobId}-${entry.status}-${entry.timestamp}`,
        icon: ICON_MAP[entry.status] ?? <Briefcase className="h-4 w-4 text-primary" />,
        title: t(`notifications.${entry.status.toLowerCase()}`, { defaultValue: entry.status }),
        body: `${job.designation} · ${job.company}`,
        time: entry.timestamp,
        to: `/jobs/${job.jobId}`,
      });
    }
    // Interview scheduled
    if (job.interview) {
      notifications.push({
        id: `${job.jobId}-interview-${job.interview.scheduledOn}`,
        icon: <CalendarCheck className="h-4 w-4 text-purple-500" />,
        title: t('notifications.interviewScheduled'),
        body: `${job.designation} · ${job.interview.mode ?? ''}`,
        time: job.interview.scheduledOn,
        to: `/candidate/applied-jobs`,
      });
    }
  }
  // Sort newest first
  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return notifications.slice(0, 20);
}

/** Notification bell with dropdown — shows in the dashboard topbar. */
export function NotificationBell() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track which notifications the user has seen
  const [seenAt, setSeenAt] = useState<number>(() => {
    const stored = localStorage.getItem('notif_seen_at');
    return stored ? Number(stored) : 0;
  });

  const markSeen = useCallback(() => {
    const now = Date.now();
    setSeenAt(now);
    localStorage.setItem('notif_seen_at', String(now));
  }, []);

  // Only fetch applied jobs for candidates — poll every 60s for updates
  const isCandidate = user?.roleId === Role.Subscriber;
  const { data: appliedJobs } = useAppliedJobs(isCandidate);

  const notifications = useMemo(() => {
    if (!isCandidate || !appliedJobs) return [];
    return deriveFromAppliedJobs(appliedJobs, t);
  }, [appliedJobs, isCandidate, t]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => new Date(n.time).getTime() > seenAt).length,
    [notifications, seenAt],
  );

  // Click-outside and Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  // Mark seen when opening
  const toggle = () => {
    setIsOpen((o) => {
      if (!o) markSeen();
      return !o;
    });
  };

  const onClickNotification = (to: string) => {
    setIsOpen(false);
    navigate(to);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={toggle}
        className="relative rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-gray-300 dark:hover:bg-gray-700"
        aria-label={t('notifications.bell')}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-navy">{t('notifications.title')}</h3>
            {notifications.length > 0 && (
              <button
                onClick={markSeen}
                className="text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('notifications.empty')}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = new Date(n.time).getTime() > seenAt;
                return (
                  <button
                    key={n.id}
                    onClick={() => onClickNotification(n.to)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      isUnread && 'bg-primary/5 dark:bg-primary/10',
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      {n.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-sm text-navy', isUnread && 'font-semibold')}>{n.title}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">{n.body}</p>
                      <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{timeAgo(n.time)}</p>
                    </div>
                    {isUnread && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-700">
              <button
                onClick={() => { setIsOpen(false); navigate('/candidate/applied-jobs'); }}
                className="w-full rounded text-center text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {t('notifications.viewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
