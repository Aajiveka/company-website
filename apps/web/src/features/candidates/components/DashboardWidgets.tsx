import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Send,
  CheckCircle2,
  CalendarCheck,
  Bookmark,
  MapPin,
  Building2,
  Clock,
  ArrowRight,
  Star,
  FileText,
  Eye,
  Bell,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Card, Badge, Skeleton, Button } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ActivityItem {
  id: number;
  type: string;
  description: string;
  createdAt: string;
}

interface RecommendedJob {
  id: number;
  designation: string;
  company: string;
  location: string;
  matchScore: number;
}

interface DashboardSummary {
  applications: number;
  shortlisted: number;
  upcomingInterviews: number;
  savedJobs: number;
  profileCompletion: number;
}

/* ------------------------------------------------------------------ */
/*  API hooks                                                         */
/* ------------------------------------------------------------------ */

function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['candidates', 'me', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>('/candidates/me/dashboard');
      return data;
    },
  });
}

function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ['candidates', 'me', 'activity'],
    queryFn: async () => {
      const { data } = await api.get<ActivityItem[]>('/candidates/me/activity', {
        params: { limit: 5 },
      });
      return data;
    },
  });
}

function useRecommendedJobs() {
  return useQuery<RecommendedJob[]>({
    queryKey: ['candidates', 'me', 'recommendations'],
    queryFn: async () => {
      const { data } = await api.get<RecommendedJob[]>('/candidates/me/recommendations', {
        params: { limit: 3 },
      });
      return data;
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  application: <Send className="h-4 w-4" />,
  shortlist: <CheckCircle2 className="h-4 w-4" />,
  interview: <CalendarCheck className="h-4 w-4" />,
  save: <Bookmark className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function matchScoreTone(score: number) {
  if (score >= 80) return 'green' as const;
  if (score >= 60) return 'blue' as const;
  if (score >= 40) return 'amber' as const;
  return 'gray' as const;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function StatsRow({ summary }: { summary: DashboardSummary | undefined }) {
  const { t } = useTranslation('dashboard');

  const cards = [
    {
      key: 'totalApplied',
      value: summary?.applications ?? 0,
      icon: <Send className="h-5 w-5" />,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      key: 'shortlisted',
      value: summary?.shortlisted ?? 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      key: 'upcomingInterviews',
      value: summary?.upcomingInterviews ?? 0,
      icon: <CalendarCheck className="h-5 w-5" />,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    },
    {
      key: 'savedJobs',
      value: summary?.savedJobs ?? 0,
      icon: <Bookmark className="h-5 w-5" />,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {cards.map((c) => (
        <Card key={c.key} className="flex flex-col gap-2">
          <div className={cn('inline-flex w-fit rounded-lg p-2', c.color)}>{c.icon}</div>
          {summary === undefined ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-bold text-navy dark:text-white">{c.value}</p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">{t(`stats.${c.key}`)}</p>
        </Card>
      ))}
    </div>
  );
}

function RecentActivity() {
  const { t } = useTranslation('dashboard');
  const { data: activities, isLoading } = useRecentActivity();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy dark:text-white">
          {t('stats.recentActivity')}
        </h2>
        <Link
          to="/candidate/activity"
          className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
        >
          {t('stats.viewAll')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : activities && activities.length > 0 ? (
        <ul className="space-y-3">
          {activities.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {ACTIVITY_ICONS[item.type] ?? <Bell className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.description}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <Clock className="h-3 w-3" />
                  {timeAgo(item.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('stats.noActivity')}</p>
      )}
    </Card>
  );
}

function RecommendedJobs() {
  const { t } = useTranslation('dashboard');
  const { data: jobs, isLoading } = useRecommendedJobs();

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy dark:text-white">
        {t('recommendations.heading')}
      </h2>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-gray-100 p-3 dark:border-gray-700">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : jobs && jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-lg border border-gray-100 p-3 transition hover:border-gray-200 dark:border-gray-700 dark:hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-navy dark:text-white">
                    {job.designation}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    {job.company}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {job.location}
                  </p>
                </div>
                <Badge tone={matchScoreTone(job.matchScore)}>
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3" />
                    {job.matchScore}%
                  </span>
                </Badge>
              </div>
              <div className="mt-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/jobs/${job.id}`}>
                    {t('recommendations.viewDetails')}
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('recommendations.noJobs')}
        </p>
      )}
    </Card>
  );
}

function ProfileCompletion({ percent }: { percent: number | undefined }) {
  const { t } = useTranslation('dashboard');

  const safePercent = percent ?? 0;

  const barColor =
    safePercent === 100
      ? 'bg-green-500'
      : safePercent >= 50
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const tone =
    safePercent === 100
      ? 'text-green-600 dark:text-green-400'
      : safePercent >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy dark:text-white">
          {t('completion.heading')}
        </h2>
        {percent === undefined ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <span className={cn('text-2xl font-bold', tone)}>{safePercent}%</span>
        )}
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {percent === undefined ? (
          <Skeleton className="h-full w-full rounded-full" />
        ) : (
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${safePercent}%` }}
          />
        )}
      </div>

      {safePercent < 100 && percent !== undefined && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('completion.hint')}
        </p>
      )}

      {percent !== undefined && safePercent < 100 && (
        <div className="mt-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/candidate/cv">
              {t('completion.completeProfile')}
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function DashboardWidgets() {
  const { data: summary } = useDashboardSummary();

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <StatsRow summary={summary} />

      {/* Two-column grid: activity + recommendations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity />
        <RecommendedJobs />
      </div>

      {/* Profile completion */}
      <ProfileCompletion percent={summary?.profileCompletion} />
    </div>
  );
}
