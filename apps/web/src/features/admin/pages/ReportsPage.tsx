import { useMemo, useState } from 'react';
import { BarChart3, Briefcase, DollarSign, FileText, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Card } from '@/components/ui';
import { api } from '@/lib/axios';
import ExportButton from '../components/ExportButton';
import DateRangePicker, { type DateRange } from '../components/DateRangePicker';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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
}

type Tab = 'overview' | 'users' | 'jobs' | 'applications' | 'revenue';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function formatCurrency(amount: number): string {
  if (amount >= 10_00_000) return `INR ${(amount / 10_00_000).toFixed(1)}M`;
  if (amount >= 1_00_000) return `INR ${(amount / 1_00_000).toFixed(1)}L`;
  if (amount >= 1_000) return `INR ${(amount / 1_000).toFixed(1)}K`;
  return `INR ${amount}`;
}

/* ------------------------------------------------------------------ */
/*  Pure CSS bar chart                                                */
/* ------------------------------------------------------------------ */

interface BarChartItem {
  label: string;
  value: number;
}

function BarChart({ items, color = 'bg-primary', chartLabel }: { items: BarChartItem[]; color?: string; chartLabel?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      <div role="img" aria-label={chartLabel ?? 'Bar chart'} className="flex items-end gap-0.5 sm:gap-1.5" style={{ height: 180 }}>
        {items.map((item) => {
          const pct = (item.value / max) * 100;
          return (
            <div key={item.label} className="group relative flex flex-1 flex-col items-center" style={{ height: '100%' }}>
              <div className="flex flex-1 w-full items-end">
                <div
                  className={`w-full rounded-t-sm ${color} transition-all duration-300`}
                  style={{ height: `${Math.max(pct, 2)}%`, minHeight: 2 }}
                />
              </div>
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                {item.value}
              </div>
              <span className="mt-1 text-[10px] text-gray-400 dark:text-gray-500 truncate max-w-full">{item.label}</span>
            </div>
          );
        })}
      </div>
      {/* Visually-hidden data table for screen readers */}
      <table className="sr-only">
        <caption>{chartLabel ?? 'Chart data'}</caption>
        <thead>
          <tr><th>Label</th><th>Value</th></tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label}><td>{item.label}</td><td>{item.value}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HorizontalBars({ items, color = 'bg-primary' }: { items: BarChartItem[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate text-gray-600 dark:text-gray-300">{item.label}</span>
            <span className="ml-2 shrink-0 font-semibold text-navy dark:text-white">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                         */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <div className={`inline-flex rounded-lg p-2 ${color}`}>{icon}</div>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-navy dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab content panels                                                */
/* ------------------------------------------------------------------ */

function OverviewTab({ data }: { data: PlatformStats }) {
  const { t } = useTranslation('dashboard');
  const signupItems: BarChartItem[] = (data.recentSignups ?? []).map((s) => ({
    label: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: s.count,
  }));

  const designationItems: BarChartItem[] = (data.topDesignations ?? []).slice(0, 8).map((d) => ({
    label: d.designation,
    value: d.count,
  }));

  const cityItems: BarChartItem[] = (data.topCities ?? []).slice(0, 8).map((c) => ({
    label: c.city,
    value: c.count,
  }));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('reports.totalUsers')}
          value={data.totalCandidates.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        />
        <StatCard
          label={t('reports.totalJobs')}
          value={data.totalJobs.toLocaleString()}
          icon={<Briefcase className="h-5 w-5" />}
          color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
        />
        <StatCard
          label={t('reports.totalApplications')}
          value={data.totalApplications.toLocaleString()}
          icon={<FileText className="h-5 w-5" />}
          color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
        />
        <StatCard
          label={t('reports.totalRevenue')}
          value={formatCurrency(data.totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        />
      </div>

      {/* Charts */}
      {signupItems.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-navy dark:text-white">{t('reports.recentSignups')}</h3>
          <BarChart items={signupItems} color="bg-teal-500" chartLabel="Recent signups chart" />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {designationItems.length > 0 && (
          <Card>
            <h3 className="mb-4 text-base font-semibold text-navy dark:text-white">{t('reports.topDesignations')}</h3>
            <HorizontalBars items={designationItems} color="bg-blue-500" />
          </Card>
        )}
        {cityItems.length > 0 && (
          <Card>
            <h3 className="mb-4 text-base font-semibold text-navy dark:text-white">{t('reports.topCities')}</h3>
            <HorizontalBars items={cityItems} color="bg-amber-500" />
          </Card>
        )}
      </div>
    </div>
  );
}

function UsersTab({ dateRange }: { dateRange: DateRange }) {
  const { t } = useTranslation('dashboard');
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">{t('reports.usersReport')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reports.usersReportDesc')}
          </p>
        </div>
        <ExportButton
          endpoint="/exports/users"
          filename={`users-${dateRange.from}-${dateRange.to}`}
          label={t('reports.exportUsers')}
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

function JobsTab({ dateRange }: { dateRange: DateRange }) {
  const { t } = useTranslation('dashboard');
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">{t('reports.jobsReport')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reports.jobsReportDesc')}
          </p>
        </div>
        <ExportButton
          endpoint="/exports/jobs"
          filename={`jobs-${dateRange.from}-${dateRange.to}`}
          label={t('reports.exportJobs')}
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

function ApplicationsTab({ dateRange }: { dateRange: DateRange }) {
  const { t } = useTranslation('dashboard');
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">{t('reports.applicationsReport')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reports.applicationsReportDesc')}
          </p>
        </div>
        <ExportButton
          endpoint="/exports/applications"
          filename={`applications-${dateRange.from}-${dateRange.to}`}
          label={t('reports.exportApplications')}
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

function RevenueTab({ dateRange }: { dateRange: DateRange }) {
  const { t } = useTranslation('dashboard');
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">{t('reports.revenueReport')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reports.revenueReportDesc')}
          </p>
        </div>
        <ExportButton
          endpoint="/exports/payments"
          filename={`payments-${dateRange.from}-${dateRange.to}`}
          label={t('reports.exportPayments')}
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  overview: <BarChart3 className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  jobs: <Briefcase className="h-4 w-4" />,
  applications: <FileText className="h-4 w-4" />,
  revenue: <DollarSign className="h-4 w-4" />,
};

const TAB_KEYS: Tab[] = ['overview', 'users', 'jobs', 'applications', 'revenue'];

export default function ReportsPage() {
  const { t } = useTranslation('dashboard');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: thirtyDaysAgoStr(),
    to: todayStr(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: () => api.get<PlatformStats>('/admin/stats').then((r) => r.data),
  });

  const placeholderStats = useMemo<PlatformStats>(
    () => ({
      totalCandidates: 0,
      totalEmployers: 0,
      totalJobs: 0,
      activeJobs: 0,
      totalApplications: 0,
      totalRevenue: 0,
      recentSignups: [],
      topDesignations: [],
      topCities: [],
    }),
    [],
  );

  const stats = data ?? placeholderStats;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('reports.heading') }]} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-navy dark:text-white">
          <BarChart3 className="h-6 w-6" />
          {t('reports.heading')}
        </h1>
        <Badge tone="blue">{isLoading ? t('reports.loading') : t('reports.liveData')}</Badge>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Report sections" className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={`tabpanel-${key}`}
            id={`tab-${key}`}
            onClick={() => setActiveTab(key)}
            className={`inline-flex items-center gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 sm:px-3 text-xs sm:text-sm font-medium transition ${
              activeTab === key
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {TAB_ICONS[key]}
            {t(`reports.tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* Date range picker — shown on all tabs except overview */}
      {activeTab !== 'overview' && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      )}

      {/* Tab panels */}
      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'overview' && <OverviewTab data={stats} />}
        {activeTab === 'users' && <UsersTab dateRange={dateRange} />}
        {activeTab === 'jobs' && <JobsTab dateRange={dateRange} />}
        {activeTab === 'applications' && <ApplicationsTab dateRange={dateRange} />}
        {activeTab === 'revenue' && <RevenueTab dateRange={dateRange} />}
      </div>
    </div>
  );
}
