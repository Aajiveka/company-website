import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarCheck, CalendarX2, Clock, MapPin, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Badge, Breadcrumbs, Card, JobCardSkeleton } from '@/components/ui';
import { useAppliedJobs } from '../candidate.api';
import type { AppliedJob } from '../candidate.types';

interface InterviewItem {
  jobId: number;
  designation: string;
  company: string;
  scheduledOn: string;
  mode: string;
  location: string | null;
  isPast: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByMonth(items: InterviewItem[]): [string, InterviewItem[]][] {
  const map = new Map<string, InterviewItem[]>();
  for (const item of items) {
    const key = new Date(item.scheduledOn).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    });
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function InterviewCard({ item }: { item: InterviewItem }) {
  const { t } = useTranslation('dashboard');

  return (
    <Link to={`/jobs/${item.jobId}`} className="block">
      <Card
        className={cn(
          'transition hover:shadow-md',
          item.isPast && 'opacity-60',
        )}
      >
        <div className="flex items-start gap-4">
          {/* Date badge */}
          <div className="hidden shrink-0 flex-col items-center rounded-lg bg-primary/10 px-3 py-2 text-center sm:flex">
            <span className="text-2xl font-bold text-primary">
              {new Date(item.scheduledOn).getDate()}
            </span>
            <span className="text-xs font-medium text-primary">
              {new Date(item.scheduledOn).toLocaleDateString(undefined, { month: 'short' })}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-base font-semibold text-navy">
                {item.designation}
              </h3>
              <Badge tone={item.isPast ? 'gray' : 'blue'}>
                {item.isPast ? t('interviews.past') : t('interviews.upcoming')}
              </Badge>
            </div>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <Building2 className="h-4 w-4 text-primary" aria-hidden />
              {item.company}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden />
                {formatDate(item.scheduledOn)} · {formatTime(item.scheduledOn)}
              </span>
              {item.mode && (
                <span className="flex items-center gap-1.5">
                  <Video className="h-4 w-4" aria-hidden />
                  {item.mode}
                </span>
              )}
              {item.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden />
                  {item.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function CandidateInterviewsPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useAppliedJobs();

  const { upcoming, past } = useMemo(() => {
    if (!data) return { upcoming: [] as InterviewItem[], past: [] as InterviewItem[] };
    const now = new Date();
    const items: InterviewItem[] = data
      .filter((j: AppliedJob) => j.interview)
      .map((j: AppliedJob) => ({
        jobId: j.jobId,
        designation: j.designation,
        company: j.company,
        scheduledOn: j.interview!.scheduledOn,
        mode: j.interview!.mode,
        location: j.interview!.location,
        isPast: new Date(j.interview!.scheduledOn) < now,
      }));

    const up = items.filter((i) => !i.isPast).sort(
      (a, b) => new Date(a.scheduledOn).getTime() - new Date(b.scheduledOn).getTime(),
    );
    const pa = items.filter((i) => i.isPast).sort(
      (a, b) => new Date(b.scheduledOn).getTime() - new Date(a.scheduledOn).getTime(),
    );
    return { upcoming: up, past: pa };
  }, [data]);

  const upcomingGroups = groupByMonth(upcoming);
  const pastGroups = groupByMonth(past);

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('interviews.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
        {t('interviews.heading')}
      </h1>

      {isLoading ? (
        <div className="space-y-4">
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-8">
            <CalendarX2 className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-navy">{t('interviews.noInterviews')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('interviews.noInterviewsHint')}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-navy">
                  {t('interviews.upcomingSection', { count: upcoming.length })}
                </h2>
              </div>
              {upcomingGroups.map(([month, items]) => (
                <div key={month} className="mb-6">
                  <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {month}
                  </p>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <InterviewCard key={`${item.jobId}-${item.scheduledOn}`} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-navy">
                  {t('interviews.pastSection', { count: past.length })}
                </h2>
              </div>
              {pastGroups.map(([month, items]) => (
                <div key={month} className="mb-6">
                  <p className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {month}
                  </p>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <InterviewCard key={`${item.jobId}-${item.scheduledOn}`} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
