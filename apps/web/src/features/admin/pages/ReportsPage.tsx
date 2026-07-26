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

function BarChart({ items, color = 'bg-primary' }: { items: BarChartItem[]; color?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height: 180 }}>
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
      <p className="text-2xl font-bold text-navy dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab content panels                                                */
/* ------------------------------------------------------------------ */

function OverviewTab({ data }: { data: PlatformStats }) {
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={data.totalCandidates.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        />
        <StatCard
          label="Total Jobs"
          value={data.totalJobs.toLocaleString()}
          icon={<Briefcase className="h-5 w-5" />}
          color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
        />
        <StatCard
          label="Total Applications"
          value={data.totalApplications.toLocaleString()}
          icon={<FileText className="h-5 w-5" />}
          color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        />
      </div>

      {/* Charts */}
      {signupItems.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-navy dark:text-white">Recent Signups</h3>
          <BarChart items={signupItems} color="bg-teal-500" />
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {designationItems.length > 0 && (
          <Card>
            <h3 className="mb-4 text-base font-semibold text-navy dark:text-white">Top Designations</h3>
            <HorizontalBars items={designationItems} color="bg-blue-500" />
          </Card>
        )}
        {cityItems.length > 0 && (
          <Card>
            <h3 className="mb-4 text-base font-semibold text-navy dark:text-white">Top Cities</h3>
            <HorizontalBars items={cityItems} color="bg-amber-500" />
          </Card>
        )}
      </div>
    </div>
  );
}

function UsersTab({ dateRange }: { dateRange: DateRange }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">Users Report</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Export the full platform user list as CSV. Use the date range to filter by sign-up period.
          </p>
        </div>
        <ExportButton
          endpoint="/exports/users"
          filename={`users-${dateRange.from}-${dateRange.to}`}
          label="Export Users"
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

function JobsTab({ dateRange }: { dateRange: DateRange }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">Jobs Report</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Export all jobs with designation, company, CTC, and status.
          </p>
        </div>
        <ExportButton
          endpoint="/exports/jobs"
          filename={`jobs-${dateRange.from}-${dateRange.to}`}
          label="Export Jobs"
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

function ApplicationsTab({ dateRange }: { dateRange: DateRange }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">Applications Report</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Export all job applications with candidate details and statuses.
          </p>
        </div>
        <ExportButton
          endpoint="/exports/applications"
          filename={`applications-${dateRange.from}-${dateRange.to}`}
          label="Export Applications"
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

function RevenueTab({ dateRange }: { dateRange: DateRange }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-navy dark:text-white">Payments / Revenue Report</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Export all payment orders with subscriber details, plan info, and settlement status.
          </p>
        </div>
        <ExportButton
          endpoint="/exports/payments"
          filename={`payments-${dateRange.from}-${dateRange.to}`}
          label="Export Payments"
          filters={{ from: dateRange.from, to: dateRange.to }}
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
  { key: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { key: 'jobs', label: 'Jobs', icon: <Briefcase className="h-4 w-4" /> },
  { key: 'applications', label: 'Applications', icon: <FileText className="h-4 w-4" /> },
  { key: 'revenue', label: 'Revenue', icon: <DollarSign className="h-4 w-4" /> },
];

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
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: 'Reports' }]} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-navy dark:text-white">
          <BarChart3 className="h-6 w-6" />
          Reports &amp; Exports
        </h1>
        <Badge tone="blue">{isLoading ? 'Loading...' : 'Live data'}</Badge>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
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
      {activeTab === 'overview' && <OverviewTab data={stats} />}
      {activeTab === 'users' && <UsersTab dateRange={dateRange} />}
      {activeTab === 'jobs' && <JobsTab dateRange={dateRange} />}
      {activeTab === 'applications' && <ApplicationsTab dateRange={dateRange} />}
      {activeTab === 'revenue' && <RevenueTab dateRange={dateRange} />}
    </div>
  );
}
