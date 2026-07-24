import { useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Card, CardSkeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface EmployerAnalytics {
  applicationsTrend: { date: string; count: number }[];
  hireRate: number;
  avgTimeToHire: number;
  statusBreakdown: { status: string; count: number }[];
  monthlyHires: { month: string; hires: number }[];
}

function TrendChart({ data, color, label }: { data: { label: string; value: number }[]; color: string; label: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-navy">{label}</h3>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-medium text-gray-500">{d.value}</span>
            <div
              className={cn('w-full rounded-t transition-all duration-500', color)}
              style={{ height: `${(d.value / maxVal) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
            />
            <span className="text-[8px] text-gray-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 inline-flex rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function EmployerAnalyticsPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useQuery({
    queryKey: ['client', 'analytics'],
    queryFn: () => api.get<EmployerAnalytics>('/clients/me/analytics').then((r) => r.data),
  });

  const appTrend = useMemo(() => {
    if (!data?.applicationsTrend) return [];
    return data.applicationsTrend.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: d.count,
    }));
  }, [data]);

  const hireTrend = useMemo(() => {
    if (!data?.monthlyHires) return [];
    return data.monthlyHires.map((d) => ({ label: d.month, value: d.hires }));
  }, [data]);

  const statusBars = useMemo(() => {
    if (!data?.statusBreakdown) return { items: [], maxValue: 1 };
    const items = data.statusBreakdown;
    return { items, maxValue: Math.max(...items.map((s) => s.count), 1) };
  }, [data]);

  const statusColors: Record<string, string> = {
    Applied: 'bg-blue-500', Shortlisted: 'bg-amber-500', Interview: 'bg-purple-500',
    Selected: 'bg-green-500', Rejected: 'bg-red-400',
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/company/profile' }, { label: t('employerAnalytics.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('employerAnalytics.heading')}</h1>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
      ) : !data ? (
        <Card><p className="text-sm text-gray-500">{t('employerAnalytics.noData')}</p></Card>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label={t('employerAnalytics.hireRate')}
              value={`${data.hireRate}%`}
              sub={t('employerAnalytics.hireRateSub')}
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label={t('employerAnalytics.avgTimeToHire')}
              value={`${data.avgTimeToHire}d`}
              sub={t('employerAnalytics.avgTimeToHireSub')}
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              label={t('employerAnalytics.totalApps')}
              value={data.applicationsTrend.reduce((s, d) => s + d.count, 0).toLocaleString()}
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <TrendChart data={appTrend} color="bg-primary" label={t('employerAnalytics.appsTrend')} />
            </Card>
            <Card>
              <TrendChart data={hireTrend} color="bg-green-500" label={t('employerAnalytics.monthlyHires')} />
            </Card>
          </div>

          {/* Status breakdown */}
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy">
              <BarChart3 className="h-5 w-5 text-primary" /> {t('employerAnalytics.statusBreakdown')}
            </h3>
            <div className="space-y-3">
              {statusBars.items.map((s) => (
                <div key={s.status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">{s.status}</span>
                    <span className="font-semibold text-navy">{s.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', statusColors[s.status] ?? 'bg-gray-400')}
                      style={{ width: `${(s.count / statusBars.maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
