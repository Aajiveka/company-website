import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Calendar,
  Check,
  Clock,
  FileUp,
  Star,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge, Breadcrumbs, Button, Card, CardSkeleton } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { api } from '@/lib/axios';

type EventType =
  | 'applied'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'selected'
  | 'rejected'
  | 'document_uploaded'
  | 'profile_updated';

interface ActivityEvent {
  eventId: number;
  type: EventType;
  title: string;
  description: string;
  timestamp: string;
  jobTitle?: string;
  company?: string;
}

interface ActivityPage {
  data: ActivityEvent[];
  nextCursor?: number;
}

type FilterTab = 'all' | 'applications' | 'interviews' | 'documents';

const FILTER_TYPES: Record<FilterTab, EventType[] | null> = {
  all: null,
  applications: ['applied', 'shortlisted', 'selected', 'rejected'],
  interviews: ['interview_scheduled', 'interview_completed'],
  documents: ['document_uploaded', 'profile_updated'],
};

const EVENT_ICON: Record<EventType, typeof Briefcase> = {
  applied: Briefcase,
  shortlisted: Star,
  interview_scheduled: Calendar,
  interview_completed: Calendar,
  selected: Check,
  rejected: X,
  document_uploaded: FileUp,
  profile_updated: User,
};

const DOT_COLOR: Record<EventType, string> = {
  applied: 'bg-blue-500',
  shortlisted: 'bg-green-500',
  interview_scheduled: 'bg-blue-500',
  interview_completed: 'bg-green-500',
  selected: 'bg-green-500',
  rejected: 'bg-red-500',
  document_uploaded: 'bg-blue-500',
  profile_updated: 'bg-blue-500',
};

const ICON_COLOR: Record<EventType, string> = {
  applied: 'text-blue-500',
  shortlisted: 'text-green-500',
  interview_scheduled: 'text-blue-500',
  interview_completed: 'text-green-500',
  selected: 'text-green-500',
  rejected: 'text-red-500',
  document_uploaded: 'text-blue-500',
  profile_updated: 'text-blue-500',
};

const EVENT_BADGE_TONE: Record<EventType, BadgeTone> = {
  applied: 'blue',
  shortlisted: 'green',
  interview_scheduled: 'blue',
  interview_completed: 'green',
  selected: 'green',
  rejected: 'red',
  document_uploaded: 'blue',
  profile_updated: 'gray',
};


function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function groupByDate(events: ActivityEvent[]): [string, ActivityEvent[]][] {
  const map = new Map<string, { label: string; items: ActivityEvent[] }>();
  for (const ev of events) {
    const key = dateKey(ev.timestamp);
    const existing = map.get(key);
    if (existing) {
      existing.items.push(ev);
    } else {
      map.set(key, { label: dateLabel(ev.timestamp), items: [ev] });
    }
  }
  return Array.from(map.entries()).map(([, v]) => [v.label, v.items]);
}

function TimelineEvent({ event }: { event: ActivityEvent }) {
  const { t } = useTranslation('dashboard');
  const Icon = EVENT_ICON[event.type];

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700 [.last\:pb-0_&]:hidden" />

      {/* Left: time */}
      <div className="hidden w-20 shrink-0 pt-1 text-right sm:block">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(event.timestamp)}
        </span>
      </div>

      {/* Center: dot */}
      <div className="relative z-10 mt-1.5 flex shrink-0 items-start">
        <span
          className={cn(
            'block h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900',
            DOT_COLOR[event.type],
          )}
        />
      </div>

      {/* Connector line below the dot */}
      <div className="absolute left-[23.5px] top-5 bottom-0 w-px bg-gray-200 last:hidden sm:left-[103.5px] dark:bg-gray-700" />

      {/* Right: card */}
      <Card className="flex-1">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-700',
              ICON_COLOR[event.type],
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-navy">{event.title}</h3>
              <Badge tone={EVENT_BADGE_TONE[event.type]}>
                {t(`activity.type.${event.type}`)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {event.description}
            </p>
            {(event.jobTitle || event.company) && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Briefcase className="h-3.5 w-3.5" aria-hidden />
                {[event.jobTitle, event.company].filter(Boolean).join(' at ')}
              </p>
            )}
            <span className="mt-1 block text-xs text-gray-400 sm:hidden dark:text-gray-500">
              {formatTime(event.timestamp)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function ActivityTimelinePage() {
  const { t } = useTranslation('dashboard');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ActivityPage>({
    queryKey: ['candidate', 'activity'],
    queryFn: ({ pageParam }) =>
      api
        .get<ActivityPage>('/candidates/me/activity', {
          params: { cursor: pageParam },
        })
        .then((r) => r.data),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const allEvents = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  const filteredEvents = useMemo(() => {
    const types = FILTER_TYPES[activeTab];
    if (!types) return allEvents;
    return allEvents.filter((ev) => types.includes(ev.type));
  }, [allEvents, activeTab]);

  const grouped = useMemo(() => groupByDate(filteredEvents), [filteredEvents]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('activity.filterAll') },
    { key: 'applications', label: t('activity.filterApplications') },
    { key: 'interviews', label: t('activity.filterInterviews') },
    { key: 'documents', label: t('activity.filterDocuments') },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('activity.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
        {t('activity.heading')}
      </h1>

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              activeTab === tab.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-8">
            <Clock className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-navy">{t('activity.empty')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('activity.emptyHint')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([label, events]) => (
            <section key={label}>
              <h2 className="mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
                {label}
              </h2>
              <div className="relative">
                {events.map((event) => (
                  <TimelineEvent key={event.eventId} event={event} />
                ))}
              </div>
            </section>
          ))}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                isLoading={isFetchingNextPage}
              >
                {t('activity.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
