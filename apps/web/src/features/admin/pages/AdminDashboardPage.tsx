import { useMemo } from 'react';
import { BarChart3, Briefcase, Building2, Clock, IndianRupee, TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Card, CardSkeleton, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface PlatformStats {
  totalCandidates: number;
  totalEmployers: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  totalRevenue: number;
  recentSignups: { date: string; count: number }[];
  topDesignations: { designation: string; count: number }[];
  topCities: { city: string; count: number }[];
  recentActivity: {
    id: number;
    type: 'user_signup' | 'job_posted' | 'application' | 'payment';
    description: string;
    actor: string;
    timestamp: string;
  }[];
}

function usePlatformStats() {
  return useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: () => api.get<PlatformStats>('/admin/stats').then((r) => r.data),
  });
}

interface BarItem {
  label: string;
  value: number;
  color: string;
}

function HorizontalBar({ items, maxValue }: { items: BarItem[]; maxValue: number }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate text-gray-600 dark:text-gray-300">{item.label}</span>
            <span className="ml-2 shrink-0 font-semibold text-navy">{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={cn('h-full rounded-full transition-all duration-500', item.color)}
              style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <div className={cn('inline-flex rounded-lg p-2', color)}>{icon}</div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-navy sm:text-3xl">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

const ACTIVITY_TONE: Record<string, 'blue' | 'green' | 'amber' | 'purple'> = {
  user_signup: 'blue',
  job_posted: 'green',
  application: 'amber',
  payment: 'purple',
};

const ACTIVITY_ICON_MAP: Record<string, React.ReactNode> = {
  user_signup: <Users className="h-4 w-4" />,
  job_posted: <Briefcase className="h-4 w-4" />,
  application: <BarChart3 className="h-4 w-4" />,
  payment: <IndianRupee className="h-4 w-4" />,
};

function formatCurrency(amount: number): string {
  if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(1)}M`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return `₹${amount}`;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Admin -- platform-wide analytics dashboard. */
export default function AdminDashboardPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = usePlatformStats();

  const topDesignations = useMemo(() => {
    if (!data?.topDesignations) return { items: [], maxValue: 1 };
    const items: BarItem[] = data.topDesignations.slice(0, 8).map((d) => ({
      label: d.designation,
      value: d.count,
      color: 'bg-primary',
    }));
    return { items, maxValue: Math.max(...items.map((i) => i.value), 1) };
  }, [data]);

  const topCities = useMemo(() => {
    if (!data?.topCities) return { items: [], maxValue: 1 };
    const items: BarItem[] = data.topCities.slice(0, 8).map((c) => ({
      label: c.city,
      value: c.count,
      color: 'bg-amber-500',
    }));
    return { items, maxValue: Math.max(...items.map((i) => i.value), 1) };
  }, [data]);

  const signupTrend = useMemo(() => {
    if (!data?.recentSignups) return { items: [], maxValue: 1 };
    const items: BarItem[] = data.recentSignups.map((s) => ({
      label: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: s.count,
      color: 'bg-green-500',
    }));
    return { items, maxValue: Math.max(...items.map((i) => i.value), 1) };
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('admin.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('admin.heading')}</h1>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CardSkeleton /> <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <CardSkeleton /> <CardSkeleton />
          </div>
          <Card>
            <Skeleton className="mb-4 h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="mb-3 h-12 w-full" />
            ))}
          </Card>
        </div>
      ) : !data ? (
        <Card><p className="text-sm text-gray-500">{t('admin.noData')}</p></Card>
      ) : (
        <div className="space-y-6">
          {/* Overview stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={t('admin.totalCandidates')}
              value={data.totalCandidates.toLocaleString()}
              icon={<Users className="h-5 w-5" />}
              color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            />
            <StatCard
              label={t('admin.totalEmployers')}
              value={data.totalEmployers.toLocaleString()}
              icon={<Building2 className="h-5 w-5" />}
              color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            />
            <StatCard
              label={t('admin.activeJobs')}
              value={data.activeJobs.toLocaleString()}
              icon={<Briefcase className="h-5 w-5" />}
              color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            />
            <StatCard
              label={t('admin.totalApplications')}
              value={data.totalApplications.toLocaleString()}
              icon={<TrendingUp className="h-5 w-5" />}
              color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
            />
          </div>

          {/* Revenue card - full width */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.totalRevenue')}</p>
                <p className="mt-1 text-3xl font-bold text-navy">{formatCurrency(data.totalRevenue)}</p>
              </div>
              <div className="rounded-lg bg-green-50 p-3 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>
          </Card>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy">
                <BarChart3 className="h-5 w-5 text-primary" />
                {t('admin.topDesignations')}
              </h3>
              {topDesignations.items.length > 0 ? (
                <HorizontalBar items={topDesignations.items} maxValue={topDesignations.maxValue} />
              ) : (
                <p className="text-sm text-gray-500">{t('admin.noData')}</p>
              )}
            </Card>
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                {t('admin.topCities')}
              </h3>
              {topCities.items.length > 0 ? (
                <HorizontalBar items={topCities.items} maxValue={topCities.maxValue} />
              ) : (
                <p className="text-sm text-gray-500">{t('admin.noData')}</p>
              )}
            </Card>
          </div>

          {/* Signup trend */}
          {signupTrend.items.length > 0 && (
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy">
                <TrendingUp className="h-5 w-5 text-green-500" />
                {t('admin.recentSignups')}
              </h3>
              <HorizontalBar items={signupTrend.items} maxValue={signupTrend.maxValue} />
            </Card>
          )}

          {/* Recent activity feed */}
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy">
              <Clock className="h-5 w-5 text-gray-500" />
              {t('admin.recentActivity')}
            </h3>
            {data.recentActivity && data.recentActivity.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.recentActivity.map((activity) => {
                  const tone = ACTIVITY_TONE[activity.type] ?? 'blue';
                  return (
                    <div key={activity.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          tone === 'blue' && 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
                          tone === 'green' && 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
                          tone === 'amber' && 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
                          tone === 'purple' && 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
                        )}
                      >
                        {ACTIVITY_ICON_MAP[activity.type] ?? <Clock className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium text-navy dark:text-gray-100">{activity.actor}</span>{' '}
                          {activity.description}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge tone={tone}>{activity.type.replace(/_/g, ' ')}</Badge>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {timeAgo(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('admin.noData')}</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
