import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import EmptyState from '@/components/EmptyState';
import { Pagination } from '@/components/ui';
import { useQ1Queue } from '../q1.api';
import { DEFAULT_FILTERS, QUEUE_TABS, type QueueFilters, type QueueTab } from '../q1.types';
import { FiltersPopover } from './FiltersPopover';
import { experienceLabel, receivedLabel } from '../q1.format';
import { Avatar, CvBadge, PriorityDot, ProfileMeter, Q1Card, StatusPill } from './primitives';

const PAGE_SIZE = 20;

const TAB_LABEL: Record<QueueTab, string> = {
  all: 'All',
  new: 'New',
  screening: 'Screening',
  incomplete: 'Incomplete',
  'follow-up': 'Follow-up',
  'no-response': 'No Response',
  verified: 'Verified',
  'not-interested': 'Not Interested',
};

/**
 * The Candidate Queue panel.
 *
 * One component for all six list screens in the Q1 designs: Dashboard and Candidates show the
 * tab strip, while Follow-ups, No Response, Verified and Not Interested are the same panel
 * pinned to one tab — which is exactly how the Figma frames differ from each other.
 */
export function CandidateQueue({
  tab,
  onTabChange,
  showTabs = false,
  initialSearch = '',
}: {
  tab: QueueTab;
  onTabChange?: (tab: QueueTab) => void;
  showTabs?: boolean;
  initialSearch?: string;
}) {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<QueueFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useQ1Queue({
    tab,
    search: search.trim() || undefined,
    priority: filters.priority,
    experience: filters.experience,
    cvOnly: filters.cvOnly || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const reset = () => setPage(1);

  return (
    <Q1Card className="overflow-hidden">
      {/* Panel header */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-q1-ink dark:text-white">
            {t('q1.queue.title')}
          </h2>
          <p className="mt-1 text-xs text-q1-muted">
            {t('q1.queue.count', { count: total })}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1 sm:w-72">
            <span className="sr-only">{t('q1.queue.searchLabel')}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-q1-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                reset();
              }}
              placeholder={t('q1.queue.searchPlaceholder')}
              className="h-10 w-full rounded-full border border-q1-line bg-q1-canvas pl-10 pr-4 text-sm text-q1-ink outline-none transition focus:border-q1-blue focus:ring-2 focus:ring-q1-blue/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </label>
          <FiltersPopover
            value={filters}
            onChange={(next) => {
              setFilters(next);
              reset();
            }}
          />
        </div>
      </div>

      {/* Tab strip */}
      {showTabs && onTabChange && (
        <div
          role="tablist"
          aria-label={t('q1.queue.title')}
          className="flex gap-2 overflow-x-auto border-t border-q1-line px-4 py-3 sm:px-5 dark:border-gray-700"
        >
          {QUEUE_TABS.map((tb) => (
            <button
              key={tb}
              role="tab"
              type="button"
              aria-selected={tab === tb}
              onClick={() => {
                onTabChange(tb);
                reset();
              }}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40',
                tab === tb
                  ? 'bg-q1-blue text-white'
                  : 'bg-q1-chip text-q1-ink-soft hover:bg-q1-blue-soft hover:text-q1-blue dark:bg-gray-700 dark:text-gray-200',
              )}
            >
              {t(`q1.tabs.${tb}`, TAB_LABEL[tb])}
            </button>
          ))}
        </div>
      )}

      {isError ? (
        <div className="p-6">
          <EmptyState
            variant="error"
            title={t('errors.couldNotLoad')}
            description={t('errors.tryAgain')}
            action={{ label: t('actions.retry'), onClick: () => void refetch() }}
          />
        </div>
      ) : (
        <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-y border-q1-line dark:border-gray-700">
                  {['candidate', 'experience', 'profile', 'cv', 'received', 'priority', 'status'].map(
                    (k) => (
                      <th
                        key={k}
                        scope="col"
                        className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-q1-muted"
                      >
                        {t(`q1.columns.${k}`)}
                      </th>
                    ),
                  )}
                  <th scope="col" className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : rows.map((r) => (
                      <tr
                        key={r.subscriberId}
                        className="border-b border-q1-line transition hover:bg-q1-canvas dark:border-gray-700 dark:hover:bg-gray-700/40"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={r.fullName} id={r.subscriberId} />
                            <div className="min-w-0">
                              {/* A real link, not a row handler: a screener opens several
                                  candidates in tabs, so ctrl/middle-click has to work. */}
                              <Link
                                to={`/q1/candidates/${r.subscriberId}`}
                                className="block truncate text-sm font-semibold text-q1-ink hover:text-q1-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40 dark:text-gray-100"
                              >
                                {r.fullName}
                              </Link>
                              <p className="truncate text-xs text-q1-ink-soft">{r.designation || '—'}</p>
                              <p className="truncate text-[11px] text-q1-muted">{r.city || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm font-medium text-q1-ink dark:text-gray-100">
                            {experienceLabel(r.totalExperience)}
                          </p>
                          <p className="text-xs text-q1-ink-soft">
                            {r.currentCompany || t('q1.queue.noCompany')}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <ProfileMeter value={r.profileCompleteness} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <CvBadge available={r.cvAvailable} />
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-q1-ink-soft">
                          {receivedLabel(r.receivedAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <PriorityDot priority={r.priority} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          {/* The same destination as the name link, so it is hidden from
                              assistive tech and skipped by Tab: a screen reader would
                              otherwise announce every candidate twice, and keyboard users
                              would tab through two links per row to reach the next one. */}
                          <Link
                            to={`/q1/candidates/${r.subscriberId}`}
                            className="inline-flex rounded-lg p-1 text-q1-muted transition hover:bg-q1-chip hover:text-q1-blue"
                            aria-hidden
                            tabIndex={-1}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — the seven columns do not shrink into a phone, so each row
              becomes a card with the same facts in reading order. */}
          <div className="divide-y divide-q1-line border-t border-q1-line md:hidden dark:divide-gray-700 dark:border-gray-700">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse p-4">
                    <div className="h-4 w-1/2 rounded bg-q1-chip" />
                    <div className="mt-2 h-3 w-1/3 rounded bg-q1-chip" />
                  </div>
                ))
              : rows.map((r) => (
                  <Link
                    key={r.subscriberId}
                    to={`/q1/candidates/${r.subscriberId}`}
                    className="block p-4 transition active:bg-q1-canvas"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={r.fullName} id={r.subscriberId} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-q1-ink dark:text-gray-100">
                            {r.fullName}
                          </p>
                          <StatusPill status={r.status} />
                        </div>
                        <p className="truncate text-xs text-q1-ink-soft">{r.designation || '—'}</p>
                        <p className="truncate text-[11px] text-q1-muted">{r.city || '—'}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span className="text-xs font-medium text-q1-ink dark:text-gray-100">
                            {experienceLabel(r.totalExperience)}
                          </span>
                          <CvBadge available={r.cvAvailable} />
                          <PriorityDot priority={r.priority} />
                        </div>
                        <ProfileMeter value={r.profileCompleteness} className="mt-2" />
                        <p className="mt-2 text-[11px] text-q1-muted">
                          {receivedLabel(r.receivedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>

          {!isLoading && rows.length === 0 && (
            <div className="p-6">
              <EmptyState
                variant={search.trim() || filters.priority !== 'all' || filters.experience !== 'all' || filters.cvOnly ? 'no-results' : 'no-data'}
                title={t('q1.queue.emptyTitle')}
                description={
                  search.trim() || filters.priority !== 'all' || filters.experience !== 'all' || filters.cvOnly
                    ? t('q1.queue.emptyFiltered')
                    : t('q1.queue.emptyClear')
                }
              />
            </div>
          )}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-q1-line px-4 py-3 sm:px-5 dark:border-gray-700">
          <p className="text-xs text-q1-muted">{t('q1.queue.count', { count: total })}</p>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </div>
      )}
    </Q1Card>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-q1-line dark:border-gray-700">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 animate-pulse rounded bg-q1-chip dark:bg-gray-700" style={{ width: `${40 + ((i * 13) % 45)}%` }} />
        </td>
      ))}
    </tr>
  );
}
