import { useMemo } from 'react';
import { BarChart3, Briefcase, Building2, TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Card, CardSkeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface PlatformStats {
  totalCandidates: number;
  totalEmployers: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  recentSignups: { date: string; count: number }[];
  topDesignations: { designation: string; count: number }[];
  topCities: { city: string; count: number }[];
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

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className={cn('mb-3 inline-flex rounded-lg p-2', color)}>{icon}</div>
      <p className="text-2xl font-bold text-navy sm:text-3xl">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

/** Admin — platform-wide analytics dashboard. */
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton /> <CardSkeleton /> <CardSkeleton /> <CardSkeleton />
        </div>
      ) : !data ? (
        <Card><p className="text-sm text-gray-500">{t('admin.noData')}</p></Card>
      ) : (
        <div className="space-y-6">
          {/* Overview stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={t('admin.totalCandidates')}
              value={data.totalCandidates}
              icon={<Users className="h-5 w-5" />}
              color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            />
            <StatCard
              label={t('admin.totalEmployers')}
              value={data.totalEmployers}
              icon={<Building2 className="h-5 w-5" />}
              color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            />
            <StatCard
              label={t('admin.activeJobs')}
              value={data.activeJobs}
              icon={<Briefcase className="h-5 w-5" />}
              color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            />
            <StatCard
              label={t('admin.totalApplications')}
              value={data.totalApplications}
              icon={<TrendingUp className="h-5 w-5" />}
              color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
            />
          </div>

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
        </div>
      )}
    </div>
  );
}
