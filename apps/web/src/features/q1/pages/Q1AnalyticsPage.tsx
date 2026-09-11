import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useQ1Analytics } from '../q1.api';
import { durationLabel } from '../q1.format';
import { Q1Shell } from '../components/Q1Shell';
import { Q1Card } from '../components/primitives';

/** Analytics & Reports. */
export default function Q1AnalyticsPage() {
  const { t } = useTranslation('common');
  const { data, isLoading, isError, refetch } = useQ1Analytics();

  const kpis = [
    { key: 'screened', value: data ? String(data.kpis.candidatesScreened) : '—',
      delta: data?.kpis.screenedThisWeek },
    { key: 'verificationRate', value: data ? `${data.kpis.verificationRate}%` : '—' },
    { key: 'avgTime', value: data ? durationLabel(data.kpis.avgScreeningMinutes) : '—' },
    { key: 'cvAvailability', value: data ? `${data.kpis.cvAvailability}%` : '—' },
  ];

  const maxBar = Math.max(1, ...(data?.screeningsThisWeek.values ?? [1]));
  const maxStatus = Math.max(1, ...(data?.byStatus.map((s) => s.count) ?? [1]));

  return (
    <Q1Shell title={t('q1.analytics.title')} subtitle={t('q1.analytics.subtitle')}>
      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : (
        <div className="space-y-5">
          {/* Four KPI tiles */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <Q1Card key={k.key} className="p-5">
                <div className="flex items-baseline gap-2">
                  {isLoading ? (
                    <span className="inline-block h-7 w-14 animate-pulse rounded bg-q1-chip dark:bg-gray-700" />
                  ) : (
                    <span className="font-display text-2xl font-extrabold text-q1-ink dark:text-white">
                      {k.value}
                    </span>
                  )}
                  {k.delta ? (
                    <span className="text-xs font-semibold text-q1-green">
                      +{k.delta} {t('q1.analytics.thisWeek')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[13px] font-medium text-q1-ink-soft dark:text-gray-300">
                  {t(`q1.analytics.kpi.${k.key}`)}
                </p>
              </Q1Card>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Screenings this week */}
            <Q1Card className="p-5">
              <h3 className="font-display text-sm font-bold text-q1-ink dark:text-white">
                {t('q1.analytics.weekly.title')}
              </h3>
              <p className="mt-1 text-xs text-q1-muted">{t('q1.analytics.weekly.help')}</p>
              <div className="mt-6 flex h-44 items-end gap-3">
                {(data?.screeningsThisWeek.labels ?? ['', '', '', '', '', '', '']).map((label, i) => {
                  const v = data?.screeningsThisWeek.values[i] ?? 0;
                  return (
                    <div key={label || i} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-q1-blue transition-[height]"
                          style={{ height: `${Math.max(4, (v / maxBar) * 100)}%` }}
                          title={`${label}: ${v}`}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-q1-muted">{label}</span>
                    </div>
                  );
                })}
              </div>
            </Q1Card>

            {/* Profile completion distribution */}
            <Q1Card className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-q1-ink dark:text-white">
                    {t('q1.analytics.completion.title')}
                  </h3>
                  <p className="mt-1 text-xs text-q1-muted">{t('q1.analytics.completion.help')}</p>
                </div>
              </div>
              <ul className="mt-5 space-y-4">
                {(data?.profileCompletion ?? []).map((row) => (
                  <li key={row.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-q1-ink-soft dark:text-gray-300">
                      {row.label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-q1-chip dark:bg-gray-700">
                      <div className="h-full rounded-full bg-q1-blue" style={{ width: `${row.percent}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-bold text-q1-ink dark:text-white">
                      {row.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </Q1Card>

            {/* Candidates by status */}
            <Q1Card className="p-5">
              <h3 className="font-display text-sm font-bold text-q1-ink dark:text-white">
                {t('q1.analytics.byStatus.title')}
              </h3>
              <ul className="mt-5 space-y-3">
                {(data?.byStatus ?? []).map((row) => (
                  <li key={row.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs font-medium text-q1-ink-soft dark:text-gray-300">
                      {row.label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-q1-chip dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-q1-blue"
                        style={{ width: `${(row.count / maxStatus) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold text-q1-ink dark:text-white">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </Q1Card>

            {/* Screening funnel */}
            <Q1Card className="p-5">
              <h3 className="font-display text-sm font-bold text-q1-ink dark:text-white">
                {t('q1.analytics.funnel.title')}
              </h3>
              <p className="mt-1 text-xs text-q1-muted">{t('q1.analytics.funnel.help')}</p>
              <ul className="mt-5 space-y-3">
                {(data?.funnel ?? []).map((row, i) => (
                  <li
                    key={row.label}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5',
                      i === 0 ? 'bg-q1-blue-soft' : 'bg-q1-canvas dark:bg-gray-700/40',
                    )}
                  >
                    <span className="w-24 shrink-0 text-xs font-medium text-q1-ink-soft dark:text-gray-300">
                      {row.label}
                    </span>
                    <span className="text-xs font-bold text-q1-ink dark:text-white">{row.count}</span>
                    <span className="ml-auto text-xs font-semibold text-q1-blue">{row.percent}%</span>
                  </li>
                ))}
              </ul>
            </Q1Card>
          </div>
        </div>
      )}
    </Q1Shell>
  );
}
