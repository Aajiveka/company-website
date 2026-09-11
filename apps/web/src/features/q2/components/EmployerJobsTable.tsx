import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ChevronRight, MapPin, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/hooks/useDebounce';
import { useQ2Jobs } from '../q2.api';
import { expRangeLabel, topMatchTone } from '../q2.format';
import { CompanyLine, JobChip, Q2Card } from './primitives';

/**
 * The "Employer Jobs — 4 jobs · applicants shown job-wise" table.
 *
 * One component, because the Figma renders the identical card on the Dashboard (below the
 * five KPI cards) and as the whole of the Employer Jobs screen. Duplicating it would be two
 * places for the column set to drift.
 */
export function EmployerJobsTable() {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useQ2Jobs(debounced || undefined);

  const rows = data?.rows ?? [];

  return (
    <Q2Card>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-q2-ink dark:text-white">
            {t('q2.jobs.title')}
          </h2>
          <p className="mt-0.5 text-xs text-q2-muted">
            {t('q2.jobs.subtitle', { count: data?.total ?? 0 })}
          </p>
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">{t('q2.jobs.searchLabel')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q2-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('q2.jobs.searchPlaceholder')}
            className="h-10 w-full rounded-full border border-q2-line bg-q2-canvas pl-9 pr-4 text-sm text-q2-ink outline-none transition focus:border-q2-blue focus:ring-2 focus:ring-q2-blue/20 sm:w-64 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </label>
      </div>

      {isError ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            variant="error"
            title={t('errors.couldNotLoad')}
            description={t('errors.tryAgain')}
            action={{ label: t('actions.retry'), onClick: () => void refetch() }}
          />
        </div>
      ) : isLoading ? (
        <div className="space-y-3 p-4 sm:p-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-q2-chip dark:bg-gray-700" />
          ))}
        </div>
      ) : !rows.length ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            variant={debounced ? 'no-results' : 'no-jobs'}
            title={debounced ? t('q2.jobs.emptySearch.title') : t('q2.jobs.empty.title')}
            description={
              debounced ? t('q2.jobs.emptySearch.body') : t('q2.jobs.empty.body')
            }
            {...(debounced
              ? { action: { label: t('q2.jobs.clearSearch'), onClick: () => setSearch('') } }
              : {})}
          />
        </div>
      ) : (
        <div className={cn('overflow-x-auto', isPlaceholderData && 'opacity-60 transition-opacity')}>
          <table className="w-full min-w-[54rem] border-collapse text-left">
            <thead>
              <tr className="border-y border-q2-line dark:border-gray-700">
                {(['job', 'experience', 'workMode', 'applicants', 'relevant', 'topMatch'] as const).map(
                  (col) => (
                    <th
                      key={col}
                      scope="col"
                      className={cn(
                        'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-q2-muted',
                        col === 'job' && 'pl-5',
                      )}
                    >
                      {t(`q2.jobs.cols.${col}`)}
                    </th>
                  ),
                )}
                <th scope="col" className="w-10 px-4 py-2.5">
                  <span className="sr-only">{t('actions.view')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((j) => (
                <tr
                  key={j.jobId}
                  className="group border-b border-q2-line last:border-0 transition hover:bg-q2-blue-soft/40 dark:border-gray-700 dark:hover:bg-gray-700/40"
                >
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-q2-blue-soft text-q2-blue dark:bg-q2-blue/20">
                        <Briefcase className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/q2/jobs/${j.jobId}`}
                          className="block truncate text-sm font-semibold text-q2-ink outline-none hover:text-q2-blue focus-visible:underline dark:text-gray-100"
                        >
                          {j.title}
                        </Link>
                        <CompanyLine company={j.company} />
                        {j.location && (
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-q2-muted">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{j.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-q2-ink-soft dark:text-gray-300">
                    {expRangeLabel(j.minExp, j.maxExp)}
                  </td>
                  <td className="px-4 py-3">{j.workMode ? <JobChip>{j.workMode}</JobChip> : '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-display text-base font-bold text-q2-ink dark:text-gray-100">
                      {j.applicants}
                    </span>{' '}
                    <span className="text-xs text-q2-muted">{t('q2.jobs.applied')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
                        j.relevant
                          ? 'bg-q2-emerald-soft text-q2-emerald-ink'
                          : 'bg-q2-chip text-q2-muted',
                      )}
                    >
                      {t('q2.jobs.relevantCount', { count: j.relevant })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'font-display text-base font-extrabold tabular-nums',
                        topMatchTone(j.topMatch),
                      )}
                    >
                      {j.topMatch}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/q2/jobs/${j.jobId}`}
                      aria-label={t('q2.jobs.openJob', { title: j.title })}
                      className="inline-flex rounded-lg p-1.5 text-q2-muted-light outline-none transition hover:bg-q2-chip hover:text-q2-blue focus-visible:ring-2 focus-visible:ring-q2-blue/40"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Q2Card>
  );
}
