import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface AdminChartsProps {
  signups: { date: string; count: number }[];
  jobsByStatus: { status: string; count: number }[];
  topDesignations: { name: string; count: number }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, { bar: string; bg: string }> = {
  Open: { bar: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  Active: { bar: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  Closed: { bar: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  Draft: { bar: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
};

const DESIGNATION_COLORS = [
  'bg-blue-500',
  'bg-teal-500',
  'bg-purple-500',
  'bg-indigo-500',
  'bg-pink-500',
];

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/* ------------------------------------------------------------------ */
/*  Signups bar chart (vertical)                                      */
/* ------------------------------------------------------------------ */

function SignupsChart({ signups }: { signups: AdminChartsProps['signups'] }) {
  const { t } = useTranslation('dashboard');
  const maxCount = useMemo(() => Math.max(...signups.map((s) => s.count), 1), [signups]);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy dark:text-white">
        {t('admin.signupsOverTime')}
      </h2>

      {signups.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.noData')}</p>
      ) : (
        <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: '200px' }}>
          {signups.map((day) => {
            const heightPercent = (day.count / maxCount) * 100;
            return (
              <div
                key={day.date}
                className="group relative flex flex-1 flex-col-reverse items-center"
                style={{ height: '100%' }}
              >
                {/* Bar */}
                <div
                  className="w-full rounded-t-sm bg-teal-500 transition-all duration-300 dark:bg-teal-400"
                  style={{
                    height: `${Math.max(heightPercent, 2)}%`,
                    minHeight: '2px',
                  }}
                />
                {/* Tooltip */}
                <div
                  className={cn(
                    'pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity dark:bg-gray-100 dark:text-gray-900',
                    'group-hover:opacity-100',
                  )}
                >
                  {day.count}
                </div>
                {/* Date label */}
                <span className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500 sm:text-xs">
                  {formatShortDate(day.date)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Jobs by status (horizontal bars)                                  */
/* ------------------------------------------------------------------ */

function JobsByStatusChart({ jobsByStatus }: { jobsByStatus: AdminChartsProps['jobsByStatus'] }) {
  const { t } = useTranslation('dashboard');
  const maxCount = useMemo(() => Math.max(...jobsByStatus.map((j) => j.count), 1), [jobsByStatus]);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy dark:text-white">
        {t('admin.jobsByStatus')}
      </h2>

      {jobsByStatus.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.noData')}</p>
      ) : (
        <div className="space-y-3">
          {jobsByStatus.map((item) => {
            const widthPercent = (item.count / maxCount) * 100;
            const colors = STATUS_COLORS[item.status] ?? {
              bar: 'bg-gray-500',
              bg: 'bg-gray-100 dark:bg-gray-700',
            };

            return (
              <div key={item.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {item.status}
                  </span>
                  <span className="tabular-nums text-gray-500 dark:text-gray-400">
                    {item.count}
                  </span>
                </div>
                <div className={cn('h-6 overflow-hidden rounded-md', colors.bg)}>
                  <div
                    className={cn('h-full rounded-md transition-all duration-500', colors.bar)}
                    style={{ width: `${Math.max(widthPercent, 1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Top designations (horizontal bars)                                */
/* ------------------------------------------------------------------ */

function TopDesignationsChart({
  topDesignations,
}: {
  topDesignations: AdminChartsProps['topDesignations'];
}) {
  const { t } = useTranslation('dashboard');
  const maxCount = useMemo(
    () => Math.max(...topDesignations.map((d) => d.count), 1),
    [topDesignations],
  );

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy dark:text-white">
        {t('admin.topDesignations')}
      </h2>

      {topDesignations.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.noData')}</p>
      ) : (
        <div className="space-y-3">
          {topDesignations.map((item, idx) => {
            const widthPercent = (item.count / maxCount) * 100;
            const barColor = DESIGNATION_COLORS[idx % DESIGNATION_COLORS.length];

            return (
              <div key={item.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span
                    className="max-w-[70%] truncate font-medium text-gray-700 dark:text-gray-300"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <span className="tabular-nums text-gray-500 dark:text-gray-400">
                    {item.count}
                  </span>
                </div>
                <div className="h-5 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
                  <div
                    className={cn('h-full rounded-md transition-all duration-500', barColor)}
                    style={{ width: `${Math.max(widthPercent, 1)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function AdminCharts({ signups, jobsByStatus, topDesignations }: AdminChartsProps) {
  return (
    <div className="space-y-6">
      {/* Full-width signups chart */}
      <SignupsChart signups={signups} />

      {/* Two-column grid: status + designations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <JobsByStatusChart jobsByStatus={jobsByStatus} />
        <TopDesignationsChart topDesignations={topDesignations} />
      </div>
    </div>
  );
}
