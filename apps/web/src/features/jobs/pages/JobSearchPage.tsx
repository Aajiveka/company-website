import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';
import { useCvEditProfile, useSavedJobIds, useSaveJob, useUnsaveJob } from '@/features/candidates/candidate.api';
import { Card, EmptyState, ErrorState, SkeletonRows } from '@/features/candidates/portal/components/primitives';
import { JobResultCard } from '../components/JobResultCard';
import { matchScore } from '../jobMatch';
import { useInfinitePublicJobs } from '../jobs.api';
import type { JobsQuery } from '../jobs.types';

const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/* Filter vocabulary (Figma node 25:3635)                              */
/* ------------------------------------------------------------------ */

/** Experience bands, expressed as the min/max the API already filters on. */
const EXPERIENCE = [
  { key: 'fresher', label: 'Fresher', minExp: 0, maxExp: 0 },
  { key: '0-2', label: '0–2 yrs', minExp: 0, maxExp: 2 },
  { key: '2-5', label: '2–5 yrs', minExp: 2, maxExp: 5 },
  { key: '5-8', label: '5–8 yrs', minExp: 5, maxExp: 8 },
  { key: '8plus', label: '8+ yrs', minExp: 8, maxExp: undefined },
] as const;

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];
const WORK_MODES = ['In-office', 'Hybrid', 'Remote'];

const SORTS: { key: NonNullable<JobsQuery['sortBy']>; label: string }[] = [
  { key: 'relevance', label: 'Most relevant' },
  { key: 'newest', label: 'Newest' },
  { key: 'exp_low', label: 'Experience: Low to High' },
  { key: 'exp_high', label: 'Experience: High to Low' },
];

/**
 * Job search — Figma nodes 25:3635 (results) and 25:4143 (filtered).
 *
 * Every filter lives in the query string so a filtered list can be linked and survives a
 * reload, and so the browser Back button steps back through filter changes rather than
 * leaving the page.
 */
export default function JobSearchPage() {
  const { t } = useTranslation('jobs');
  const [params, setParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const isCandidate = isAuthenticated && user?.roleId === Role.Subscriber;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [term, setTerm] = useState(params.get('q') ?? '');
  const debouncedTerm = useDebounce(term, 350);

  const experience = params.getAll('exp');
  const jobTypes = params.getAll('type');
  const workModes = params.getAll('mode');
  const location = params.get('location') ?? '';
  const sortBy = (params.get('sort') as JobsQuery['sortBy']) ?? 'relevance';

  const patch = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, { replace: true });
  };

  const toggleMulti = (key: string, value: string) =>
    patch((next) => {
      const current = next.getAll(key);
      next.delete(key);
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      updated.forEach((v) => next.append(key, v));
    });

  const clearAll = () =>
    patch((next) => {
      ['exp', 'type', 'mode', 'location'].forEach((k) => next.delete(k));
    });

  // The API takes one min/max pair, so several selected bands collapse to their outer edges.
  const bands = EXPERIENCE.filter((b) => experience.includes(b.key));
  const minExp = bands.length ? Math.min(...bands.map((b) => b.minExp)) : undefined;
  const maxExp = bands.length && bands.every((b) => b.maxExp != null)
    ? Math.max(...bands.map((b) => b.maxExp as number))
    : undefined;

  // `getAll` returns a fresh array each render, so the query is keyed off the joined strings
  // rather than the arrays themselves — otherwise every render looks like a filter change.
  const jobTypesKey = jobTypes.join('|');
  const workModesKey = workModes.join('|');

  const query = useMemo(
    () => ({
      pageSize: PAGE_SIZE,
      designation: debouncedTerm || undefined,
      employmentTypes: jobTypesKey ? jobTypesKey.split('|') : undefined,
      workModes: workModesKey ? workModesKey.split('|') : undefined,
      locations: location ? [location] : undefined,
      minExp,
      maxExp,
      sortBy,
    }),
    [debouncedTerm, jobTypesKey, workModesKey, location, minExp, maxExp, sortBy],
  );

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfinitePublicJobs(query);

  const jobs = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  // Match % needs the candidate's own CV, so it is only fetched (and only shown) for them.
  const { data: cv } = useCvEditProfile({ enabled: isCandidate });
  const { data: savedIds } = useSavedJobIds(isCandidate);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  // Guarded: `new Set` throws on anything non-iterable, which would white-screen the whole
  // results page if this endpoint ever answered with something other than an id array.
  const saved = useMemo(() => new Set(Array.isArray(savedIds) ? savedIds : []), [savedIds]);

  const activeChips = [
    ...bands.map((b) => ({ key: 'exp', value: b.key, label: b.label })),
    ...jobTypes.map((v) => ({ key: 'type', value: v, label: v })),
    ...workModes.map((v) => ({ key: 'mode', value: v, label: v })),
    ...(location ? [{ key: 'location', value: location, label: location }] : []),
  ];

  return (
    <>
      <Seo title={t('search.metaTitle', 'Find your next role')} path="/jobs" />

      <header>
        <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-gray-100">Find your next role</h1>
        <p className="mt-1 text-sm text-slate-500">Search, filter and apply — all in one place</p>
      </header>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            patch((next) => (e.target.value ? next.set('q', e.target.value) : next.delete('q')));
          }}
          placeholder="Search by job title, designation, keyword or company"
          aria-label="Search jobs"
          className="w-full rounded-xl border border-aj-line bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-aj-card placeholder:text-slate-400 focus:border-aj-blue focus:outline-none focus:ring-2 focus:ring-aj-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* Filters */}
        <div className="lg:w-[310px] lg:shrink-0">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-aj-line bg-white py-2.5 text-sm font-semibold text-slate-600 lg:hidden dark:border-gray-700 dark:bg-gray-800"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters{activeChips.length ? ` (${activeChips.length})` : ''}
          </button>

          <div className={cn('lg:block', filtersOpen ? 'block' : 'hidden')}>
            <Card>
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="font-display text-base font-bold text-slate-800 dark:text-gray-100">Filters</h2>
                {activeChips.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-5 px-5 pb-5">
                <FilterGroup title="Experience">
                  {EXPERIENCE.map((b) => (
                    <CheckRow
                      key={b.key}
                      label={b.label}
                      checked={experience.includes(b.key)}
                      onChange={() => toggleMulti('exp', b.key)}
                    />
                  ))}
                </FilterGroup>

                <FilterGroup title="Job type">
                  {JOB_TYPES.map((v) => (
                    <CheckRow
                      key={v}
                      label={v}
                      checked={jobTypes.includes(v)}
                      onChange={() => toggleMulti('type', v)}
                    />
                  ))}
                </FilterGroup>

                <FilterGroup title="Work mode">
                  {WORK_MODES.map((v) => (
                    <CheckRow
                      key={v}
                      label={v}
                      checked={workModes.includes(v)}
                      onChange={() => toggleMulti('mode', v)}
                    />
                  ))}
                </FilterGroup>

                <FilterGroup title="Location">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) =>
                      patch((next) => (e.target.value ? next.set('location', e.target.value) : next.delete('location')))
                    }
                    placeholder="Any location"
                    aria-label="Location"
                    className="w-full rounded-lg border border-aj-line bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-aj-blue focus:outline-none focus:ring-2 focus:ring-aj-ring dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  />
                </FilterGroup>
              </div>
            </Card>
          </div>
        </div>

        {/* Results */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">
              {isLoading ? 'Searching…' : `${total} ${total === 1 ? 'job' : 'jobs'} found`}
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Sort
              <select
                value={sortBy}
                onChange={(e) => patch((next) => next.set('sort', e.target.value))}
                className="rounded-lg border border-aj-line bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-aj-blue focus:outline-none focus:ring-2 focus:ring-aj-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <span
                  key={`${chip.key}:${chip.value}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-aj-line bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-gray-700 dark:bg-gray-800"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={() =>
                      chip.key === 'location'
                        ? patch((next) => next.delete('location'))
                        : toggleMulti(chip.key, chip.value)
                    }
                    aria-label={`Remove ${chip.label} filter`}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {isError ? (
              <Card>
                <ErrorState message="We could not load jobs right now." onRetry={refetch} />
              </Card>
            ) : isLoading ? (
              <SkeletonRows rows={4} className="[&>div]:h-40" />
            ) : jobs.length ? (
              <>
                {jobs.map((job) => (
                  <JobResultCard
                    key={job.jobId}
                    job={job}
                    skills={(job as { skills?: string[] }).skills}
                    match={isCandidate ? matchScore(job, cv) : null}
                    isSaved={isCandidate ? saved.has(job.jobId) : undefined}
                    onToggleSave={
                      isCandidate
                        ? () => (saved.has(job.jobId) ? unsaveJob.mutate(job.jobId) : saveJob.mutate(job.jobId))
                        : undefined
                    }
                  />
                ))}
                {hasNextPage && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="rounded-lg border border-aj-line bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:border-aj-blue hover:text-aj-blue disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800"
                    >
                      {isFetchingNextPage ? 'Loading…' : 'Load more jobs'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <EmptyState
                  title="No jobs match those filters"
                  description="Try widening the experience band or clearing a filter."
                  action={
                    activeChips.length ? (
                      <button
                        type="button"
                        onClick={clearAll}
                        className="rounded-lg bg-aj-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-aj-blue-hover"
                      >
                        Clear all filters
                      </button>
                    ) : undefined
                  }
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 rounded border-aj-line text-aj-blue focus:ring-aj-ring"
      />
      {label}
    </label>
  );
}
