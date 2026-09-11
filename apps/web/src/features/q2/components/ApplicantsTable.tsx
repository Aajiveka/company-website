import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/hooks/useDebounce';
import { useQ2Applicants } from '../q2.api';
import { profileTone } from '../q2.format';
import type { ApplicantBucket, ApplicantTab } from '../q2.types';
import { Avatar, CompanyLine, MatchRing, Q2Card, StatusPill } from './primitives';

const TABS: ApplicantTab[] = ['all', 'relevant', 'notRelevant'];

/**
 * The All Applicants table, and the two decision buckets that reuse it.
 *
 * `bucket` picks which sidebar screen this is; only "queue" (All Applicants) shows the
 * All / Relevant / Not Relevant segmented control, because the Figma draws that control on
 * All Applicants alone.
 */
export function ApplicantsTable({
  bucket = 'queue',
  title,
  subtitleKey,
  showTabs = true,
}: {
  bucket?: ApplicantBucket;
  title: string;
  subtitleKey: string;
  showTabs?: boolean;
}) {
  const { t } = useTranslation('common');
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<ApplicantTab>('all');
  // The topbar's quick search navigates here with ?search=, so the field is seeded from the
  // URL — otherwise the results would be filtered but the box would look empty.
  const [search, setSearch] = useState(() => params.get('search') ?? '');
  const debounced = useDebounce(search, 300);

  useEffect(() => {
    const fromUrl = params.get('search') ?? '';
    if (fromUrl !== search) setSearch(fromUrl);
    // Only when the URL itself changes — re-running on every keystroke would fight the field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('search')]);

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const { data, isLoading, isError, refetch, isPlaceholderData } = useQ2Applicants({
    tab,
    bucket,
    search: debounced || undefined,
    page,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const setPage = (next: number) => {
    const p = new URLSearchParams(params);
    if (next <= 1) p.delete('page');
    else p.set('page', String(next));
    setParams(p, { replace: true });
  };

  // A tab or search change must reset to page 1, or a page-3 filter can land on no rows.
  const changeTab = (next: ApplicantTab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <Q2Card>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-q2-ink dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-q2-muted">{t(subtitleKey, { count: total })}</p>
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">{t('q2.applicants.searchLabel')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q2-muted" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('q2.applicants.searchPlaceholder')}
            className="h-10 w-full rounded-full border border-q2-line bg-q2-canvas pl-9 pr-4 text-sm text-q2-ink outline-none transition focus:border-q2-blue focus:ring-2 focus:ring-q2-blue/20 sm:w-64 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </label>
      </div>

      {showTabs && (
        <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5" role="tablist">
          {TABS.map((key) => {
            const active = tab === key;
            const count = data?.counts?.[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => changeTab(key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q2-blue/40',
                  active
                    ? 'bg-q2-blue text-white'
                    : 'bg-q2-chip text-q2-ink-soft hover:bg-q2-blue-soft hover:text-q2-blue dark:bg-gray-700 dark:text-gray-300',
                )}
              >
                {t(`q2.applicants.tabs.${key}`)}
                {count != null && active && <span className="ml-1.5 tabular-nums">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-q2-chip dark:bg-gray-700" />
          ))}
        </div>
      ) : !rows.length ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            variant={debounced || tab !== 'all' ? 'no-results' : 'no-data'}
            title={
              debounced || tab !== 'all'
                ? t('q2.applicants.emptyFiltered.title')
                : t(`q2.applicants.empty.${bucket}.title`)
            }
            description={
              debounced || tab !== 'all'
                ? t('q2.applicants.emptyFiltered.body')
                : t(`q2.applicants.empty.${bucket}.body`)
            }
            {...(debounced || tab !== 'all'
              ? {
                  action: {
                    label: t('q2.applicants.clearFilters'),
                    onClick: () => {
                      setSearch('');
                      changeTab('all');
                    },
                  },
                }
              : {})}
          />
        </div>
      ) : (
        <>
          <div className={cn('overflow-x-auto', isPlaceholderData && 'opacity-60 transition-opacity')}>
            <table className="w-full min-w-[58rem] border-collapse text-left">
              <thead>
                <tr className="border-y border-q2-line dark:border-gray-700">
                  {(['candidate', 'appliedFor', 'match', 'profile', 'status'] as const).map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className={cn(
                        'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-q2-muted',
                        col === 'candidate' && 'pl-5',
                      )}
                    >
                      {t(`q2.applicants.cols.${col}`)}
                    </th>
                  ))}
                  <th scope="col" className="w-10 px-4 py-2.5">
                    <span className="sr-only">{t('actions.view')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.mapId}
                    className="border-b border-q2-line last:border-0 transition hover:bg-q2-blue-soft/40 dark:border-gray-700 dark:hover:bg-gray-700/40"
                  >
                    <td className="px-4 py-3 pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} id={r.subscriberId} />
                        <div className="min-w-0">
                          <Link
                            to={`/q2/applications/${r.mapId}`}
                            className="block truncate text-sm font-semibold text-q2-ink outline-none hover:text-q2-blue focus-visible:underline dark:text-gray-100"
                          >
                            {r.name || '—'}
                          </Link>
                          <span className="block truncate text-xs text-q2-muted">
                            {r.currentDesignation || '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block truncate text-sm font-medium text-q2-ink dark:text-gray-100">
                        {r.jobTitle || '—'}
                      </span>
                      <CompanyLine company={r.company} />
                    </td>
                    <td className="px-4 py-3">
                      <MatchRing score={r.totalScore} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          profileTone(r.profileCompleteness),
                        )}
                      >
                        {r.profileCompleteness}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/q2/applications/${r.mapId}`}
                        aria-label={t('q2.applicants.openApplicant', { name: r.name })}
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

          {pages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-q2-line px-4 py-3 sm:px-5 dark:border-gray-700">
              <p className="text-xs text-q2-muted">
                {t('q2.applicants.pageOf', { page, pages, total })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-q2-line px-3 py-1.5 text-xs font-semibold text-q2-ink-soft transition hover:bg-q2-chip disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                >
                  {t('actions.previous')}
                </button>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pages}
                  className="rounded-lg border border-q2-line px-3 py-1.5 text-xs font-semibold text-q2-ink-soft transition hover:bg-q2-chip disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                >
                  {t('actions.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Q2Card>
  );
}
