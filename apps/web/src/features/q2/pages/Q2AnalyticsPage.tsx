import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useQ2Analytics } from '../q2.api';
import { matchTone, weightLabel } from '../q2.format';
import { Q2Shell } from '../components/Q2Shell';
import { Q2Card, SectionLabel } from '../components/primitives';

/**
 * Match Analytics.
 *
 * The Q2 designs list this in the sidebar but draw no frame for it, so the page reports only
 * quantities the other five screens already name — the relevance cut, the score bands the
 * match ring uses, the three decision buckets, and the seven weighted criteria. Nothing here
 * is a metric the design never asked for.
 */
export default function Q2AnalyticsPage() {
  const { t } = useTranslation('common');
  const { data, isLoading, isError, refetch } = useQ2Analytics();

  const kpis = [
    { key: 'activeJobs', value: data?.activeJobs ?? 0 },
    { key: 'totalApplications', value: data?.totalApplications ?? 0 },
    { key: 'relevantMatches', value: data?.relevantMatches ?? 0 },
    { key: 'averageMatch', value: data?.averageMatch ?? 0, suffix: '%' },
  ] as const;

  const decisions = [
    { key: 'awaiting', tone: 'bg-q2-blue-soft text-q2-blue' },
    { key: 'forwardedToQ3', tone: 'bg-q2-emerald-soft text-q2-emerald-ink' },
    { key: 'sentBackToQ1', tone: 'bg-q2-amber-soft text-q2-amber' },
    { key: 'rejected', tone: 'bg-q2-red-soft text-q2-red' },
  ] as const;

  const maxBand = Math.max(1, ...(data?.distribution ?? []).map((d) => d.count));

  return (
    <Q2Shell title={t('q2.analytics.title')} subtitle={t('q2.analytics.subtitle')}>
      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((k) => (
              <Q2Card key={k.key} className="p-4">
                <p className="font-display text-2xl font-extrabold text-q2-ink dark:text-white">
                  {k.value}
                  {'suffix' in k ? k.suffix : ''}
                </p>
                <p className="mt-0.5 text-[13px] font-semibold text-q2-ink dark:text-gray-100">
                  {t(`q2.analytics.kpis.${k.key}`)}
                </p>
              </Q2Card>
            ))}
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            {/* Score distribution, in the ring's own bands */}
            <Q2Card className="p-5">
              <h2 className="font-display text-base font-bold text-q2-ink dark:text-white">
                {t('q2.analytics.distribution.title')}
              </h2>
              <p className="mt-0.5 text-xs text-q2-muted">
                {t('q2.analytics.distribution.help', { threshold: data.relevantThreshold })}
              </p>
              <ul className="mt-4 space-y-3">
                {data.distribution.map((d) => {
                  // The band's own lower bound decides its colour, so the chart and the rings
                  // in the tables cannot disagree.
                  const lower = Number(d.band.split(/[–\s]/)[0]) || 0;
                  const tone = matchTone(d.band === 'Below 50' ? 0 : lower);
                  return (
                    <li key={d.band} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs font-medium text-q2-ink-soft dark:text-gray-300">
                        {d.band}
                      </span>
                      <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-q2-chip dark:bg-gray-700">
                        <div
                          className={cn('h-full rounded-full bg-current', tone.ring)}
                          style={{ width: `${(d.count / maxBand) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs font-bold text-q2-ink tabular-nums dark:text-gray-100">
                        {d.count}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-5 border-t border-q2-line pt-4 dark:border-gray-700">
                <SectionLabel>{t('q2.analytics.decisions.title')}</SectionLabel>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  {decisions.map((d) => (
                    <div
                      key={d.key}
                      className={cn('rounded-lg px-3 py-2.5', d.tone)}
                    >
                      <p className="font-display text-lg font-extrabold">
                        {data.decisions[d.key]}
                      </p>
                      <p className="text-[11px] font-semibold">
                        {t(`q2.analytics.decisions.${d.key}`)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Q2Card>

            {/* Average per criterion, with the weight that criterion carries */}
            <Q2Card className="p-5">
              <h2 className="font-display text-base font-bold text-q2-ink dark:text-white">
                {t('q2.analytics.criteria.title')}
              </h2>
              <p className="mt-0.5 text-xs text-q2-muted">
                {t('q2.analytics.criteria.help', { count: data.scoredApplications })}
              </p>
              <ul className="mt-4 space-y-3">
                {data.criteria.map((c) => (
                  <li key={c.key} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-[13px] font-medium text-q2-ink-soft sm:w-36 dark:text-gray-300">
                      {c.label}
                    </span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-q2-chip dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-q2-emerald"
                        style={{ width: `${Math.max(0, Math.min(100, c.average))}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-[11px] font-medium text-q2-muted tabular-nums">
                      {weightLabel(c.weight)}
                    </span>
                    <span className="w-8 shrink-0 text-right text-[13px] font-bold text-q2-ink tabular-nums dark:text-gray-100">
                      {c.average}
                    </span>
                  </li>
                ))}
              </ul>
            </Q2Card>
          </div>
        </div>
      )}
    </Q2Shell>
  );
}
