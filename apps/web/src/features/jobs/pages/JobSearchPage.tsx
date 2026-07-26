import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bookmark, Briefcase, Building2, IndianRupee, MapPin, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, JobCardSkeleton, Loader } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { useSavedJobIds, useSaveJob, useUnsaveJob } from '@/features/candidates/candidate.api';
import { PageBanner } from '@/features/public/components/PageBanner';
import { JobSearchBar } from '../components/JobSearchBar';
import { JobFiltersPanel, type FilterValues } from '../components/JobFilters';
import { useInfinitePublicJobs } from '../jobs.api';
import { useCompareStore } from '../compare.store';
import { CompareBar } from '../components/CompareDrawer';
import type { PublicJob } from '../jobs.types';

const PAGE_SIZE = 10;

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

const JobCard = memo(function JobCard({ job, isSaved, onToggleSave, isCompared, onToggleCompare }: {
  job: PublicJob; isSaved: boolean; onToggleSave: () => void;
  isCompared: boolean; onToggleCompare: () => void;
}) {
  const { t } = useTranslation('jobs');
  return (
    <Link to={`/jobs/${job.jobId}`} className="block">
      <Card className="transition hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold text-navy">{job.designation}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <Building2 className="h-4 w-4 text-primary" aria-hidden />
              {job.company}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {job.industry}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); onToggleCompare(); }}
              className={cn(
                'rounded-lg p-1.5 transition',
                isCompared ? 'text-primary' : 'text-gray-400 hover:text-primary',
              )}
              aria-label={isCompared ? t('compare.remove') : t('compare.add')}
              title={isCompared ? t('compare.remove') : t('compare.add')}
            >
              <Scale className={cn('h-4 w-4', isCompared && 'fill-current')} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onToggleSave(); }}
              className={cn(
                'rounded-lg p-1.5 transition',
                isSaved ? 'text-primary' : 'text-gray-400 hover:text-primary',
              )}
              aria-label={isSaved ? 'Unsave job' : 'Save job'}
            >
              <Bookmark className={cn('h-4 w-4', isSaved && 'fill-current')} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-gray-400" aria-hidden />
            {job.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-gray-400" aria-hidden />
            {job.minExp === 0 ? t('search.fresher') : `${job.minExp}+ ${t('search.yrs')}`} · {job.workMode} · {job.employmentType}
          </span>
          <span className="flex items-center gap-1.5">
            <IndianRupee className="h-4 w-4 text-gray-400" aria-hidden />
            {lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA
          </span>
        </div>
      </Card>
    </Link>
  );
});

/** Parse a search param as an integer, returning undefined if missing/invalid. */
const intParam = (params: URLSearchParams, key: string) => {
  const v = params.get(key);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Public job search results — infinite scroll, driven by query params. */
export default function JobSearchPage() {
  const { t } = useTranslation('jobs');
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { data: savedIds } = useSavedJobIds();
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  // Read all params from URL
  const designation = searchParams.get('designation') ?? '';
  const location = searchParams.get('location') ?? '';
  const workMode = searchParams.get('workMode') ?? '';
  const employmentType = searchParams.get('employmentType') ?? '';
  const industry = searchParams.get('industry') ?? '';
  const minExp = intParam(searchParams, 'minExp');
  const maxExp = intParam(searchParams, 'maxExp');
  const minCtc = intParam(searchParams, 'minCtc') ?? 0;
  const sortBy = (searchParams.get('sortBy') ?? 'newest') as FilterValues['sortBy'];

  const filterValues: FilterValues = { workMode, employmentType, industry, minExp, maxExp, minCtc, sortBy };

  const compareStore = useCompareStore();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePublicJobs({
    designation: designation || undefined,
    location: location || undefined,
    workMode: workMode || undefined,
    employmentType: employmentType || undefined,
    industry: industry || undefined,
    minExp,
    maxExp,
    minCtc: minCtc || undefined,
    sortBy: sortBy !== 'newest' ? sortBy : undefined,
    pageSize: PAGE_SIZE,
  });

  const allJobs = data?.pages.flatMap((p) => p.rows) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    // Remove page param — infinite scroll doesn't use it
    params.delete('page');
    setSearchParams(params);
  };

  const onFiltersChange = (next: FilterValues) => {
    updateParams({
      workMode: next.workMode || undefined,
      employmentType: next.employmentType || undefined,
      industry: next.industry || undefined,
      minExp: next.minExp != null ? String(next.minExp) : undefined,
      maxExp: next.maxExp != null ? String(next.maxExp) : undefined,
      minCtc: next.minCtc > 0 ? String(next.minCtc) : undefined,
      sortBy: next.sortBy !== 'newest' ? next.sortBy : undefined,
    });
  };

  return (
    <>
      <Seo
        title="Find Jobs"
        description="Browse thousands of job openings across India. Filter by location, industry, and experience to find your perfect role on Aajiveka."
        path="/jobs"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aajiveka.com/' },
            { '@type': 'ListItem', position: 2, name: 'Find Jobs', item: 'https://aajiveka.com/jobs' },
          ],
        }}
      />
      <PageBanner variant="jobs" title={t('search.heading')}>
        <div className="mx-auto mt-8 max-w-3xl">
          <JobSearchBar
            key={`${designation}|${location}`}
            initialDesignation={designation}
            initialLocation={location}
          />
        </div>
      </PageBanner>

      <section className="py-12 md:py-16">
        <div className="container">
          <JobFiltersPanel
            open={filtersOpen}
            onToggle={() => setFiltersOpen((o) => !o)}
            values={filterValues}
            onChange={onFiltersChange}
          />

          <p className="mb-6 mt-4 text-sm text-gray-500" aria-live="polite" aria-atomic="true">
            {isLoading ? t('search.searching') : t('search.jobsFound', { count: total })}
            {designation && ` ${t('search.forDesignation', { designation })}`}
            {location && ` · ${location}`}
          </p>

          {isLoading ? (
            <div className="space-y-4">
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
            </div>
          ) : allJobs.length > 0 ? (
            <>
              <div className="space-y-4">
                {allJobs.map((job) => (
                  <JobCard
                    key={job.jobId}
                    job={job}
                    isSaved={savedIds?.includes(job.jobId) ?? false}
                    onToggleSave={() => {
                      if (!isAuthenticated) { navigate('/login?next=/jobs'); return; }
                      if (savedIds?.includes(job.jobId)) unsaveJob.mutate(job.jobId);
                      else saveJob.mutate(job.jobId);
                    }}
                    isCompared={compareStore.has(job.jobId)}
                    onToggleCompare={() => {
                      if (compareStore.has(job.jobId)) compareStore.remove(job.jobId);
                      else compareStore.add(job);
                    }}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="mt-6 flex justify-center py-4">
                {isFetchingNextPage ? (
                  <Loader label={t('infinite.loading')} />
                ) : hasNextPage ? (
                  <button
                    onClick={() => fetchNextPage()}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t('infinite.loadMore')}
                  </button>
                ) : allJobs.length > PAGE_SIZE ? (
                  <p className="text-sm text-gray-400">{t('infinite.endOfResults')}</p>
                ) : null}
              </div>
            </>
          ) : (
            <Card className="text-center">
              <p className="text-navy">{t('search.noMatch')}</p>
              <p className="mt-1 text-sm text-gray-500">
                {t('search.tryDifferent')}
              </p>
            </Card>
          )}
        </div>
      </section>

      <CompareBar />
    </>
  );
}
